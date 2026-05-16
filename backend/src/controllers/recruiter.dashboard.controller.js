import { asyncHandler } from "../utils/asyncHandler.js";
import {
  generateRecruiterReport,
  getRecruiterDashboardAnalytics,
  listRecruiterCandidates,
  listRecruiterInterviews,
  listRecruiterQuestions,
  listRecruiterReports,
  patchRecruiterInterview,
  scheduleRecruiterInterview
} from "../modules/recruiter/recruiterDashboard.service.js";

export const getRecruiterDashboard = asyncHandler(async (req, res) => {
  const data = await getRecruiterDashboardAnalytics({
    recruiterId: req.user._id,
    limit: req.query.limit
  });
  res.json(data);
});

export const getRecruiterCandidates = asyncHandler(async (req, res) => {
  const data = await listRecruiterCandidates({
    recruiterId: req.user._id,
    search: req.query.search,
    page: req.query.page,
    limit: req.query.limit
  });
  res.json(data);
});

export const getRecruiterQuestions = asyncHandler(async (req, res) => {
  const data = await listRecruiterQuestions({
    recruiterId: req.user._id,
    type: req.query.type,
    difficulty: req.query.difficulty,
    search: req.query.search,
    page: req.query.page,
    limit: req.query.limit
  });
  res.json(data);
});

export const getRecruiterReports = asyncHandler(async (req, res) => {
  const data = await listRecruiterReports({
    recruiterId: req.user._id,
    page: req.query.page,
    limit: req.query.limit
  });
  res.json(data);
});

export const getRecruiterInterviews = asyncHandler(async (req, res) => {
  const data = await listRecruiterInterviews({
    recruiterId: req.user._id,
    status: req.query.status,
    page: req.query.page,
    limit: req.query.limit
  });
  res.json(data);
});

export const postRecruiterInterview = asyncHandler(async (req, res) => {
  const interview = await scheduleRecruiterInterview({
    recruiterId: req.user._id,
    payload: req.body
  });
  res.status(201).json(interview);
});

export const patchRecruiterInterviewHandler = asyncHandler(async (req, res) => {
  const interview = await patchRecruiterInterview({
    recruiterId: req.user._id,
    interviewId: req.params.interviewId,
    patch: req.body
  });
  res.json(interview);
});

export const postGenerateRecruiterReport = asyncHandler(async (req, res) => {
  const report = await generateRecruiterReport({
    recruiterId: req.user._id,
    examId: req.body.examId,
    candidateId: req.body.candidateId
  });
  res.status(201).json(report);
});
