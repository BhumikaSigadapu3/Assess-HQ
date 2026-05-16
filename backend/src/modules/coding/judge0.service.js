import { Buffer } from "node:buffer";
import axios from "axios";
import { AppError } from "../../utils/appError.js";

const ACCEPTED_STATUS_ID = 3;

/** Judge0 rejects plain JSON when bytes are not valid UTF-8; base64 avoids HTTP 400 on CE. */
const submissionUrl = (baseUrl) =>
  `${String(baseUrl).replace(/\/$/, "")}/submissions?base64_encoded=true&wait=true`;

const utf8ToBase64 = (value) => Buffer.from(String(value ?? ""), "utf8").toString("base64");

const base64ToUtf8 = (value) => {
  if (value == null) return value;
  if (typeof value !== "string") return value;
  try {
    return Buffer.from(value, "base64").toString("utf8");
  } catch {
    return value;
  }
};

const decodeJudge0WaitPayload = (data) => {
  if (!data || typeof data !== "object") return data;
  return {
    ...data,
    stdout: base64ToUtf8(data.stdout),
    stderr: data.stderr == null ? data.stderr : base64ToUtf8(data.stderr),
    compile_output: data.compile_output == null ? data.compile_output : base64ToUtf8(data.compile_output),
    message: data.message == null ? data.message : base64ToUtf8(data.message)
  };
};

const coerceLanguageId = (languageId) => {
  const n = Number(languageId);
  if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) {
    throw new AppError("Invalid languageId for code runner", 400);
  }
  return n;
};

/** Judge0 CE C++ (GCC 14) — keep in sync with frontend C++ option. */
const JUDGE0_CPP_LANGUAGE_ID = 105;

const looksLikeCppSource = (src) => {
  const h = String(src ?? "").toLowerCase();
  return h.includes("#include") && (h.includes("iostream") || h.includes("bits/stdc++.h") || h.includes("cstdio"));
};

const looksLikeJavaSource = (src) => {
  const h = String(src ?? "").toLowerCase();
  return h.includes("public class") && h.includes("static void main");
};

/**
 * If the client sends JS/Java but the source is clearly C/C++, Judge0 would report a misleading
 * "Compilation Error" (e.g. javac on `#include`). Coerce to C++ when unambiguous.
 */
const resolveJudgeLanguageId = (sourceCode, languageId) => {
  const n = coerceLanguageId(languageId);
  if ((n === 62 || n === 63) && looksLikeCppSource(sourceCode) && !looksLikeJavaSource(sourceCode)) {
    return JUDGE0_CPP_LANGUAGE_ID;
  }
  return n;
};

const buildSubmissionJsonBody = (sourceCode, languageId, stdin) => ({
  source_code: utf8ToBase64(sourceCode),
  language_id: resolveJudgeLanguageId(sourceCode, languageId),
  stdin: utf8ToBase64(stdin ?? "")
});

export const normalizeProgramOutput = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\r\n/g, "\n");

/** Normalize line endings for stdin (no trim). */
const normalizeIoNewlines = (value) => String(value ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

/** RapidAPI requires X-RapidAPI-Key and X-RapidAPI-Host; public CE (e.g. ce.judge0.com) needs no auth headers. */
const buildHeaders = (baseUrl, apiKey) => {
  const headers = { "Content-Type": "application/json" };
  const key = String(apiKey || "").trim();
  if (!key) return headers;
  headers["X-RapidAPI-Key"] = key;
  try {
    const host = new URL(String(baseUrl).replace(/\/$/, "")).hostname;
    if (host && host.includes("rapidapi.com")) {
      headers["X-RapidAPI-Host"] = host;
    }
  } catch {
    /* ignore invalid baseUrl */
  }
  return headers;
};

const formatJudge0ErrorDetail = (data) => {
  if (data == null) return "";
  if (typeof data === "string") return data.slice(0, 2000);
  if (typeof data.error === "string") return data.error;
  if (typeof data.message === "string") return data.message;
  if (Array.isArray(data.errors)) {
    return data.errors
      .map((e) => (typeof e === "string" ? e : e?.msg || e?.message || JSON.stringify(e)))
      .join("; ");
  }
  if (typeof data === "object") {
    const parts = [];
    for (const [k, v] of Object.entries(data)) {
      if (k === "status" || k === "token") continue;
      if (Array.isArray(v)) parts.push(`${k}: ${v.join(", ")}`);
      else if (typeof v === "string" && v.length < 500) parts.push(`${k}: ${v}`);
    }
    if (parts.length) return parts.join("; ");
    try {
      return JSON.stringify(data).slice(0, 2000);
    } catch {
      return "";
    }
  }
  return "";
};

const toJudge0AppError = (err) => {
  const status = err.response?.status;
  const data = err.response?.data;
  const detail = formatJudge0ErrorDetail(data) || err.message || "Judge0 request failed";
  let hint = "";
  if (status === 401 || status === 403) {
    try {
      const host = new URL(String(err.config?.baseURL || err.config?.url || "").replace(/\/$/, "")).hostname;
      hint = host.includes("rapidapi.com")
        ? " Check JUDGE0_BASE_URL, JUDGE0_API_KEY, and RapidAPI subscription (Host header is sent automatically for *.rapidapi.com)."
        : " Check JUDGE0_BASE_URL; public CE is rate-limited and may return errors when overloaded.";
    } catch {
      hint = " Check JUDGE0_BASE_URL and auth (RapidAPI needs JUDGE0_API_KEY).";
    }
  } else if (status === 400 && typeof data?.error === "string" && data.error.includes("wait")) {
    hint = " This Judge0 host disallows wait=true; try another instance or use async submission + polling.";
  }
  return new AppError(`Code runner (Judge0) failed${status ? ` [HTTP ${status}]` : ""}: ${detail}.${hint}`, 502);
};

export const runCodeOnJudge0 = async ({
  sourceCode,
  languageId,
  stdin = "",
  baseUrl,
  apiKey
}) => {
  if (!String(baseUrl || "").trim()) {
    throw new AppError("Judge0 is not configured on the server (set JUDGE0_BASE_URL)", 503);
  }
  try {
    const { data } = await axios.post(
      submissionUrl(baseUrl),
      buildSubmissionJsonBody(sourceCode, languageId, stdin),
      { headers: buildHeaders(baseUrl, apiKey), timeout: 45000 }
    );
    return decodeJudge0WaitPayload(data);
  } catch (err) {
    if (axios.isAxiosError(err)) throw toJudge0AppError(err);
    throw err;
  }
};

export const runSingleTestCase = async ({
  sourceCode,
  languageId,
  stdin,
  expectedOutput,
  baseUrl,
  apiKey
}) => {
  let data;
  try {
    const res = await axios.post(
      submissionUrl(baseUrl),
      buildSubmissionJsonBody(sourceCode, languageId, stdin),
      { headers: buildHeaders(baseUrl, apiKey), timeout: 45000 }
    );
    data = decodeJudge0WaitPayload(res.data);
  } catch (err) {
    if (axios.isAxiosError(err)) throw toJudge0AppError(err);
    throw err;
  }

  const stdout = normalizeProgramOutput(data.stdout);
  const expected = normalizeProgramOutput(expectedOutput);
  const accepted = data.status?.id === ACCEPTED_STATUS_ID;
  const passed = accepted && stdout === expected;

  return {
    passed,
    stdout,
    stderr: data.stderr || "",
    compileOutput: data.compile_output || "",
    time: data.time,
    memory: data.memory,
    statusId: data.status?.id,
    statusDescription: data.status?.description
  };
};

export const runTestSuite = async ({
  sourceCode,
  languageId,
  testCases,
  visibility,
  baseUrl,
  apiKey
}) => {
  const resolvedLanguageId = resolveJudgeLanguageId(sourceCode, languageId);
  const all = testCases || [];
  const results = [];
  let weightedPassed = 0;
  let totalWeight = 0;

  for (let originalIndex = 0; originalIndex < all.length; originalIndex += 1) {
    const tc = all[originalIndex];
    if (visibility === "public" && tc.isHidden) continue;

    const weight = Number(tc.weight || 1);
    totalWeight += weight;
    const outcome = await runSingleTestCase({
      sourceCode,
      languageId: resolvedLanguageId,
      stdin: normalizeIoNewlines(tc.input ?? ""),
      expectedOutput: tc.expectedOutput,
      baseUrl,
      apiKey
    });
    const maskHiddenOutput = Boolean(tc.isHidden) && visibility === "all_masked";
    const compileSlice = (outcome.compileOutput || "").slice(0, 4000);
    results.push({
      testCaseIndex: originalIndex,
      hidden: Boolean(tc.isHidden),
      passed: outcome.passed,
      output: maskHiddenOutput ? null : outcome.stdout,
      stderr: maskHiddenOutput ? null : outcome.stderr,
      compileOutput: maskHiddenOutput ? null : compileSlice,
      statusId: outcome.statusId,
      statusDescription: outcome.statusDescription
    });
    if (outcome.passed) weightedPassed += weight;
  }

  const passedCount = results.filter((r) => r.passed).length;
  const totalRun = results.length;

  const scorePercent = totalWeight > 0 ? (weightedPassed / totalWeight) * 100 : 0;

  return {
    judge0LanguageId: resolvedLanguageId,
    results,
    passedCount,
    totalRun,
    scorePercent: Number(scorePercent.toFixed(2)),
    allPassed: results.length > 0 && results.every((r) => r.passed)
  };
};
