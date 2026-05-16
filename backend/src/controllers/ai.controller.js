import { asyncHandler } from "../utils/asyncHandler.js";
import { analyzeResumeAts } from "../modules/ai/resumeAts.service.js";
import {
  analyzeInterviewTranscript,
  predictCandidatePerformance
} from "../modules/ai/interviewInsights.service.js";
import { buildWeakTopicPlan } from "../modules/ai/weakTopics.service.js";

export const postResumeAts = asyncHandler(async (req, res) => {
  const { resumeText, jobDescription, targetRole } = req.body;
  const report = await analyzeResumeAts({ resumeText, jobDescription, targetRole });
  res.json(report);
});

export const postInterviewInsights = asyncHandler(async (req, res) => {
  const { transcript, durationSeconds } = req.body;
  const report = await analyzeInterviewTranscript({ transcript, durationSeconds });
  res.json(report);
});

export const postPerformancePrediction = asyncHandler(async (req, res) => {
  const { codingScore, mcqScore, suspiciousEvents } = req.body;
  const report = await predictCandidatePerformance({ codingScore, mcqScore, suspiciousEvents });
  res.json(report);
});

export const getWeakTopics = asyncHandler(async (req, res) => {
  const data = await buildWeakTopicPlan({
    examId: req.params.examId,
    candidateId: req.user._id
  });
  res.json(data);
});
