import mongoose from "mongoose";
import CodingSubmission from "../../models/CodingSubmission.js";
import Exam from "../../models/Exam.js";
import ExamAttempt from "../../models/ExamAttempt.js";
import ExamRegistration from "../../models/ExamRegistration.js";
import Interview from "../../models/Interview.js";
import Notification from "../../models/Notification.js";
import Shortlist from "../../models/Shortlist.js";
import { notifyCandidateInterviewScheduled, notifyCandidateInterviewShortlisted } from "./hiringNotify.service.js";
import Question from "../../models/Question.js";
import Report from "../../models/Report.js";
import User from "../../models/User.js";
import { ROLES } from "../../constants/roles.js";
import { AppError } from "../../utils/appError.js";

const COMPLETED_ATTEMPT_STATUSES = ["submitted", "auto_submitted"];
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

export const getRecruiterExamIds = async (recruiterId) => {
  const exams = await Exam.find({ createdBy: recruiterId }).select("_id").lean();
  return exams.map((exam) => exam._id);
};

export const assertRecruiterOwnsExam = async ({ recruiterId, examId }) => {
  const exam = await Exam.findOne({ _id: examId, createdBy: recruiterId }).lean();
  if (!exam) throw new AppError("Assessment not found", 404);
  return exam;
};

export const getRecruiterDashboardAnalytics = async ({ recruiterId, limit = 8 }) => {
  const recruiterObjectId = toObjectId(recruiterId);
  const safeLimit = Math.min(20, Math.max(5, Number(limit) || 8));
  const examIds = await getRecruiterExamIds(recruiterObjectId);
  const attemptMatch = examIds.length ? { examId: { $in: examIds } } : { examId: { $in: [] } };
  const completedMatch = { ...attemptMatch, status: { $in: COMPLETED_ATTEMPT_STATUSES } };

  const hiringFunnel = examIds.length
    ? await (async () => {
        const [appliedIds, attemptedIds, shortlistedIds, interviewedIds] = await Promise.all([
          ExamRegistration.distinct("candidateId", { examId: { $in: examIds } }),
          ExamAttempt.distinct("candidateId", {
            ...attemptMatch,
            status: { $in: [...COMPLETED_ATTEMPT_STATUSES, "in_progress"] }
          }),
          Shortlist.distinct("candidateId", { recruiterId: recruiterObjectId, examId: { $in: examIds } }),
          Interview.distinct("candidateId", { recruiterId: recruiterObjectId })
        ]);
        return {
          applied: appliedIds.length,
          attempted: attemptedIds.length,
          shortlisted: shortlistedIds.length,
          interviewed: interviewedIds.length
        };
      })()
    : { applied: 0, attempted: 0, shortlisted: 0, interviewed: 0 };

  const [
    exams,
    questionSummaryRows,
    attemptSummaryRows,
    candidateRows,
    recentAttempts,
    scoreTrend,
    topicPerformance,
    difficultyPerformance,
    codingSummaryRows,
    reports,
    interviews,
    notificationRows,
    unreadNotifications
  ] = await Promise.all([
    Exam.find({ createdBy: recruiterObjectId }).sort({ createdAt: -1 }).limit(20).lean(),
    Question.aggregate([
      {
        $match: {
          $or: [{ createdBy: recruiterObjectId }, ...(examIds.length ? [{ examId: { $in: examIds } }] : [])]
        }
      },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 }
        }
      }
    ]),
    ExamAttempt.aggregate([
      { $match: attemptMatch },
      {
        $group: {
          _id: null,
          totalAttempts: { $sum: 1 },
          inProgress: { $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] } },
          completedAttempts: { $sum: { $cond: [{ $in: ["$status", COMPLETED_ATTEMPT_STATUSES] }, 1, 0] } },
          averageScore: { $avg: scorePercentExpression },
          bestScore: { $max: scorePercentExpression }
        }
      }
    ]),
    ExamAttempt.aggregate([
      { $match: attemptMatch },
      {
        $group: {
          _id: "$candidateId",
          attempts: { $sum: 1 },
          completedAttempts: { $sum: { $cond: [{ $in: ["$status", COMPLETED_ATTEMPT_STATUSES] }, 1, 0] } },
          averageScore: { $avg: scorePercentExpression },
          bestScore: { $max: scorePercentExpression },
          lastActivityAt: { $max: "$updatedAt" }
        }
      },
      { $sort: { lastActivityAt: -1 } },
      { $limit: safeLimit },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "candidate"
        }
      },
      { $unwind: "$candidate" },
      {
        $project: {
          candidateId: "$_id",
          name: "$candidate.name",
          email: "$candidate.email",
          headline: "$candidate.profile.headline",
          skills: "$candidate.profile.skills",
          resumeUrl: "$candidate.profile.resumeUrl",
          attempts: 1,
          completedAttempts: 1,
          averageScore: 1,
          bestScore: 1,
          lastActivityAt: 1
        }
      }
    ]),
    ExamAttempt.find(completedMatch)
      .sort({ submittedAt: -1 })
      .limit(safeLimit)
      .populate("candidateId", "name email profile")
      .populate("examId", "title status")
      .lean(),
    ExamAttempt.aggregate([
      { $match: completedMatch },
      { $sort: { submittedAt: -1 } },
      { $limit: 12 },
      {
        $lookup: {
          from: "exams",
          localField: "examId",
          foreignField: "_id",
          as: "exam"
        }
      },
      { $unwind: { path: "$exam", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: { $ifNull: ["$exam.title", "Assessment"] },
          submittedAt: 1,
          scorePercent: scorePercentExpression
        }
      },
      { $sort: { submittedAt: 1 } }
    ]),
    ExamAttempt.aggregate([
      { $match: completedMatch },
      { $unwind: "$analytics.topicBreakdown" },
      {
        $group: {
          _id: "$analytics.topicBreakdown.topic",
          attempted: { $sum: "$analytics.topicBreakdown.attempted" },
          correct: { $sum: "$analytics.topicBreakdown.correct" },
          wrong: { $sum: "$analytics.topicBreakdown.wrong" },
          score: { $sum: "$analytics.topicBreakdown.score" },
          maxMarks: { $sum: "$analytics.topicBreakdown.maxMarks" }
        }
      },
      {
        $project: {
          _id: 0,
          topic: "$_id",
          attempted: 1,
          correct: 1,
          wrong: 1,
          accuracy: {
            $cond: [{ $gt: ["$attempted", 0] }, { $multiply: [{ $divide: ["$correct", "$attempted"] }, 100] }, 0]
          }
        }
      },
      { $sort: { attempted: -1, accuracy: 1 } },
      { $limit: safeLimit }
    ]),
    ExamAttempt.aggregate([
      { $match: completedMatch },
      { $unwind: "$analytics.difficultyBreakdown" },
      {
        $group: {
          _id: "$analytics.difficultyBreakdown.difficulty",
          attempted: { $sum: "$analytics.difficultyBreakdown.attempted" },
          correct: { $sum: "$analytics.difficultyBreakdown.correct" },
          score: { $sum: "$analytics.difficultyBreakdown.score" },
          maxMarks: { $sum: "$analytics.difficultyBreakdown.maxMarks" }
        }
      },
      {
        $project: {
          _id: 0,
          difficulty: "$_id",
          attempted: 1,
          correct: 1,
          accuracy: {
            $cond: [{ $gt: ["$attempted", 0] }, { $multiply: [{ $divide: ["$correct", "$attempted"] }, 100] }, 0]
          }
        }
      },
      { $sort: { difficulty: 1 } }
    ]),
    CodingSubmission.aggregate([
      { $match: examIds.length ? { examId: { $in: examIds } } : { examId: { $in: [] } } },
      {
        $group: {
          _id: null,
          totalSubmissions: { $sum: 1 },
          acceptedSubmissions: { $sum: { $cond: [{ $eq: ["$status", "accepted"] }, 1, 0] } },
          averageScore: { $avg: "$score" }
        }
      }
    ]),
    Report.find(examIds.length ? { examId: { $in: examIds } } : { examId: { $in: [] } })
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .populate("candidateId", "name email profile")
      .populate("examId", "title")
      .lean(),
    Interview.find({ recruiterId: recruiterObjectId })
      .sort({ scheduledAt: 1 })
      .limit(safeLimit)
      .populate("candidateId", "name email profile")
      .populate("examId", "title")
      .lean(),
    Notification.find({ userId: recruiterObjectId }).sort({ createdAt: -1 }).limit(safeLimit).lean(),
    Notification.countDocuments({ userId: recruiterObjectId, isRead: false })
  ]);

  const attemptSummary = attemptSummaryRows[0] || {};
  const codingSummary = codingSummaryRows[0] || {};
  const questionSummary = questionSummaryRows.reduce(
    (acc, row) => ({ ...acc, [row._id || "unknown"]: row.count }),
    { mcq: 0, coding: 0 }
  );

  const assessmentStatus = exams.reduce(
    (acc, exam) => {
      acc[exam.status] = (acc[exam.status] || 0) + 1;
      return acc;
    },
    { draft: 0, scheduled: 0, active: 0, completed: 0 }
  );

  return {
    generatedAt: new Date(),
    metrics: {
      totalAssessments: exams.length,
      activeAssessments: assessmentStatus.active || 0,
      scheduledAssessments: assessmentStatus.scheduled || 0,
      totalCandidates: candidateRows.length,
      totalAttempts: attemptSummary.totalAttempts || 0,
      completedAttempts: attemptSummary.completedAttempts || 0,
      liveAttempts: attemptSummary.inProgress || 0,
      averageScore: round(attemptSummary.averageScore),
      bestScore: round(attemptSummary.bestScore),
      questionCount: (questionSummary.mcq || 0) + (questionSummary.coding || 0),
      mcqQuestions: questionSummary.mcq || 0,
      codingQuestions: questionSummary.coding || 0,
      codingAcceptanceRate: codingSummary.totalSubmissions
        ? round((codingSummary.acceptedSubmissions / codingSummary.totalSubmissions) * 100)
        : 0,
      reportsGenerated: reports.length,
      interviewsScheduled: interviews.filter((interview) => interview.status === "scheduled").length,
      unreadNotifications
    },
    assessmentStatus,
    exams,
    candidates: candidateRows.map((candidate) => ({
      ...candidate,
      averageScore: round(candidate.averageScore),
      bestScore: round(candidate.bestScore)
    })),
    recentAttempts: recentAttempts.map((attempt) => ({
      id: attempt._id,
      candidate: attempt.candidateId,
      exam: attempt.examId,
      status: attempt.status,
      submittedAt: attempt.submittedAt,
      scorePercent: round(
        attempt.analytics?.maxScore ? (Number(attempt.analytics.score || 0) / Number(attempt.analytics.maxScore)) * 100 : 0
      ),
      suspiciousEvents: 0
    })),
    scoreTrend: scoreTrend.map((row) => ({ ...row, scorePercent: round(row.scorePercent) })),
    topicPerformance: topicPerformance.map((row) => ({ ...row, accuracy: round(row.accuracy) })),
    difficultyPerformance: difficultyPerformance.map((row) => ({ ...row, accuracy: round(row.accuracy) })),
    coding: {
      totalSubmissions: codingSummary.totalSubmissions || 0,
      acceptedSubmissions: codingSummary.acceptedSubmissions || 0,
      averageScore: round(codingSummary.averageScore)
    },
    reports,
    interviews,
    notifications: {
      unreadCount: unreadNotifications,
      latest: notificationRows
    },
    hiringFunnel
  };
};

export const listRecruiterCandidates = async ({ recruiterId, search = "", page = 1, limit = 20 }) => {
  const recruiterObjectId = toObjectId(recruiterId);
  const examIds = await getRecruiterExamIds(recruiterObjectId);
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
  const skip = (safePage - 1) * safeLimit;
  const searchRegex = search ? new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") : null;

  const pipeline = [
    { $match: examIds.length ? { examId: { $in: examIds } } : { examId: { $in: [] } } },
    {
      $group: {
        _id: "$candidateId",
        attempts: { $sum: 1 },
        completedAttempts: { $sum: { $cond: [{ $in: ["$status", COMPLETED_ATTEMPT_STATUSES] }, 1, 0] } },
        averageScore: { $avg: scorePercentExpression },
        bestScore: { $max: scorePercentExpression },
        lastActivityAt: { $max: "$updatedAt" }
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "candidate"
      }
    },
    { $unwind: "$candidate" },
    ...(searchRegex
      ? [
          {
            $match: {
              $or: [
                { "candidate.name": searchRegex },
                { "candidate.email": searchRegex },
                { "candidate.profile.headline": searchRegex },
                { "candidate.profile.skills": searchRegex }
              ]
            }
          }
        ]
      : []),
    {
      $project: {
        candidateId: "$_id",
        name: "$candidate.name",
        email: "$candidate.email",
        profile: "$candidate.profile",
        attempts: 1,
        completedAttempts: 1,
        averageScore: 1,
        bestScore: 1,
        lastActivityAt: 1
      }
    },
    { $sort: { lastActivityAt: -1 } },
    {
      $facet: {
        items: [{ $skip: skip }, { $limit: safeLimit }],
        total: [{ $count: "count" }]
      }
    }
  ];

  const [result] = await ExamAttempt.aggregate(pipeline);
  return {
    items: (result?.items || []).map((candidate) => ({
      ...candidate,
      averageScore: round(candidate.averageScore),
      bestScore: round(candidate.bestScore)
    })),
    total: result?.total?.[0]?.count || 0,
    page: safePage,
    limit: safeLimit
  };
};

export const listRecruiterQuestions = async ({ recruiterId, type, difficulty, search = "", page = 1, limit = 20 }) => {
  const recruiterObjectId = toObjectId(recruiterId);
  const examIds = await getRecruiterExamIds(recruiterObjectId);
  const filter = {
    $or: [{ createdBy: recruiterObjectId }, ...(examIds.length ? [{ examId: { $in: examIds } }] : [])]
  };
  if (type) filter.type = type;
  if (difficulty) filter.difficulty = difficulty;
  if (search) {
    const searchRegex = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$and = [{ $or: [{ title: searchRegex }, { prompt: searchRegex }, { topics: searchRegex }] }];
  }

  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
  const skip = (safePage - 1) * safeLimit;

  const [items, total] = await Promise.all([
    Question.find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).populate("examId", "title status").lean(),
    Question.countDocuments(filter)
  ]);

  return { items, total, page: safePage, limit: safeLimit };
};

export const listRecruiterReports = async ({ recruiterId, page = 1, limit = 20 }) => {
  const examIds = await getRecruiterExamIds(toObjectId(recruiterId));
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
  const filter = examIds.length ? { examId: { $in: examIds } } : { examId: { $in: [] } };
  const [items, total] = await Promise.all([
    Report.find(filter)
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .populate("candidateId", "name email profile")
      .populate("examId", "title status")
      .lean(),
    Report.countDocuments(filter)
  ]);

  return { items, total, page: safePage, limit: safeLimit };
};

export const scheduleRecruiterInterview = async ({ recruiterId, payload }) => {
  const candStr = String(payload.candidateId ?? "").trim();
  if (!mongoose.isValidObjectId(candStr)) {
    throw new AppError("Invalid candidate id", 400);
  }
  const candId = toObjectId(candStr);

  let examTitle = "";
  if (payload.examId) {
    const exam = await assertRecruiterOwnsExam({ recruiterId, examId: payload.examId });
    examTitle = exam.title || "";
    const shortlistRow = await Shortlist.findOne({
      recruiterId: toObjectId(recruiterId),
      examId: toObjectId(payload.examId),
      candidateId: candId
    }).lean();
    if (!shortlistRow) {
      throw new AppError("Candidate must be shortlisted for this assessment before scheduling", 400);
    }

    const maxRounds = Math.min(20, Math.max(1, Number(exam.maxInterviewRounds ?? 3)));
    const scheduledCount = await Interview.countDocuments({
      examId: toObjectId(payload.examId),
      candidateId: candId,
      status: { $nin: ["cancelled"] }
    });
    if (scheduledCount >= maxRounds) {
      throw new AppError(`Maximum of ${maxRounds} interview round(s) for this assessment has been reached`, 400);
    }

    if (exam.endTime) {
      const endMs = new Date(exam.endTime).getTime();
      const schedMs = new Date(payload.scheduledAt).getTime();
      if (Number.isFinite(endMs) && Number.isFinite(schedMs) && schedMs <= endMs) {
        throw new AppError("Interview must be scheduled after the assessment end time", 400);
      }
    }
  }

  const candidate = await User.findOne({
    _id: candId,
    role: ROLES.CANDIDATE
  }).lean();
  if (!candidate) throw new AppError("Candidate not found", 404);

  const created = await Interview.create({
    recruiterId,
    candidateId: candId,
    examId: payload.examId || undefined,
    roundType: payload.roundType,
    scheduledAt: payload.scheduledAt,
    durationMinutes: payload.durationMinutes,
    meetingUrl: payload.meetingUrl || "",
    notes: payload.notes || ""
  });

  await notifyCandidateInterviewScheduled({
    candidateId: candId,
    examTitle,
    scheduledAt: payload.scheduledAt,
    meetingUrl: payload.meetingUrl || "",
    roundType: payload.roundType || "technical",
    durationMinutes: payload.durationMinutes || 45,
    interviewId: created._id
  });

  return created;
};

/** Max interview rounds cap for an exam (aligned with scheduleRecruiterInterview). */
const examInterviewRoundsCap = (examDoc) => Math.min(20, Math.max(1, Number(examDoc?.maxInterviewRounds ?? 3)));

/**
 * For each interview with an assessment, set interviewRoundNumber (1-based order for that candidate+exam),
 * interviewRoundMax (from exam), and interviewRoundLabel e.g. "2/3". Order follows scheduledAt then _id.
 */
const attachInterviewRoundMetaBatch = async (recruiterId, items) => {
  if (!items?.length) return items;
  const rid = toObjectId(recruiterId);
  const pairSet = new Map();
  for (const inv of items) {
    const exam = inv.examId;
    if (!exam || typeof exam !== "object" || !exam._id) continue;
    const cand = inv.candidateId;
    const candId = cand && typeof cand === "object" ? cand._id : cand;
    if (!candId) continue;
    const key = `${String(candId)}:${String(exam._id)}`;
    if (!pairSet.has(key)) pairSet.set(key, { candidateId: candId, examId: exam._id });
  }

  const orderByPairKey = new Map();
  await Promise.all(
    [...pairSet.values()].map(async ({ candidateId, examId }) => {
      const key = `${String(candidateId)}:${String(examId)}`;
      const chain = await Interview.find({
        recruiterId: rid,
        candidateId: toObjectId(candidateId),
        examId: toObjectId(examId)
      })
        .sort({ scheduledAt: 1, _id: 1 })
        .select("_id")
        .lean();
      const m = new Map();
      chain.forEach((doc, i) => m.set(String(doc._id), i + 1));
      orderByPairKey.set(key, m);
    })
  );

  return items.map((inv) => {
    const exam = inv.examId;
    if (!exam || typeof exam !== "object" || !exam._id) {
      return { ...inv, interviewRoundNumber: null, interviewRoundMax: null, interviewRoundLabel: null };
    }
    const cand = inv.candidateId;
    const candId = cand && typeof cand === "object" ? cand._id : cand;
    if (!candId) {
      return { ...inv, interviewRoundNumber: null, interviewRoundMax: null, interviewRoundLabel: null };
    }
    const key = `${String(candId)}:${String(exam._id)}`;
    const maxRounds = examInterviewRoundsCap(exam);
    const roundNumber = orderByPairKey.get(key)?.get(String(inv._id)) ?? null;
    return {
      ...inv,
      interviewRoundNumber: roundNumber,
      interviewRoundMax: maxRounds,
      interviewRoundLabel: roundNumber ? `${roundNumber}/${maxRounds}` : null
    };
  });
};

export const listRecruiterInterviews = async ({ recruiterId, status, page = 1, limit = 20 }) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
  const filter = { recruiterId };
  if (status) filter.status = status;

  const [items, total] = await Promise.all([
    Interview.find(filter)
      .sort({ scheduledAt: 1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .populate("candidateId", "name email profile")
      .populate("examId", "title status maxInterviewRounds")
      .lean(),
    Interview.countDocuments(filter)
  ]);

  const enriched = await attachInterviewRoundMetaBatch(recruiterId, items);
  return { items: enriched, total, page: safePage, limit: safeLimit };
};

export const patchRecruiterInterview = async ({ recruiterId, interviewId, patch }) => {
  const row = await Interview.findOne({ _id: interviewId, recruiterId: toObjectId(recruiterId) }).populate({
    path: "examId",
    select: "title endTime maxInterviewRounds"
  });
  if (!row) throw new AppError("Interview not found", 404);

  const priorOutcome = row.outcome || null;

  const scheduledAtCurrent = new Date(row.scheduledAt);
  if (Number.isNaN(scheduledAtCurrent.getTime())) throw new AppError("Invalid interview schedule", 400);
  const lockBeforeMs = scheduledAtCurrent.getTime() - 60 * 60 * 1000;

  const updatesScheduleDetails =
    patch.scheduledAt !== undefined ||
    patch.durationMinutes !== undefined ||
    patch.meetingUrl !== undefined ||
    patch.notes !== undefined ||
    patch.roundType !== undefined;

  if (updatesScheduleDetails && Date.now() >= lockBeforeMs) {
    throw new AppError("Interview details can only be edited until 1 hour before the scheduled start", 403);
  }

  const nextScheduledAt = patch.scheduledAt != null ? new Date(patch.scheduledAt) : scheduledAtCurrent;
  if (patch.scheduledAt != null && Number.isNaN(nextScheduledAt.getTime())) {
    throw new AppError("Invalid scheduledAt", 400);
  }

  const examDoc = row.examId && typeof row.examId === "object" ? row.examId : null;
  if (examDoc?.endTime && patch.scheduledAt != null) {
    const endMs = new Date(examDoc.endTime).getTime();
    const schedMs = nextScheduledAt.getTime();
    if (Number.isFinite(endMs) && Number.isFinite(schedMs) && schedMs <= endMs) {
      throw new AppError("Interview must be scheduled after the assessment end time", 400);
    }
  }

  if (patch.status !== undefined) row.status = patch.status;

  if (row.status !== "completed") {
    if (patch.outcome !== undefined && patch.outcome) {
      throw new AppError("Shortlist outcome can only be set when the interview round is completed", 400);
    }
    row.outcome = null;
  } else if (patch.outcome !== undefined) {
    row.outcome = patch.outcome || null;
  }

  if (patch.scheduledAt != null) row.scheduledAt = nextScheduledAt;
  if (patch.durationMinutes != null) row.durationMinutes = patch.durationMinutes;
  if (patch.meetingUrl !== undefined) row.meetingUrl = patch.meetingUrl || "";
  if (patch.notes !== undefined) row.notes = patch.notes || "";
  if (patch.roundType) row.roundType = patch.roundType;

  await row.save();

  const examTitle = examDoc?.title || "";

  if (updatesScheduleDetails) {
    await notifyCandidateInterviewScheduled({
      candidateId: row.candidateId,
      examTitle,
      scheduledAt: row.scheduledAt,
      meetingUrl: row.meetingUrl,
      roundType: row.roundType,
      durationMinutes: row.durationMinutes,
      interviewId: row._id,
      isUpdate: true
    });
  }

  const updated = await Interview.findById(row._id)
    .populate("candidateId", "name email profile")
    .populate("examId", "title status maxInterviewRounds")
    .lean();
  if (!updated) throw new AppError("Interview not found", 404);
  const [withMeta] = await attachInterviewRoundMetaBatch(recruiterId, [updated]);

  const becameInterviewShortlisted =
    patch.outcome === "shortlisted" && priorOutcome !== "shortlisted" && withMeta.outcome === "shortlisted";

  if (becameInterviewShortlisted) {
    const rn = withMeta.interviewRoundNumber;
    const rm = withMeta.interviewRoundMax;
    const isLastConfiguredRound = rn != null && rm != null && rn >= rm;
    const recruiter = await User.findById(recruiterId).select("name").lean();
    await notifyCandidateInterviewShortlisted({
      candidateId: row.candidateId,
      examTitle: examTitle || (typeof withMeta.examId === "object" ? withMeta.examId?.title : "") || "",
      roundNumber: rn,
      roundMax: rm,
      isLastConfiguredRound,
      recruiterName: recruiter?.name || "The hiring team",
      examId: typeof withMeta.examId === "object" && withMeta.examId?._id ? String(withMeta.examId._id) : "",
      interviewId: row._id
    });
  }

  return withMeta;
};

export const generateRecruiterReport = async ({ recruiterId, examId, candidateId }) => {
  await assertRecruiterOwnsExam({ recruiterId, examId });

  const attempt = await ExamAttempt.findOne({
    examId,
    candidateId,
    status: { $in: COMPLETED_ATTEMPT_STATUSES }
  }).lean();
  if (!attempt) throw new AppError("Completed candidate attempt not found", 404);

  const scorePercent = attempt.analytics?.maxScore
    ? round((Number(attempt.analytics.score || 0) / Number(attempt.analytics.maxScore)) * 100)
    : 0;

  const betterCount = await ExamAttempt.countDocuments({
    examId,
    status: { $in: COMPLETED_ATTEMPT_STATUSES },
    "analytics.score": { $gt: attempt.analytics?.score || 0 }
  });
  const totalCount = await ExamAttempt.countDocuments({ examId, status: { $in: COMPLETED_ATTEMPT_STATUSES } });
  const percentile = totalCount ? round(((totalCount - betterCount) / totalCount) * 100) : 0;

  return Report.create({
    examId,
    candidateId,
    generatedBy: recruiterId,
    totalScore: attempt.analytics?.score || 0,
    maxScore: attempt.analytics?.maxScore || 0,
    percentile,
    suspiciousEvents: [],
    summary: `Candidate scored ${scorePercent}% and ranked in the ${percentile}th percentile for this assessment.`
  });
};
