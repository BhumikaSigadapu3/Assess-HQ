import mongoose from "mongoose";

const shortlistSchema = new mongoose.Schema(
  {
    recruiterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    examId: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true, index: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true }
  },
  { timestamps: true }
);

shortlistSchema.index({ examId: 1, candidateId: 1 }, { unique: true });
shortlistSchema.index({ recruiterId: 1, createdAt: -1 });

export default mongoose.model("Shortlist", shortlistSchema);
