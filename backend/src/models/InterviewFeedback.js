import mongoose from "mongoose";

const interviewFeedbackSchema = new mongoose.Schema(
  {
    interviewId: String,
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    interviewerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    aiFeedback: {
      communicationScore: Number,
      confidenceScore: Number,
      sentimentScore: Number,
      strengths: [String],
      weaknesses: [String],
      recommendation: String
    },
    transcriptUrl: String
  },
  { timestamps: true }
);

interviewFeedbackSchema.index({ candidateId: 1, createdAt: -1 });

export default mongoose.model("InterviewFeedback", interviewFeedbackSchema);
