import mongoose from "mongoose";
import CodingSubmission from "../../models/CodingSubmission.js";
import Exam from "../../models/Exam.js";
import ExamAttempt from "../../models/ExamAttempt.js";
import ExamRegistration from "../../models/ExamRegistration.js";
import Interview from "../../models/Interview.js";
import InterviewFeedback from "../../models/InterviewFeedback.js";
import Notification from "../../models/Notification.js";
import Report from "../../models/Report.js";

const COMPLETED_ATTEMPT_STATUSES = ["submitted", "auto_submitted"];
const DAY_MS = 24 * 60 * 60 * 1000;

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

const toUtcDayKey = (date) => {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
};

const addUtcDays = (date, days) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));

const getActiveCodingStreak = (activityRows, now = new Date()) => {
  const activeDays = new Set(activityRows.map((row) => row.day));
  const today = toUtcDayKey(now);
  const yesterday = toUtcDayKey(addUtcDays(now, -1));
  if (!activeDays.has(today) && !activeDays.has(yesterday)) return 0;

  let cursor = activeDays.has(today) ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) : addUtcDays(now, -1);
  let streak = 0;

  while (activeDays.has(toUtcDayKey(cursor))) {
    streak += 1;
    cursor = addUtcDays(cursor, -1);
  }

  return streak;
};

const buildAssessmentStatus = ({ exam, attempt, now }) => {
  if (attempt?.status === "in_progress") return "in_progress";
  if (COMPLETED_ATTEMPT_STATUSES.includes(attempt?.status)) return "completed";
  if (exam.startTime && new Date(exam.startTime) > now) return "scheduled";
  return "ready";
};

const buildUpcomingAssessments = ({ exams, attempts, limit, now, registrationSet }) => {
  const attemptByExamId = new Map(attempts.map((attempt) => [String(attempt.examId), attempt]));

  return exams
    .map((exam) => {
      const attempt = attemptByExamId.get(String(exam._id));
      const status = buildAssessmentStatus({ exam, attempt, now });
      const regDeadline = exam.registrationDeadline ? new Date(exam.registrationDeadline) : null;
      const registrationOpen =
        ["scheduled", "active"].includes(exam.status) &&
        (!regDeadline || Number.isNaN(regDeadline.getTime()) || now <= regDeadline) &&
        !(exam.endTime && now > new Date(exam.endTime));

      return {
        id: exam._id,
        title: exam.title,
        description: exam.description || "",
        durationMinutes: exam.durationMinutes,
        status,
        startTime: exam.startTime,
        endTime: exam.endTime,
        registrationDeadline: exam.registrationDeadline,
        registrationOpen,
        registered: Boolean(registrationSet?.has(String(exam._id))),
        createdByName: exam.createdBy?.name || "",
        attempt: attempt
          ? {
              id: attempt._id,
              status: attempt.status,
              startedAt: attempt.startedAt,
              submittedAt: attempt.submittedAt,
              expiresAt: attempt.expiresAt,
              answeredCount: attempt.analytics?.answeredCount || 0
            }
          : null
      };
    })
    .filter((assessment) => assessment.status !== "completed")
    .sort((a, b) => {
      const priority = { in_progress: 0, ready: 1, scheduled: 2 };
      const priorityDiff = priority[a.status] - priority[b.status];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.startTime || 0) - new Date(b.startTime || 0);
    })
    .slice(0, limit);
};

const buildRecommendations = ({ upcomingAssessments, weakTopics, codingStats, profile, ranking }) => {
  const recommendations = [];
  const activeAssessment = upcomingAssessments.find((assessment) => assessment.status === "in_progress");
  const readyAssessment = upcomingAssessments.find((assessment) => assessment.status === "ready");
  const topWeakTopic = weakTopics[0];

  if (activeAssessment) {
    recommendations.push({
      type: "assessment",
      priority: "high",
      title: `Resume ${activeAssessment.title}`,
      description: "An assessment attempt is already open. Finish it before the timer expires.",
      actionLabel: "Resume assessment",
      href: `/candidate/exams/${activeAssessment.id}`
    });
  } else if (readyAssessment) {
    recommendations.push({
      type: "assessment",
      priority: "high",
      title: `Start ${readyAssessment.title}`,
      description: "This assessment is available now and can improve your recent score trend.",
      actionLabel: "Start assessment",
      href: `/candidate/exams/${readyAssessment.id}`
    });
  }

  if (topWeakTopic) {
    recommendations.push({
      type: "skill",
      priority: topWeakTopic.wrong > 1 ? "high" : "medium",
      title: `Drill ${topWeakTopic.topic}`,
      description: `Your accuracy is ${round(topWeakTopic.accuracy)}% across ${topWeakTopic.attempted} attempted item${
        topWeakTopic.attempted === 1 ? "" : "s"
      }.`,
      actionLabel: "Open AI plan",
      href: "/insights/ai"
    });
  }

  if (!codingStats.totalSubmissions) {
    recommendations.push({
      type: "coding",
      priority: "medium",
      title: "Submit your first coding solution",
      description: "Coding submissions unlock streaks, accepted-rate analytics, and skill scoring.",
      actionLabel: "Open coding arena",
      href: "/workspace/coding"
    });
  }

  if (!profile.resumeUrl) {
    recommendations.push({
      type: "resume",
      priority: "medium",
      title: "Run a resume analyzer pass",
      description: "Add resume evidence so the AI coach can connect assessment results with job readiness.",
      actionLabel: "Analyze resume",
      href: "/insights/ai"
    });
  }

  if (ranking.rank && ranking.percentile < 50) {
    recommendations.push({
      type: "ranking",
      priority: "medium",
      title: "Move up the leaderboard",
      description: `You are in the ${round(ranking.percentile)}th percentile of candidates with submitted assessments.`,
      actionLabel: "Review weak topics",
      href: "#weak-topics"
    });
  }

  return recommendations.slice(0, 5);
};

const calculateAiSkillScore = ({ assessmentSummary, codingStats, interviewSummary }) => {
  const weighted = [];

  if (assessmentSummary.totalCompleted > 0) {
    weighted.push({ value: assessmentSummary.averageScore, weight: 0.55 });
  }
  if (codingStats.totalSubmissions > 0) {
    weighted.push({ value: codingStats.averageScore, weight: 0.3 });
  }
  if (interviewSummary.count > 0) {
    weighted.push({ value: interviewSummary.averageScore, weight: 0.15 });
  }

  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
  if (!totalWeight) return null;

  return round(weighted.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight);
};

export const getCandidateDashboardAnalytics = async ({ candidate, limit = 6 }) => {
  const candidateId = toObjectId(candidate._id);
  const now = new Date();
  const safeLimit = Math.min(12, Math.max(3, Number(limit) || 6));
  const lookbackStart = new Date(now.getTime() - 120 * DAY_MS);

  const availableExamFilter = {
    status: { $in: ["scheduled", "active"] },
    $or: [{ endTime: { $exists: false } }, { endTime: null }, { endTime: { $gte: now } }]
  };

  const [
    availableExams,
    assessmentSummaryRows,
    recentScores,
    weakTopics,
    difficultyBreakdown,
    codingSummaryRows,
    codingActivityRows,
    recentCodingSubmissions,
    recentReports,
    latestReport,
    notificationRows,
    unreadNotifications,
    interviewSummaryRows,
    latestInterview,
    rankingRows
  ] = await Promise.all([
    Exam.find(availableExamFilter)
      .select("title description durationMinutes status startTime endTime settings registrationDeadline")
      .populate("createdBy", "name email")
      .sort({ startTime: 1, createdAt: -1 })
      .limit(24)
      .lean(),
    ExamAttempt.aggregate([
      { $match: { candidateId, status: { $in: COMPLETED_ATTEMPT_STATUSES } } },
      {
        $project: {
          scorePercent: scorePercentExpression,
          submittedAt: 1
        }
      },
      {
        $group: {
          _id: null,
          totalCompleted: { $sum: 1 },
          averageScore: { $avg: "$scorePercent" },
          bestScore: { $max: "$scorePercent" },
          lastSubmittedAt: { $max: "$submittedAt" }
        }
      }
    ]),
    ExamAttempt.aggregate([
      { $match: { candidateId, status: { $in: COMPLETED_ATTEMPT_STATUSES } } },
      { $sort: { submittedAt: -1 } },
      { $limit: safeLimit },
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
          id: "$_id",
          examId: 1,
          examTitle: { $ifNull: ["$exam.title", "Assessment"] },
          status: 1,
          submittedAt: 1,
          score: "$analytics.score",
          maxScore: "$analytics.maxScore",
          scorePercent: scorePercentExpression
        }
      }
    ]),
    ExamAttempt.aggregate([
      { $match: { candidateId, status: { $in: COMPLETED_ATTEMPT_STATUSES } } },
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
      { $match: { maxMarks: { $gt: 0 } } },
      {
        $project: {
          _id: 0,
          topic: "$_id",
          attempted: 1,
          correct: 1,
          wrong: 1,
          score: 1,
          maxMarks: 1,
          accuracy: {
            $cond: [{ $gt: ["$attempted", 0] }, { $multiply: [{ $divide: ["$correct", "$attempted"] }, 100] }, 0]
          }
        }
      },
      { $addFields: { weaknessScore: { $subtract: [100, "$accuracy"] } } },
      { $sort: { weaknessScore: -1, wrong: -1, attempted: -1 } },
      { $limit: safeLimit }
    ]),
    ExamAttempt.aggregate([
      { $match: { candidateId, status: { $in: COMPLETED_ATTEMPT_STATUSES } } },
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
          score: 1,
          maxMarks: 1,
          accuracy: {
            $cond: [{ $gt: ["$attempted", 0] }, { $multiply: [{ $divide: ["$correct", "$attempted"] }, 100] }, 0]
          }
        }
      },
      { $sort: { difficulty: 1 } }
    ]),
    CodingSubmission.aggregate([
      { $match: { candidateId } },
      {
        $group: {
          _id: null,
          totalSubmissions: { $sum: 1 },
          acceptedSubmissions: { $sum: { $cond: [{ $eq: ["$status", "accepted"] }, 1, 0] } },
          averageScore: { $avg: "$score" },
          bestScore: { $max: "$score" },
          lastSubmittedAt: { $max: "$createdAt" }
        }
      }
    ]),
    CodingSubmission.aggregate([
      { $match: { candidateId, createdAt: { $gte: lookbackStart } } },
      {
        $group: {
          _id: {
            $dateToString: {
              date: "$createdAt",
              format: "%Y-%m-%d",
              timezone: "UTC"
            }
          },
          submissions: { $sum: 1 },
          bestScore: { $max: "$score" }
        }
      },
      { $project: { _id: 0, day: "$_id", submissions: 1, bestScore: 1 } },
      { $sort: { day: -1 } }
    ]),
    CodingSubmission.find({ candidateId })
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .select("examId questionId language status score runtime memory createdAt")
      .populate("questionId", "title difficulty topics")
      .populate("examId", "title")
      .lean(),
    Report.find({ candidateId }).sort({ createdAt: -1 }).limit(safeLimit).select("examId totalScore maxScore percentile summary createdAt").lean(),
    Report.findOne({ candidateId }).sort({ createdAt: -1 }).select("summary percentile totalScore maxScore createdAt").lean(),
    Notification.find({ userId: candidateId }).sort({ createdAt: -1 }).limit(safeLimit).select("type title message isRead payload createdAt").lean(),
    Notification.countDocuments({ userId: candidateId, isRead: false }),
    InterviewFeedback.aggregate([
      { $match: { candidateId } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          averageCommunicationScore: { $avg: "$aiFeedback.communicationScore" },
          averageConfidenceScore: { $avg: "$aiFeedback.confidenceScore" },
          averageSentimentScore: { $avg: "$aiFeedback.sentimentScore" }
        }
      }
    ]),
    InterviewFeedback.findOne({ candidateId })
      .sort({ createdAt: -1 })
      .select("interviewId aiFeedback transcriptUrl createdAt")
      .lean(),
    ExamAttempt.aggregate([
      { $match: { status: { $in: COMPLETED_ATTEMPT_STATUSES }, "analytics.maxScore": { $gt: 0 } } },
      {
        $project: {
          candidateId: 1,
          scorePercent: scorePercentExpression
        }
      },
      {
        $group: {
          _id: "$candidateId",
          averageScore: { $avg: "$scorePercent" },
          bestScore: { $max: "$scorePercent" },
          completedAssessments: { $sum: 1 }
        }
      },
      { $sort: { averageScore: -1, bestScore: -1, completedAssessments: -1 } }
    ]).allowDiskUse(true)
  ]);

  const candidateInterviewRounds = await Interview.find({ candidateId, status: { $nin: ["cancelled"] } })
    .sort({ scheduledAt: 1 })
    .populate("examId", "title")
    .lean();

  const scheduledInterviewRounds = candidateInterviewRounds.filter((row) => row.status === "scheduled");
  const completedInterviewRounds = candidateInterviewRounds.filter((row) => row.status === "completed");

  const availableExamIds = availableExams.map((exam) => exam._id);
  const availableAttempts = availableExamIds.length
    ? await ExamAttempt.find({ candidateId, examId: { $in: availableExamIds } })
        .select("examId status startedAt submittedAt expiresAt analytics updatedAt")
        .lean()
    : [];

  const myRegs = availableExamIds.length
    ? await ExamRegistration.find({ candidateId, examId: { $in: availableExamIds } }).select("examId").lean()
    : [];
  const registrationSet = new Set(myRegs.map((r) => String(r.examId)));

  const assessmentSummarySource = assessmentSummaryRows[0] || {};
  const assessmentSummary = {
    totalCompleted: assessmentSummarySource.totalCompleted || 0,
    averageScore: round(assessmentSummarySource.averageScore),
    bestScore: round(assessmentSummarySource.bestScore),
    lastSubmittedAt: assessmentSummarySource.lastSubmittedAt || null
  };

  const codingSummarySource = codingSummaryRows[0] || {};
  const codingStats = {
    totalSubmissions: codingSummarySource.totalSubmissions || 0,
    acceptedSubmissions: codingSummarySource.acceptedSubmissions || 0,
    acceptanceRate: codingSummarySource.totalSubmissions
      ? round((codingSummarySource.acceptedSubmissions / codingSummarySource.totalSubmissions) * 100)
      : 0,
    averageScore: round(codingSummarySource.averageScore),
    bestScore: round(codingSummarySource.bestScore),
    lastSubmittedAt: codingSummarySource.lastSubmittedAt || null,
    streakDays: getActiveCodingStreak(codingActivityRows, now),
    activeDaysLast120: codingActivityRows.length
  };

  const interviewSummarySource = interviewSummaryRows[0] || {};
  const interviewScores = [
    interviewSummarySource.averageCommunicationScore,
    interviewSummarySource.averageConfidenceScore,
    interviewSummarySource.averageSentimentScore
  ].filter((value) => Number.isFinite(Number(value)));
  const interviewSummary = {
    count: interviewSummarySource.count || 0,
    averageCommunicationScore: round(interviewSummarySource.averageCommunicationScore),
    averageConfidenceScore: round(interviewSummarySource.averageConfidenceScore),
    averageSentimentScore: round(interviewSummarySource.averageSentimentScore),
    averageScore: interviewScores.length ? round(interviewScores.reduce((sum, value) => sum + Number(value), 0) / interviewScores.length) : 0,
    latestFeedback: latestInterview,
    scheduledRounds: scheduledInterviewRounds.map((row) => ({
      id: row._id,
      assessmentName: row.examId?.title || "",
      roundType: row.roundType,
      scheduledAt: row.scheduledAt,
      durationMinutes: row.durationMinutes,
      meetingUrl: row.meetingUrl || "",
      status: row.status
    })),
    completedRounds: completedInterviewRounds.map((row) => ({
      id: row._id,
      assessmentName: row.examId?.title || "",
      roundType: row.roundType,
      scheduledAt: row.scheduledAt,
      durationMinutes: row.durationMinutes,
      outcome: row.outcome || null,
      status: row.status
    }))
  };

  const rankingIndex = rankingRows.findIndex((row) => String(row._id) === String(candidateId));
  const ranking = {
    rank: rankingIndex >= 0 ? rankingIndex + 1 : null,
    cohortSize: rankingRows.length,
    percentile: rankingIndex >= 0 && rankingRows.length ? round(((rankingRows.length - rankingIndex) / rankingRows.length) * 100) : null,
    averageScore: rankingIndex >= 0 ? round(rankingRows[rankingIndex].averageScore) : null
  };

  const profile = {
    name: candidate.name,
    email: candidate.email,
    headline: candidate.profile?.headline || "",
    skills: candidate.profile?.skills || [],
    resumeUrl: candidate.profile?.resumeUrl || "",
    memberSince: candidate.createdAt
  };

  const upcomingAssessments = buildUpcomingAssessments({
    exams: availableExams,
    attempts: availableAttempts,
    limit: safeLimit,
    now,
    registrationSet
  });

  const normalizedWeakTopics = weakTopics.map((topic) => ({
    ...topic,
    accuracy: round(topic.accuracy),
    weaknessScore: round(topic.weaknessScore)
  }));

  const normalizedRecentScores = recentScores.map((score) => ({
    ...score,
    scorePercent: round(score.scorePercent)
  }));

  const normalizedDifficultyBreakdown = difficultyBreakdown.map((difficulty) => ({
    ...difficulty,
    accuracy: round(difficulty.accuracy)
  }));

  const recommendations = buildRecommendations({
    upcomingAssessments,
    weakTopics: normalizedWeakTopics,
    codingStats,
    profile,
    ranking
  });

  return {
    generatedAt: now,
    profile,
    metrics: {
      upcomingAssessments: upcomingAssessments.length,
      upcomingInterviews: scheduledInterviewRounds.length,
      completedAssessments: assessmentSummary.totalCompleted,
      averageScore: assessmentSummary.averageScore,
      bestScore: assessmentSummary.bestScore,
      codingStreakDays: codingStats.streakDays,
      aiSkillScore: calculateAiSkillScore({ assessmentSummary, codingStats, interviewSummary }),
      ranking,
      unreadNotifications
    },
    assessments: {
      upcoming: upcomingAssessments,
      recentScores: normalizedRecentScores,
      scoreTrend: [...normalizedRecentScores].reverse(),
      weakTopics: normalizedWeakTopics,
      difficultyBreakdown: normalizedDifficultyBreakdown
    },
    coding: {
      ...codingStats,
      activity: codingActivityRows.slice(0, 30).reverse(),
      recentSubmissions: recentCodingSubmissions.map((submission) => ({
        id: submission._id,
        examTitle: submission.examId?.title || "",
        questionTitle: submission.questionId?.title || "",
        difficulty: submission.questionId?.difficulty || "",
        topics: submission.questionId?.topics || [],
        language: submission.language,
        status: submission.status,
        score: round(submission.score),
        runtime: submission.runtime,
        memory: submission.memory,
        createdAt: submission.createdAt
      }))
    },
    interviews: interviewSummary,
    resume: {
      hasResume: Boolean(profile.resumeUrl),
      resumeUrl: profile.resumeUrl
    },
    aiFeedback: {
      latestReportSummary: latestReport?.summary || "",
      latestReportPercentile: latestReport?.percentile ?? null,
      latestInterviewRecommendation: latestInterview?.aiFeedback?.recommendation || "",
      reports: recentReports
    },
    notifications: {
      unreadCount: unreadNotifications,
      latest: notificationRows
    },
    recommendations
  };
};
