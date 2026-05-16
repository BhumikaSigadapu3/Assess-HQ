import mongoose from "mongoose";

const interviewSchema = new mongoose.Schema(
  {
    recruiterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    examId: { type: mongoose.Schema.Types.ObjectId, ref: "Exam" },
    roundType: {
      type: String,
      enum: ["technical", "coding", "system_design", "hr", "culture"],
      default: "technical"
    },
    scheduledAt: { type: Date, required: true },
    durationMinutes: { type: Number, default: 45, min: 15, max: 240 },
    meetingUrl: { type: String, default: "" },
    notes: { type: String, default: "" },
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled", "no_show"],
      default: "scheduled"
    },
    /** Set when status is completed — visible to candidate & recruiter. */
    outcome: {
      type: String,
      enum: ["shortlisted", "rejected"],
      default: null
    }
  },
  { timestamps: true }
);

interviewSchema.index({ recruiterId: 1, scheduledAt: -1 });
interviewSchema.index({ candidateId: 1, scheduledAt: -1 });
interviewSchema.index({ examId: 1, scheduledAt: -1 });

export default mongoose.model("Interview", interviewSchema);
