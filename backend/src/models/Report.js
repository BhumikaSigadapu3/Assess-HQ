import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    examId: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    totalScore: Number,
    maxScore: Number,
    percentile: Number,
    suspiciousEvents: [
      {
        eventType: String,
        severity: { type: String, enum: ["low", "medium", "high"] },
        meta: mongoose.Schema.Types.Mixed,
        occurredAt: Date
      }
    ],
    summary: String
  },
  { timestamps: true }
);

reportSchema.index({ candidateId: 1, createdAt: -1 });

export default mongoose.model("Report", reportSchema);
