import { asyncHandler } from "../utils/asyncHandler.js";
import { env } from "../config/env.js";
import { executeCodingQuestionExamRun } from "../modules/coding/codingExecution.service.js";
import {
  buildExamSessionResponse,
  getExamResultForCandidate,
  startOrResumeExamSession,
  submitExamAttempt,
  upsertExamAnswer
} from "../modules/exam/examSession.service.js";
import { getCandidateExamLeaderboardView, registerCandidateForExam } from "../modules/exam/candidateExam.service.js";

export const postRegisterForExam = asyncHandler(async (req, res) => {
  const data = await registerCandidateForExam({
    examId: req.params.examId,
    candidateId: req.user._id
  });
  res.status(201).json(data);
});

export const getExamLeaderboardCandidate = asyncHandler(async (req, res) => {
  const data = await getCandidateExamLeaderboardView({
    examId: req.params.examId,
    viewerCandidateId: req.user._id
  });
  res.json(data);
});

export const getExamSession = asyncHandler(async (req, res) => {
  const data = await startOrResumeExamSession({
    examId: req.params.examId,
    candidateId: req.user._id
  });

  res.json(buildExamSessionResponse(data));
});

export const saveExamAnswer = asyncHandler(async (req, res) => {
  const attempt = await upsertExamAnswer({
    examId: req.params.examId,
    candidateId: req.user._id,
    payload: req.body
  });

  res.json({
    message: "Answer saved",
    analytics: attempt.analytics,
    currentSectionKey: attempt.currentSectionKey
  });
});

export const runExamCoding = asyncHandler(async (req, res) => {
  const { questionId, sourceCode, languageId, language } = req.body;
  const languageLabel =
    typeof language === "string" && language.trim() ? language.trim() : `languageId:${languageId}`;
  const result = await executeCodingQuestionExamRun({
    questionId,
    examId: req.params.examId,
    candidateId: req.user._id,
    sourceCode,
    languageId,
    languageLabel,
    baseUrl: env.judge0BaseUrl,
    apiKey: env.judge0ApiKey
  });
  res.json(result);
});

export const submitExam = asyncHandler(async (req, res) => {
  const attempt = await submitExamAttempt({
    examId: req.params.examId,
    candidateId: req.user._id
  });

  res.json({
    message: "Exam submitted successfully",
    status: attempt.status,
    submittedAt: attempt.submittedAt,
    analytics: attempt.analytics
  });
});

export const getExamResult = asyncHandler(async (req, res) => {
  const data = await getExamResultForCandidate({
    examId: req.params.examId,
    candidateId: req.user._id
  });
  res.json(data);
});
