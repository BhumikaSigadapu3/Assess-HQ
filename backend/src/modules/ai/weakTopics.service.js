import ExamAttempt from "../../models/ExamAttempt.js";
import { AppError } from "../../utils/appError.js";

export const buildWeakTopicPlan = async ({ examId, candidateId }) => {
  const attempt = await ExamAttempt.findOne({ examId, candidateId }).lean();
  if (!attempt) throw new AppError("Exam attempt not found", 404);
  if (attempt.status === "in_progress") {
    throw new AppError("Complete the exam to unlock AI topic insights", 400);
  }

  const rows = attempt.analytics?.topicBreakdown || [];
  const weak = rows
    .filter((r) => r.wrong > 0 || (r.attempted > 0 && r.score < r.maxMarks * 0.5))
    .sort((a, b) => b.wrong - a.wrong || b.maxMarks - b.score - (a.maxMarks - a.score))
    .slice(0, 8)
    .map((r) => ({
      topic: r.topic,
      priority: r.wrong >= 2 ? "high" : "medium",
      drills: [
        `Redo ${r.wrong} missed items in ${r.topic} with spaced repetition.`,
        `Target ${r.topic} fundamentals with timed mini-quizzes.`
      ],
      metrics: {
        attempted: r.attempted,
        wrong: r.wrong,
        score: r.score,
        maxMarks: r.maxMarks
      }
    }));

  return {
    examId,
    weakTopics: weak,
    summary:
      weak.length === 0
        ? "No major weak topics detected from this attempt."
        : `Focus next study block on: ${weak.map((w) => w.topic).join(", ")}.`
  };
};
