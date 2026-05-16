import mongoose from "mongoose";

const leaderboardEntrySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    score: { type: Number, required: true },
    rank: Number,
    percentile: Number
  },
  { _id: false }
);

const leaderboardSchema = new mongoose.Schema(
  {
    examId: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true },
    entries: [leaderboardEntrySchema],
    published: { type: Boolean, default: false }
  },
  { timestamps: true }
);

leaderboardSchema.index({ examId: 1 }, { unique: true });

export default mongoose.model("Leaderboard", leaderboardSchema);
