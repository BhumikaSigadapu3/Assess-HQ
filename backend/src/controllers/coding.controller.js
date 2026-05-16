import { asyncHandler } from "../utils/asyncHandler.js";
import { env } from "../config/env.js";
import {
  executeCodingQuestionExamRun,
  executeCodingQuestionPublic,
  listCodingSubmissions,
  submitCodingQuestion
} from "../modules/coding/codingExecution.service.js";
import { runCodeOnJudge0, runTestSuite } from "../modules/coding/judge0.service.js";
import { AppError } from "../utils/appError.js";

const judgeEnv = () => ({
  baseUrl: env.judge0BaseUrl,
  apiKey: env.judge0ApiKey
});

export const runCode = asyncHandler(async (req, res) => {
  const { sourceCode, languageId, stdin } = req.body;
  const { baseUrl, apiKey } = judgeEnv();
  const data = await runCodeOnJudge0({
    sourceCode,
    languageId,
    stdin,
    baseUrl,
    apiKey
  });
  res.json(data);
});

export const runCodingQuestion = asyncHandler(async (req, res) => {
  const { questionId, sourceCode, languageId, examId } = req.body;
  const judge = judgeEnv();
  const result = examId
    ? await executeCodingQuestionExamRun({
        questionId,
        examId,
        candidateId: req.user._id,
        sourceCode,
        languageId,
        languageLabel: typeof req.body.language === "string" && req.body.language.trim() ? req.body.language.trim() : undefined,
        ...judge
      })
    : await executeCodingQuestionPublic({
        questionId,
        sourceCode,
        languageId,
        ...judge
      });
  res.json(result);
});

/** Practice arena: run user-defined cases (no DB question). */
export const runPracticeCodingSuite = asyncHandler(async (req, res) => {
  const { sourceCode, languageId, cases } = req.body;
  const { baseUrl, apiKey } = judgeEnv();
  if (!String(baseUrl || "").trim()) {
    throw new AppError("Judge0 is not configured on the server (set JUDGE0_BASE_URL)", 503);
  }
  const raw = Array.isArray(cases) ? cases : [];
  const testCases = raw.slice(0, 12).map((c) => ({
    input: String(c?.input ?? ""),
    expectedOutput: String(c?.expectedOutput ?? ""),
    isHidden: false,
    weight: 1
  }));
  if (!testCases.length) {
    throw new AppError("Add at least one testcase with input and expected output", 400);
  }
  const suite = await runTestSuite({
    sourceCode,
    languageId,
    testCases,
    visibility: "public",
    baseUrl,
    apiKey
  });
  res.json(suite);
});

export const submitCodingQuestionHandler = asyncHandler(async (req, res) => {
  const { questionId, examId, sourceCode, language, languageId } = req.body;
  const submission = await submitCodingQuestion({
    questionId,
    examId,
    sourceCode,
    language,
    languageId,
    candidateId: req.user._id,
    ...judgeEnv()
  });
  res.status(201).json({
    message: "Submission recorded",
    submissionId: submission._id,
    score: submission.score,
    status: submission.status,
    plagiarismFlags: submission.plagiarismFlags
  });
});

export const listMyCodingSubmissions = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));
  const { questionId } = req.query;
  const data = await listCodingSubmissions({
    candidateId: req.user._id,
    questionId,
    page,
    limit
  });
  res.json(data);
});
