import { asyncHandler } from "../utils/asyncHandler.js";
import {
  getExamCandidateProfile,
  getExamLeaderboard,
  listRecruiterExamsWithStats,
  listRecruiterShortlist,
  postExamShortlist,
  updateRecruiterExam,
  getRecruiterExamDraftBundle,
  getRecruiterExamContentSnapshot
} from "../modules/recruiter/recruiterAssessment.service.js";
import { replaceRecruiterDraftExamQuestions } from "../modules/recruiter/teacherExamCompose.service.js";

export const getRecruiterExamsSummary = asyncHandler(async (req, res) => {
  const data = await listRecruiterExamsWithStats(req.user._id);
  res.json(data);
});

export const patchRecruiterExam = asyncHandler(async (req, res) => {
  const exam = await updateRecruiterExam({
    recruiterId: req.user._id,
    examId: req.params.examId,
    patch: req.body
  });
  res.json(exam);
});

export const getRecruiterExamDraftDetail = asyncHandler(async (req, res) => {
  const data = await getRecruiterExamDraftBundle({
    recruiterId: req.user._id,
    examId: req.params.examId
  });
  res.json(data);
});

/** Read-only question list for published assessments (recruiter owner). */
export const getRecruiterExamOverview = asyncHandler(async (req, res) => {
  const data = await getRecruiterExamContentSnapshot({
    recruiterId: req.user._id,
    examId: req.params.examId
  });
  res.json(data);
});

export const putRecruiterExamDraftQuestions = asyncHandler(async (req, res) => {
  const data = await replaceRecruiterDraftExamQuestions({
    recruiterId: req.user._id,
    examId: req.params.examId,
    payload: req.body
  });
  res.json(data);
});

export const getRecruiterExamLeaderboard = asyncHandler(async (req, res) => {
  const data = await getExamLeaderboard({
    recruiterId: req.user._id,
    examId: req.params.examId,
    sort: req.query.sort,
    order: req.query.order
  });
  res.json(data);
});

export const getRecruiterExamCandidateProfile = asyncHandler(async (req, res) => {
  const data = await getExamCandidateProfile({
    recruiterId: req.user._id,
    examId: req.params.examId,
    candidateId: req.params.candidateId
  });
  res.json(data);
});

export const postRecruiterExamShortlist = asyncHandler(async (req, res) => {
  const data = await postExamShortlist({
    recruiterId: req.user._id,
    examId: req.params.examId,
    candidateIds: req.body.candidateIds,
    recruiterName: req.user.name
  });
  res.status(201).json(data);
});

export const getRecruiterHiringShortlist = asyncHandler(async (req, res) => {
  const data = await listRecruiterShortlist(req.user._id);
  res.json(data);
});
