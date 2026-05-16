import { useCallback, useEffect, useMemo, useState } from "react";
import Editor from "@monaco-editor/react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Link } from "react-router-dom";
import { useDebouncedCallback } from "../hooks/useDebouncedCallback.js";
import { useSocket } from "../hooks/useSocket.js";
import { listCodingSubmissions, runCodingQuestion, runExamCodingQuestion, runPracticeCoding, submitCodingQuestion } from "../features/coding/codingApi.js";
import apiClient from "../services/apiClient.js";

export const CODING_LANGUAGES = [
  { id: 63, label: "JavaScript", defaultCode: "// your code\nconsole.log('hello');\n" },
  { id: 71, label: "Python", defaultCode: "print('hello')\n" },
  {
    id: 62,
    label: "Java",
    defaultCode:
      "public class Main {\n  public static void main(String[] args) {\n    System.out.println(\"hello\");\n  }\n}\n"
  },
  /** Judge0 CE: GCC 14 — supports modern C++ and typical competitive headers. */
  { id: 105, label: "C++", defaultCode: "#include <iostream>\nint main() {\n  std::cout << \"hello\";\n  return 0;\n}\n" }
];

const AUTOSAVE_JSON_VERSION = 1;
const PRACTICE_CASES_STORAGE_KEY = "coding_practice_cases_v1";

const readPracticeCasesFromStorage = () => {
  if (typeof window === "undefined") return [{ input: "", expectedOutput: "" }];
  try {
    const raw = localStorage.getItem(PRACTICE_CASES_STORAGE_KEY);
    if (!raw) return [{ input: "", expectedOutput: "" }];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) return [{ input: "", expectedOutput: "" }];
    return parsed.map((c) => ({
      input: String(c?.input ?? ""),
      expectedOutput: String(c?.expectedOutput ?? "")
    }));
  } catch {
    return [{ input: "", expectedOutput: "" }];
  }
};

const isValidJudgeLanguageId = (id) => CODING_LANGUAGES.some((l) => l.id === id);

const languageIdForLabel = (label) => {
  const t = String(label || "").trim().toLowerCase();
  if (["javascript", "js", "node", "nodejs"].includes(t)) return 63;
  if (["python", "py"].includes(t)) return 71;
  if (["java"].includes(t)) return 62;
  if (["cpp", "c++", "cplusplus", "g++"].includes(t)) return 105;
  return null;
};

/** Map question starterCode / supportedLanguages labels to Judge0 language ids (must match CODING_LANGUAGES). */
const inferLanguageIdFromQuestion = (q) => {
  if (!q || q.type !== "coding") return 63;
  const starter = q.starterCode && typeof q.starterCode === "object" && !Array.isArray(q.starterCode) ? q.starterCode : {};
  for (const key of Object.keys(starter)) {
    const id = languageIdForLabel(key);
    if (id != null) return id;
  }
  for (const s of q.supportedLanguages || []) {
    const id = languageIdForLabel(s);
    if (id != null) return id;
  }
  return 63;
};

const pickStarterCodeFromQuestion = (q, langId) => {
  if (!q?.starterCode || typeof q.starterCode !== "object" || Array.isArray(q.starterCode)) return null;
  for (const [key, val] of Object.entries(q.starterCode)) {
    if (languageIdForLabel(key) === langId) {
      const s = String(val ?? "");
      if (s.trim().length) return s;
    }
  }
  return null;
};

const questionSupportsCpp = (q) => {
  if (!q || q.type !== "coding") return true;
  const list = q.supportedLanguages;
  if (!Array.isArray(list) || list.length === 0) return true;
  const cppId = CODING_LANGUAGES.find((l) => l.label === "C++")?.id ?? 105;
  return list.some((s) => languageIdForLabel(String(s)) === cppId);
};

/** Human-readable run summary (no raw JSON). Per-case detail is only summarized for sample tests. */
const formatRunSummary = (result, { examId }) => {
  const results = result.results || [];
  const samples = results.filter((r) => !r.hidden);
  const samplePassed = samples.filter((r) => r.passed).length;
  const sampleTotal = samples.length;
  const passedAll = result.passedCount ?? results.filter((r) => r.passed).length;
  const totalAll = result.totalRun ?? results.length;
  const lines = [];
  if (sampleTotal > 0) {
    lines.push(`Sample tests: ${samplePassed} / ${sampleTotal} passed`);
  } else if (totalAll > 0) {
    lines.push(`Tests passed: ${passedAll} / ${totalAll}`);
  }
  const hasHiddenInRun = results.some((r) => r.hidden);
  if (examId && hasHiddenInRun && sampleTotal > 0 && sampleTotal < totalAll) {
    lines.push(`Including hidden: ${passedAll} / ${totalAll} passed overall`);
  }
  if (Number.isFinite(result.scorePercent)) lines.push(`Score: ${result.scorePercent}%`);
  return lines.join("\n");
};

/** Diagnostics only for failing sample (non-hidden) cases. Hidden failures: one generic line, no status/output. */
const formatRunErrorsOnly = (result) => {
  const results = result.results || [];
  const sampleFailures = results.filter((r) => !r.passed && !r.hidden);
  const hiddenFailed = results.some((r) => !r.passed && r.hidden);
  const blocks = [];
  for (const r of sampleFailures) {
    const label = `Sample test #${(r.testCaseIndex ?? 0) + 1}`;
    const head = `${label}: ${r.statusDescription || "Failed"}`;
    const chunks = [];
    const co = typeof r.compileOutput === "string" ? r.compileOutput.trim() : "";
    const se = typeof r.stderr === "string" ? r.stderr.trim() : "";
    if (co) chunks.push(co);
    if (se) chunks.push(se);
    const out = r.output;
    if (out != null && String(out).trim().length) chunks.push(`Program output:\n${out}`);
    blocks.push(chunks.length ? `${head}\n${chunks.join("\n\n")}` : head);
  }
  if (hiddenFailed) {
    blocks.push("One or more hidden tests did not pass (hidden cases are not shown here).");
  }
  return blocks.join("\n\n---\n\n");
};

const formatSubmitConsole = (res) => {
  const lines = [res.message || "Submission recorded"];
  if (res.score != null) lines.push(`Score: ${Number(res.score).toFixed(1)}%`);
  if (res.status) lines.push(`Status: ${res.status}`);
  if (res.plagiarismFlags?.length) lines.push("Note: similarity flag on this submission — see list below.");
  return lines.join("\n");
};

/** When no exam question object is available, infer Judge language from editor text (legacy autosave recovery). */
const inferLanguageIdFromSourceHeuristic = (src) => {
  const h = String(src || "").toLowerCase();
  if (h.includes("#include") && (h.includes("iostream") || h.includes("bits/stdc++.h") || h.includes("cstdio")))
    return 105;
  if (h.includes("public class") && h.includes("static void main")) return 62;
  if (h.includes("def ") || (h.includes("print(") && !h.includes("#include"))) return 71;
  return 63;
};

const readAutosavePayload = (questionId) => {
  const key = `coding_autosave_${questionId}`;
  const raw = localStorage.getItem(key);
  if (raw == null) return { code: null, languageId: null, legacyPlain: false };
  try {
    const o = JSON.parse(raw);
    if (o && typeof o === "object" && o.v === AUTOSAVE_JSON_VERSION && typeof o.code === "string") {
      const lidRaw = Number(o.languageId);
      const lid = lidRaw === 54 ? 105 : lidRaw;
      return {
        code: o.code,
        languageId: Number.isFinite(lid) && isValidJudgeLanguageId(lid) ? lid : null,
        legacyPlain: false
      };
    }
  } catch {
    /* legacy: whole blob is source */
  }
  return { code: raw, languageId: null, legacyPlain: true };
};

/**
 * @param {object} props
 * @param {string | null} [props.examId]
 * @param {string | null} props.questionId
 * @param {boolean} [props.embedded]
 * @param {boolean} [props.fillHeight] — parent supplies height (e.g. exam three-column layout)
 * @param {boolean} [props.practiceMode] — Coding Arena: no exam/question; custom cases + no submit
 * @param {string} [props.className]
 */
export function CodingWorkspaceInner({
  examId = null,
  questionId,
  embedded = false,
  fillHeight = false,
  practiceMode = false,
  className = ""
}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_access_token") : null;
  const { socket, SOCKET_EVENTS } = useSocket(token);

  const [languageId, setLanguageId] = useState(63);
  const [code, setCode] = useState(CODING_LANGUAGES[0].defaultCode);
  const [theme, setTheme] = useState("vs-dark");
  const [consoleText, setConsoleText] = useState("");
  const [runSummary, setRunSummary] = useState("");
  const [runErrors, setRunErrors] = useState("");
  const [submissions, setSubmissions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [lastFlags, setLastFlags] = useState(null);
  const [publicCases, setPublicCases] = useState([]);
  const [practiceCases, setPracticeCases] = useState(readPracticeCasesFromStorage);
  /** Avoid writing localStorage before exam/question hydrate runs (would lock wrong default language). */
  const [persistReady, setPersistReady] = useState(false);

  const roomId = useMemo(() => {
    if (!examId || !questionId) return null;
    return `${examId}:${questionId}`;
  }, [examId, questionId]);

  const monacoLanguage = useMemo(() => {
    if (languageId === 105 || languageId === 54) return "cpp";
    if (languageId === 71) return "python";
    if (languageId === 62) return "java";
    return "javascript";
  }, [languageId]);

  const hydrateFromStorageAndQuestion = useCallback(
    (q) => {
      const storageId = practiceMode ? "__practice__" : questionId;
      if (!storageId) return;
      const { code: savedCode, languageId: savedLang } = readAutosavePayload(storageId);
      const guessed =
        q && q.type === "coding"
          ? inferLanguageIdFromQuestion(q)
          : inferLanguageIdFromSourceHeuristic(savedCode != null ? String(savedCode) : "");
      const hasSaved = savedCode != null && String(savedCode).length > 0;
      const cppJudgeId = CODING_LANGUAGES.find((l) => l.label === "C++")?.id ?? 105;
      const h = hasSaved ? String(savedCode).toLowerCase() : "";
      const looksCpp =
        h.includes("#include") && (h.includes("iostream") || h.includes("bits/stdc++.h") || h.includes("cstdio"));
      let effectiveSavedLang = savedLang;
      if (hasSaved && looksCpp && savedLang != null && savedLang !== cppJudgeId && (savedLang === 63 || savedLang === 62)) {
        effectiveSavedLang = null;
      }
      let nextLang = effectiveSavedLang != null ? effectiveSavedLang : guessed;
      const supportsCpp = practiceMode || questionSupportsCpp(q);
      if (
        hasSaved &&
        looksCpp &&
        supportsCpp &&
        inferLanguageIdFromSourceHeuristic(String(savedCode)) === cppJudgeId
      ) {
        nextLang = cppJudgeId;
      }
      setLanguageId(nextLang);
      if (hasSaved) {
        setCode(savedCode);
      } else {
        const starter = pickStarterCodeFromQuestion(q, nextLang);
        const fallback = CODING_LANGUAGES.find((l) => l.id === nextLang)?.defaultCode ?? CODING_LANGUAGES[0].defaultCode;
        setCode(starter && starter.trim().length ? starter : fallback);
      }
      setPersistReady(true);
    },
    [questionId, practiceMode]
  );

  useEffect(() => {
    setPersistReady(false);
    setRunSummary("");
    setRunErrors("");
    setConsoleText("");
  }, [questionId, examId, practiceMode]);

  useEffect(() => {
    if (practiceMode) {
      setPublicCases([]);
      hydrateFromStorageAndQuestion(null);
      return undefined;
    }
    if (!questionId) return undefined;
    if (!examId) {
      hydrateFromStorageAndQuestion(null);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await apiClient.get(`/candidate/exams/${examId}/session`);
        if (cancelled) return;
        const q = (data.questions || []).find((row) => String(row.id) === String(questionId));
        if (q?.publicTestCases) {
          setPublicCases(q.publicTestCases);
        } else {
          setPublicCases([]);
        }
        hydrateFromStorageAndQuestion(q || null);
      } catch {
        if (!cancelled) {
          setPublicCases([]);
          hydrateFromStorageAndQuestion(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [examId, questionId, hydrateFromStorageAndQuestion, practiceMode]);

  useEffect(() => {
    if (!practiceMode) return;
    try {
      localStorage.setItem(PRACTICE_CASES_STORAGE_KEY, JSON.stringify(practiceCases));
    } catch {
      /* quota */
    }
  }, [practiceCases, practiceMode]);

  useEffect(() => {
    if (!socket || !roomId || !token) return undefined;
    socket.emit(SOCKET_EVENTS.CODING_JOIN, { roomId });
    return undefined;
  }, [socket, roomId, token, SOCKET_EVENTS]);

  const debouncedSync = useDebouncedCallback((value) => {
    if (!socket || !roomId) return;
    socket.emit(SOCKET_EVENTS.CODING_SYNC, {
      roomId,
      payload: { code: value, languageId }
    });
  }, 600);

  useEffect(() => {
    if (!socket) return undefined;
    const handler = (payload) => {
      if (payload?.code && payload.fromUserId) {
        setConsoleText((prev) => `${prev}\n[remote] peer updated code snapshot`.trim());
      }
    };
    socket.on(SOCKET_EVENTS.CODING_UPDATE, handler);
    return () => socket.off(SOCKET_EVENTS.CODING_UPDATE, handler);
  }, [socket, SOCKET_EVENTS]);

  useEffect(() => {
    const storageId = practiceMode ? "__practice__" : questionId;
    if (!storageId || !persistReady) return;
    try {
      localStorage.setItem(
        `coding_autosave_${storageId}`,
        JSON.stringify({ v: AUTOSAVE_JSON_VERSION, code, languageId })
      );
    } catch {
      /* quota */
    }
  }, [code, languageId, questionId, persistReady, practiceMode]);

  const loadSubmissions = useCallback(async () => {
    if (!questionId) return;
    const data = await listCodingSubmissions({ questionId, limit: 10 });
    setSubmissions(data.items || []);
  }, [questionId]);

  useEffect(() => {
    loadSubmissions().catch(() => {});
  }, [loadSubmissions]);

  const handleRun = async () => {
    setBusy(true);
    setConsoleText("");
    if (practiceMode) {
      setRunSummary("");
      setRunErrors("");
      try {
        const cases = practiceCases
          .map((c) => ({
            input: String(c.input ?? ""),
            expectedOutput: String(c.expectedOutput ?? "")
          }))
          .filter((c) => c.input.trim().length > 0 && c.expectedOutput.trim().length > 0);
        if (!cases.length) {
          setRunErrors("Add at least one testcase with non-empty input and expected output.");
          setBusy(false);
          return;
        }
        const result = await runPracticeCoding({
          sourceCode: code,
          languageId,
          cases
        });
        setRunSummary(formatRunSummary(result, { examId: null }));
        setRunErrors(formatRunErrorsOnly(result));
      } catch (err) {
        setRunSummary("");
        const msg =
          err.response?.data?.message ||
          (err.response?.status
            ? `Server returned ${err.response.status}${err.response.statusText ? ` (${err.response.statusText})` : ""}.`
            : "") ||
          err.message ||
          "Run failed";
        setRunErrors(msg);
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!questionId) {
      setRunSummary("");
      setRunErrors("");
      setConsoleText("Add ?questionId=...&examId=... to the URL.");
      setBusy(false);
      return;
    }
    try {
      const lang = CODING_LANGUAGES.find((l) => l.id === languageId);
      const result = examId
        ? await runExamCodingQuestion({
            examId,
            questionId,
            sourceCode: code,
            languageId,
            language: lang?.label
          })
        : await runCodingQuestion({
            questionId,
            sourceCode: code,
            languageId
          });
      setRunSummary(formatRunSummary(result, { examId }));
      setRunErrors(formatRunErrorsOnly(result));
    } catch (err) {
      setRunSummary("");
      const msg =
        err.response?.data?.message ||
        (err.response?.status
          ? `Server returned ${err.response.status}${err.response.statusText ? ` (${err.response.statusText})` : ""}.`
          : "") ||
        err.message ||
        "Run failed";
      setRunErrors(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async () => {
    if (practiceMode) return;
    if (!questionId || !examId) {
      setRunSummary("");
      setRunErrors("");
      setConsoleText("questionId and examId are required for submit.");
      return;
    }
    setBusy(true);
    setRunSummary("");
    setRunErrors("");
    try {
      const lang = CODING_LANGUAGES.find((l) => l.id === languageId);
      const res = await submitCodingQuestion({
        questionId,
        examId,
        sourceCode: code,
        language: lang?.label || "custom",
        languageId
      });
      setLastFlags(res.plagiarismFlags || []);
      setConsoleText(formatSubmitConsole(res));
      await loadSubmissions();
    } catch (err) {
      setConsoleText(err.response?.data?.message || "Submit failed");
    } finally {
      setBusy(false);
    }
  };

  const panelShell = fillHeight
    ? "flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-950"
    : `rounded-xl border ${embedded ? "min-h-[calc(100vh-88px)]" : "min-h-[520px]"}`;

  return (
    <section
      className={`${embedded ? "space-y-2" : "space-y-3"} ${fillHeight ? "flex h-full min-h-0 min-w-0 flex-1 flex-col" : ""} ${className}`.trim()}
    >
      {examId && !embedded ? (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm">
          <span className="text-cyan-100">Exam mode — stay in this window until you are done.</span>
          <Link className="font-medium text-cyan-200 underline hover:text-white" to={`/candidate/exams/${examId}`}>
            Back to exam
          </Link>
        </div>
      ) : null}
      <div className={`flex shrink-0 flex-wrap items-center justify-between gap-2 ${fillHeight ? "" : ""}`}>
        <div>
          {embedded || fillHeight ? (
            <h1 className="text-sm font-semibold text-slate-200">Code workspace</h1>
          ) : (
            <>
              <h1 className="text-2xl font-semibold">Coding Workspace</h1>
              <p className="text-sm text-slate-500">
                {practiceMode
                  ? "Monaco + Judge0 — add stdin / expected output pairs below, then run (practice only; nothing is graded)."
                  : "Monaco + Judge0 + autosave + collaborative sync hooks"}
              </p>
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="rounded border bg-white px-2 py-1 text-sm dark:bg-slate-900"
            value={languageId}
            onChange={(e) => {
              const next = Number(e.target.value);
              setLanguageId(next);
              const lang = CODING_LANGUAGES.find((l) => l.id === next);
              if (lang) setCode(lang.defaultCode);
            }}
          >
            {CODING_LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="rounded border px-3 py-1 text-sm"
            onClick={() => setTheme((t) => (t === "vs-dark" ? "light" : "vs-dark"))}
          >
            Toggle theme
          </button>
          <button
            type="button"
            disabled={busy}
            className="rounded bg-slate-800 px-3 py-1 text-sm text-white disabled:opacity-50"
            onClick={handleRun}
          >
            {practiceMode ? "Run custom tests" : examId ? "Run all tests (hidden outputs masked)" : "Run (public tests)"}
          </button>
          {!practiceMode && examId && questionId ? (
            <button
              type="button"
              disabled={busy}
              className="rounded bg-brand-600 px-3 py-1 text-sm text-white disabled:opacity-50"
              onClick={handleSubmit}
            >
              Submit (all tests)
            </button>
          ) : null}
        </div>
      </div>

      {lastFlags?.length ? (
        <p className="shrink-0 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Plagiarism hook flagged similar submissions — review integrity pipeline.
        </p>
      ) : null}

      <PanelGroup
        direction="horizontal"
        className={`${panelShell} ${fillHeight ? "min-h-0 flex-1" : ""}`.trim()}
        {...(!fillHeight && (questionId || practiceMode)
          ? { autoSaveId: `coding-${examId || "na"}-${questionId || "practice"}` }
          : {})}
      >
        <Panel defaultSize={fillHeight ? 58 : 65} minSize={fillHeight ? 32 : 40}>
          <div className="h-full min-h-0 w-full min-w-0 overflow-hidden">
            <Editor
              height="100%"
              language={monacoLanguage}
              theme={theme}
              value={code}
              onChange={(value) => {
                const next = value ?? "";
                setCode(next);
                debouncedSync(next);
              }}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                automaticLayout: true
              }}
            />
          </div>
        </Panel>
        <PanelResizeHandle className="w-1.5 shrink-0 cursor-col-resize bg-slate-600 transition-colors hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500" />
        <Panel defaultSize={fillHeight ? 42 : 35} minSize={fillHeight ? 22 : 25}>
          <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden p-3">
            {practiceMode ? (
              <div className="min-h-0 shrink-0 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs uppercase text-slate-500">Your test cases</p>
                  <button
                    type="button"
                    className="rounded border border-slate-600 px-2 py-0.5 text-xs text-slate-200 hover:bg-slate-800"
                    onClick={() => setPracticeCases((rows) => [...rows, { input: "", expectedOutput: "" }])}
                  >
                    Add case
                  </button>
                </div>
                <ul className="max-h-44 space-y-2 overflow-auto text-xs">
                  {practiceCases.map((tc, i) => (
                    <li key={i} className="rounded border border-slate-600 p-2">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="font-semibold text-slate-200">Case {i + 1}</span>
                        {practiceCases.length > 1 ? (
                          <button
                            type="button"
                            className="text-rose-400 hover:underline"
                            onClick={() => setPracticeCases((rows) => rows.filter((_, j) => j !== i))}
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                      <p className="text-slate-500">Stdin</p>
                      <textarea
                        className="mt-0.5 w-full rounded border border-slate-700 bg-slate-900 p-1.5 font-mono text-slate-200"
                        rows={2}
                        value={tc.input}
                        onChange={(e) =>
                          setPracticeCases((rows) => {
                            const next = [...rows];
                            next[i] = { ...next[i], input: e.target.value };
                            return next;
                          })
                        }
                      />
                      <p className="mt-1 text-slate-500">Expected output</p>
                      <textarea
                        className="mt-0.5 w-full rounded border border-slate-700 bg-slate-900 p-1.5 font-mono text-slate-200"
                        rows={2}
                        value={tc.expectedOutput}
                        onChange={(e) =>
                          setPracticeCases((rows) => {
                            const next = [...rows];
                            next[i] = { ...next[i], expectedOutput: e.target.value };
                            return next;
                          })
                        }
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ) : publicCases.length ? (
              <div className="min-h-0 shrink-0">
                <p className="text-xs uppercase text-slate-500">Sample test cases</p>
                <ul className="mt-2 max-h-36 space-y-2 overflow-auto text-xs">
                  {publicCases.map((tc, i) => (
                    <li key={i} className="rounded border border-slate-600 p-2">
                      <p className="font-semibold text-slate-200">Input</p>
                      <pre className="whitespace-pre-wrap text-slate-300">{tc.input}</pre>
                      <p className="mt-1 font-semibold text-slate-200">Expected output</p>
                      <pre className="whitespace-pre-wrap text-slate-300">{tc.expectedOutput}</pre>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="min-h-0 shrink-0">
              <p className="text-xs uppercase text-slate-500">Console</p>
              {runSummary ? (
                <pre className="mt-1 whitespace-pre-wrap rounded border border-slate-600 bg-slate-900/90 p-2 text-xs text-slate-100">
                  {runSummary}
                </pre>
              ) : null}
              {runErrors ? (
                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded border border-red-900/50 bg-slate-950 p-2 text-xs text-red-200">
                  {runErrors}
                </pre>
              ) : null}
              {consoleText ? (
                <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded border border-slate-600 bg-slate-950 p-2 text-xs text-slate-200">
                  {consoleText}
                </pre>
              ) : null}
              {!runSummary && !runErrors && !consoleText ? (
                <p className="mt-1 text-xs text-slate-500">
                  {practiceMode
                    ? "Run to see how many custom cases pass; only errors appear in red."
                    : "Run tests for pass count; errors show below when something fails."}
                </p>
              ) : null}
            </div>
            {!practiceMode ? (
              <div className="min-h-0 flex-1 overflow-auto">
                <p className="text-xs uppercase text-slate-500">Recent submissions</p>
                <ul className="mt-2 space-y-2 text-sm">
                  {submissions.map((s) => (
                    <li key={s._id} className="rounded border p-2">
                      <div className="flex justify-between">
                        <span>{s.language}</span>
                        <span className="font-medium">{Number(s.score || 0).toFixed(1)}%</span>
                      </div>
                      <p className="text-xs text-slate-500">{new Date(s.createdAt).toLocaleString()}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </Panel>
      </PanelGroup>
    </section>
  );
}
