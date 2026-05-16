import mongoose from "mongoose";
import Exam from "../../models/Exam.js";
import ExamAttempt from "../../models/ExamAttempt.js";
import ExamRegistration from "../../models/ExamRegistration.js";
import Interview from "../../models/Interview.js";
import Question from "../../models/Question.js";
import Shortlist from "../../models/Shortlist.js";
import User from "../../models/User.js";
import { ROLES } from "../../constants/roles.js";
import { AppError } from "../../utils/appError.js";
import { cacheDel } from "../cache/cache.service.js";
import { assertRecruiterOwnsExam } from "./recruiterDashboard.service.js";
import { notifyCandidateShortlisted, notifyCandidatesAssessmentPublished } from "./hiringNotify.service.js";

const ACTIVE_EXAMS_CACHE_KEY = "cache:exams:active:v1";

const toObjectId = (value) => new mongoose.Types.ObjectId(String(value));

const round = (value, digits = 1) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  const factor = 10 ** digits;
  return Math.round(numeric * factor) / factor;
};

const scorePercentExpression = {
  $cond: [
    { $gt: ["$analytics.maxScore", 0] },
    { $multiply: [{ $divide: ["$analytics.score", "$analytics.maxScore"] }, 100] },
    0
  ]
};

const COMPLETED = ["submitted", "auto_submitted"];

export const bustActiveExamCache = async () => {
  await cacheDel(ACTIVE_EXAMS_CACHE_KEY);
};

export const computeExamDisplayMeta = (exam, now = new Date()) => {
  const t = now.getTime();
  if (exam.status === "draft") {
    return { displayStatus: "draft", displayLabel: "Draft", phase: "draft", isEditable: true, saasStatus: "ACTIVE" };
  }
  if (exam.status === "completed") {
    return { displayStatus: "completed", displayLabel: "Completed", phase: "completed", isEditable: false, saasStatus: "COMPLETED" };
  }
  const endMs = exam.endTime ? new Date(exam.endTime).getTime() : null;
  if (endMs != null && !Number.isNaN(endMs) && t > endMs) {
    return {
      displayStatus: "completed",
      displayLabel: "Completed (end time passed)",
      phase: "completed",
      isEditable: false,
      saasStatus: "COMPLETED"
    };
  }
  const regDeadlineMs = exam.registrationDeadline ? new Date(exam.registrationDeadline).getTime() : null;
  if (regDeadlineMs != null && !Number.isNaN(regDeadlineMs) && t > regDeadlineMs) {
    const startMs = exam.startTime ? new Date(exam.startTime).getTime() : null;
    if (startMs != null && !Number.isNaN(startMs) && t < startMs) {
      return {
        displayStatus: "registration_closed",
        displayLabel: "Registration closed",
        phase: "pre_start",
        isEditable: false,
        saasStatus: "ACTIVE"
      };
    }
  }
  const startMs = exam.startTime ? new Date(exam.startTime).getTime() : null;
  if (startMs != null && !Number.isNaN(startMs) && t < startMs) {
    const regOpen =
      regDeadlineMs == null || Number.isNaN(regDeadlineMs) ? true : t <= regDeadlineMs;
    return {
      displayStatus: regOpen ? "registration_open" : "registration_closed",
      displayLabel: regOpen ? "Registration open" : "Registration closed",
      phase: "registration",
      isEditable: false,
      saasStatus: "ACTIVE"
    };
  }
  return { displayStatus: "ongoing", displayLabel: "Ongoing", phase: "live", isEditable: false, saasStatus: "ACTIVE" };
};

async function loadExamQuestionsOrdered(exam) {
  const idsFromSections = (exam.sections || []).flatMap((s) => s.questionIds || []);
  const ids = idsFromSections.length ? idsFromSections : exam.questionIds || [];
  if (!ids.length) return [];
  const questions = await Question.find({ _id: { $in: ids } }).lean();
  const byId = new Map(questions.map((q) => [String(q._id), q]));
  return ids.map((id) => byId.get(String(id))).filter(Boolean);
}

/** Published (or any non-deleted) exam: recruiter can review question text they authored. */
export const getRecruiterExamContentSnapshot = async ({ recruiterId, examId }) => {
  const exam = await Exam.findOne({ _id: examId, createdBy: recruiterId }).lean();
  if (!exam) throw new AppError("Assessment not found", 404);
  const questions = await loadExamQuestionsOrdered(exam);
  return {
    exam: {
      _id: exam._id,
      title: exam.title,
      description: exam.description,
      status: exam.status,
      durationMinutes: exam.durationMinutes,
      maxInterviewRounds: exam.maxInterviewRounds,
      registrationDeadline: exam.registrationDeadline,
      startTime: exam.startTime,
      endTime: exam.endTime
    },
    questions
  };
};

export const updateRecruiterExam = async ({ recruiterId, examId, patch }) => {
  const existing = await Exam.findOne({ _id: examId, createdBy: recruiterId }).select("status").lean();
  if (!existing) throw new AppError("Assessment not found", 404);
  if (existing.status !== "draft") {
    throw new AppError("Only draft assessments can be edited. Publish locks the assessment.", 403);
  }

  const exam = await Exam.findOneAndUpdate(
    { _id: examId, createdBy: recruiterId, status: "draft" },
    {
      $set: {
        ...(patch.title !== undefined && { title: String(patch.title).trim() }),
        ...(patch.description !== undefined && { description: patch.description }),
        ...(patch.durationMinutes !== undefined && { durationMinutes: patch.durationMinutes }),
        ...(patch.startTime !== undefined && { startTime: patch.startTime || null }),
        ...(patch.endTime !== undefined && { endTime: patch.endTime || null }),
        ...(patch.registrationDeadline !== undefined && {
          registrationDeadline: patch.registrationDeadline ? new Date(patch.registrationDeadline) : null
        }),
        ...(patch.status !== undefined && { status: patch.status }),
        ...(patch.maxInterviewRounds !== undefined && {
          maxInterviewRounds: Math.min(20, Math.max(1, Number(patch.maxInterviewRounds) || 3))
        }),
        ...(patch.settings && { settings: patch.settings })
      }
    },
    { new: true, runValidators: true }
  ).lean();
  if (!exam) throw new AppError("Assessment not found", 404);
  await bustActiveExamCache();
  if (exam.status === "scheduled") {
    await notifyCandidatesAssessmentPublished({ examId: exam._id, examTitle: exam.title || "Assessment" });
  }
  return exam;
};

export const getRecruiterExamDraftBundle = async ({ recruiterId, examId }) => {
  const exam = await Exam.findOne({ _id: examId, createdBy: recruiterId }).lean();
  if (!exam) throw new AppError("Assessment not found", 404);
  if (exam.status !== "draft") {
    throw new AppError("Only draft assessments can load full question content for editing", 403);
  }
  const questions = await loadExamQuestionsOrdered(exam);
  return { exam, questions };
};

export const listRecruiterExamsWithStats = async (recruiterId) => {
  const recruiterObjectId = toObjectId(recruiterId);
  const exams = await Exam.find({ createdBy: recruiterObjectId }).populate("createdBy", "name email").sort({ createdAt: -1 }).lean();
  if (!exams.length) return [];

  const examIds = exams.map((e) => e._id);

  const [statsRows, regRows] = await Promise.all([
    ExamAttempt.aggregate([
      { $match: { examId: { $in: examIds } } },
      {
        $group: {
          _id: "$examId",
          attemptCandidateSet: { $addToSet: "$candidateId" },
          inProgress: { $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] } },
          completedCount: { $sum: { $cond: [{ $in: ["$status", COMPLETED] }, 1, 0] } },
          avgScore: {
            $avg: {
              $cond: [{ $in: ["$status", COMPLETED] }, scorePercentExpression, "$$REMOVE"]
            }
          },
          topScore: {
            $max: {
              $cond: [{ $in: ["$status", COMPLETED] }, scorePercentExpression, null]
            }
          }
        }
      },
      {
        $project: {
          examId: "$_id",
          distinctAttemptCandidates: { $size: "$attemptCandidateSet" },
          inProgress: 1,
          completedAttempts: "$completedCount",
          averageScore: { $ifNull: ["$avgScore", 0] },
          topScore: { $ifNull: ["$topScore", 0] }
        }
      }
    ]),
    ExamRegistration.aggregate([
      { $match: { examId: { $in: examIds } } },
      { $group: { _id: "$examId", registeredCount: { $sum: 1 } } }
    ])
  ]);

  const byExam = new Map(statsRows.map((r) => [String(r.examId), r]));
  const regByExam = new Map(regRows.map((r) => [String(r._id), r.registeredCount]));

  return exams.map((exam) => {
    const s = byExam.get(String(exam._id)) || {};
    const registeredCandidates = regByExam.get(String(exam._id)) || 0;
    const display = computeExamDisplayMeta(exam);
    return {
      ...exam,
      displayStatus: display.displayStatus,
      displayLabel: display.displayLabel,
      saasStatus: display.saasStatus,
      isEditable: display.isEditable,
      stats: {
        registeredCandidates,
        applicants: registeredCandidates,
        distinctAttemptCandidates: s.distinctAttemptCandidates || 0,
        inProgress: s.inProgress || 0,
        completedAttempts: s.completedAttempts || 0,
        averageScore: round(s.averageScore),
        topScore: round(s.topScore)
      }
    };
  });
};

const attemptScorePercent = (att) => {
  const maxS = Number(att.analytics?.maxScore) || 0;
  const sc = Number(att.analytics?.score) || 0;
  if (!maxS) return null;
  return round((sc / maxS) * 100);
};

/** Leaderboard / pipeline: every candidate who has interacted with the assessment (any attempt). */
export const getExamLeaderboard = async ({ recruiterId, examId, sort = "activity", order = "desc" }) => {
  const exam = await assertRecruiterOwnsExam({ recruiterId, examId });
  const examObjectId = toObjectId(examId);
  const sortDir = order === "asc" ? 1 : -1;

  const attempts = await ExamAttempt.find({ examId: examObjectId })
    .populate("candidateId", "name email profile")
    .sort({ updatedAt: -1 })
    .lean();

  const shortlistSet = new Set(
    (await Shortlist.find({ examId: examObjectId }).select("candidateId").lean()).map((x) => String(x.candidateId))
  );

  const interviewRows = await Interview.find({
    examId: examObjectId,
    status: { $nin: ["cancelled"] }
  })
    .select("candidateId")
    .lean();
  const interviewCountByCand = new Map();
  for (const row of interviewRows) {
    const cid = String(row.candidateId);
    interviewCountByCand.set(cid, (interviewCountByCand.get(cid) || 0) + 1);
  }

  const byCand = new Map();

  for (const att of attempts) {
    const cid = String(att.candidateId?._id || att.candidateId);
    const cand = att.candidateId;
    if (!cand || typeof cand === "string") continue;

    let row = byCand.get(cid);
    if (!row) {
      row = {
        candidateId: cid,
        candidateName: cand.name || "",
        candidateEmail: cand.email || "",
        headline: cand.profile?.headline || "",
        skills: cand.profile?.skills || [],
        resumeUrl: cand.profile?.resumeUrl || "",
        attemptCount: 0,
        hasInProgress: false,
        hasCompleted: false,
        bestScorePercent: null,
        latestStatus: att.status,
        lastActivityAt: att.updatedAt || att.startedAt,
        shortlisted: shortlistSet.has(cid),
        interviewsScheduled: interviewCountByCand.get(cid) || 0
      };
      byCand.set(cid, row);
    }

    row.attemptCount += 1;
    if (att.status === "in_progress") row.hasInProgress = true;
    if (COMPLETED.includes(att.status)) {
      row.hasCompleted = true;
      const sp = attemptScorePercent(att);
      if (sp != null) {
        row.bestScorePercent = row.bestScorePercent == null ? sp : Math.max(row.bestScorePercent, sp);
      }
    }
    const touch = new Date(att.updatedAt || att.startedAt || 0).getTime();
    const last = new Date(row.lastActivityAt || 0).getTime();
    if (touch >= last) {
      row.lastActivityAt = att.updatedAt || att.startedAt;
      row.latestStatus = att.status;
    }
  }

  const candidates = [...byCand.values()];
  if (sort === "name") {
    candidates.sort((a, b) => sortDir * String(a.candidateName).localeCompare(String(b.candidateName)));
  } else if (sort === "score") {
    candidates.sort((a, b) => {
      const av = a.bestScorePercent == null ? -1 : Number(a.bestScorePercent);
      const bv = b.bestScorePercent == null ? -1 : Number(b.bestScorePercent);
      return sortDir * (av - bv);
    });
  } else {
    candidates.sort((a, b) => sortDir * (new Date(a.lastActivityAt || 0) - new Date(b.lastActivityAt || 0)));
  }

  const maxRounds = Math.min(20, Math.max(1, Number(exam.maxInterviewRounds ?? 3)));

  return {
    exam: {
      _id: exam._id,
      title: exam.title,
      status: exam.status,
      maxInterviewRounds: maxRounds,
      startTime: exam.startTime,
      endTime: exam.endTime,
      ...computeExamDisplayMeta(exam)
    },
    candidates
  };
};

export const getExamCandidateProfile = async ({ recruiterId, examId, candidateId }) => {
  await assertRecruiterOwnsExam({ recruiterId, examId });
  const examObjectId = toObjectId(examId);
  const candObjectId = toObjectId(candidateId);

  const participated =
    (await ExamAttempt.exists({ examId: examObjectId, candidateId: candObjectId })) ||
    (await ExamRegistration.exists({ examId: examObjectId, candidateId: candObjectId }));
  if (!participated) throw new AppError("Candidate is not registered or has no attempts for this assessment", 404);

  const user = await User.findById(candObjectId).select("name email profile role").lean();
  if (!user || user.role !== ROLES.CANDIDATE) throw new AppError("Candidate not found", 404);

  return {
    candidateId: candObjectId,
    name: user.name,
    email: user.email,
    headline: user.profile?.headline || "",
    skills: user.profile?.skills || [],
    resumeUrl: user.profile?.resumeUrl || ""
  };
};

export const postExamShortlist = async ({ recruiterId, examId, candidateIds, recruiterName }) => {
  const exam = await assertRecruiterOwnsExam({ recruiterId, examId });
  const examObjectId = toObjectId(examId);
  const ids = [...new Set((candidateIds || []).map((id) => String(id)))].filter(Boolean);
  if (!ids.length) throw new AppError("candidateIds required", 400);

  const objectIds = ids.map(toObjectId);
  const already = await Shortlist.find({ examId: examObjectId, candidateId: { $in: objectIds } })
    .select("candidateId")
    .lean();
  const alreadySet = new Set(already.map((r) => String(r.candidateId)));
  const newIds = ids.filter((id) => !alreadySet.has(id));
  if (!newIds.length) {
    return Shortlist.find({ examId: examObjectId }).populate("candidateId", "name email").lean();
  }

  const fromAttempts = await ExamAttempt.distinct("candidateId", {
    examId: examObjectId,
    candidateId: { $in: newIds.map(toObjectId) }
  });
  const fromRegs = await ExamRegistration.distinct("candidateId", {
    examId: examObjectId,
    candidateId: { $in: newIds.map(toObjectId) }
  });
  const allowedSet = new Set([...fromAttempts, ...fromRegs].map((id) => String(id)));
  const missing = newIds.filter((id) => !allowedSet.has(id));
  if (missing.length) throw new AppError("Some candidates are not registered for this assessment", 400);

  for (const cid of newIds) {
    await Shortlist.create({
      recruiterId,
      examId: examObjectId,
      candidateId: toObjectId(cid)
    });
    await notifyCandidateShortlisted({
      candidateId: cid,
      examTitle: exam.title,
      recruiterName,
      examId
    });
  }

  return Shortlist.find({ examId: examObjectId }).populate("candidateId", "name email").lean();
};

export const listRecruiterShortlist = async (recruiterId) => {
  const recruiterObjectId = toObjectId(recruiterId);
  return Shortlist.find({ recruiterId: recruiterObjectId })
    .sort({ createdAt: -1 })
    .populate("examId", "title status")
    .populate("candidateId", "name email profile")
    .lean();
};
