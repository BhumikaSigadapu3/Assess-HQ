import mongoose from "mongoose";

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true },
    selectedOption: { type: String, default: null },
    isMarkedForReview: { type: Boolean, default: false },
    timeSpentSeconds: { type: Number, default: 0, min: 0 },
    lastUpdatedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const sectionProgressSchema = new mongoose.Schema(
  {
    sectionKey: { type: String, required: true },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    timeSpentSeconds: { type: Number, default: 0, min: 0 }
  },
  { _id: false }
);

const examAttemptSchema = new mongoose.Schema(
  {
    examId: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["in_progress", "auto_submitted", "submitted"],
      default: "in_progress"
    },
    startedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true },
    questionOrder: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
    sectionOrder: [{ type: String }],
    currentSectionKey: { type: String, default: null },
    answers: [answerSchema],
    sectionsProgress: [sectionProgressSchema],
    analytics: {
      answeredCount: { type: Number, default: 0, min: 0 },
      reviewCount: { type: Number, default: 0, min: 0 },
      score: { type: Number, default: 0 },
      maxScore: { type: Number, default: 0 },
      mcqQuestionCount: { type: Number, default: 0, min: 0 },
      mcqAnsweredCount: { type: Number, default: 0, min: 0 },
      mcqCorrectCount: { type: Number, default: 0, min: 0 },
      codingQuestionsScored: { type: Number, default: 0, min: 0 },
      codingTestCasesPassed: { type: Number, default: 0, min: 0 },
      codingTestCasesTotal: { type: Number, default: 0, min: 0 },
      topicBreakdown: [
        {
          topic: { type: String, required: true },
          attempted: { type: Number, default: 0 },
          correct: { type: Number, default: 0 },
          wrong: { type: Number, default: 0 },
          score: { type: Number, default: 0 },
          maxMarks: { type: Number, default: 0 }
        }
      ],
      difficultyBreakdown: [
        {
          difficulty: { type: String, required: true },
          attempted: { type: Number, default: 0 },
          correct: { type: Number, default: 0 },
          score: { type: Number, default: 0 },
          maxMarks: { type: Number, default: 0 }
        }
      ]
    }
  },
  { timestamps: true }
);

examAttemptSchema.index({ examId: 1, candidateId: 1 }, { unique: true });
examAttemptSchema.index({ candidateId: 1, status: 1, updatedAt: -1 });
examAttemptSchema.index({ candidateId: 1, status: 1, submittedAt: -1 });
examAttemptSchema.index({ examId: 1, status: 1, submittedAt: -1 });
examAttemptSchema.index({ status: 1, expiresAt: 1 });

export default mongoose.model("ExamAttempt", examAttemptSchema);
