import mongoose from "mongoose";
import Exam from "../../models/Exam.js";
import ExamAttempt from "../../models/ExamAttempt.js";
import { AppError } from "../../utils/appError.js";

export const assertRecruiterOwnsExam = async ({ examId, recruiterId }) => {
  const exam = await Exam.findOne({ _id: examId, createdBy: recruiterId }).lean();
  if (!exam) throw new AppError("Exam not found", 404);
  return exam;
};

export const getExamAttemptsSummary = async ({ examId, recruiterId, page = 1, limit = 20 }) => {
  await assertRecruiterOwnsExam({ examId, recruiterId });
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    ExamAttempt.find({ examId, status: { $ne: "in_progress" } })
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("candidateId", "name email role")
      .lean(),
    ExamAttempt.countDocuments({ examId, status: { $ne: "in_progress" } })
  ]);

  const aggregates = await ExamAttempt.aggregate([
    { $match: { examId: new mongoose.Types.ObjectId(String(examId)), status: { $ne: "in_progress" } } },
    {
      $group: {
        _id: null,
        avgScore: { $avg: "$analytics.score" },
        maxScoreSample: { $max: "$analytics.maxScore" },
        count: { $sum: 1 }
      }
    }
  ]);

  const agg = aggregates[0] || { avgScore: 0, maxScoreSample: 0, count: 0 };

  return {
    pagination: { page, limit, total },
    summary: {
      attemptCount: agg.count,
      averageScore: Number(agg.avgScore?.toFixed(2) || 0),
      referenceMaxScore: agg.maxScoreSample || 0
    },
    attempts: items
  };
};
