import mongoose from "mongoose";
import { ROLES } from "../constants/roles.js";

const examSectionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    order: { type: Number, required: true, min: 0 },
    durationMinutes: { type: Number, min: 1 },
    questionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true }]
  },
  { _id: false }
);

const examSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    durationMinutes: { type: Number, required: true, min: 1 },
    startTime: Date,
    endTime: Date,
    /** Last moment candidates may register; after this, new registrations are blocked (unless exam is draft). */
    registrationDeadline: { type: Date, default: null },
    questionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
    allowedRoles: [{ type: String, default: ROLES.CANDIDATE }],
    settings: {
      shuffleQuestions: { type: Boolean, default: true },
      shuffleOptions: { type: Boolean, default: false },
      allowTabSwitch: { type: Boolean, default: false },
      autoSubmit: { type: Boolean, default: true },
      resumeEnabled: { type: Boolean, default: true },
      negativeMarkingEnabled: { type: Boolean, default: false },
      defaultNegativeMark: { type: Number, default: 0, min: 0 }
    },
    sections: [examSectionSchema],
    status: {
      type: String,
      enum: ["draft", "scheduled", "active", "completed"],
      default: "draft"
    },
    /** Max interview rounds a recruiter may schedule per candidate for this assessment (shortlisted candidates). */
    maxInterviewRounds: { type: Number, default: 3, min: 1, max: 20 }
  },
  { timestamps: true }
);

examSchema.index({ status: 1, startTime: 1, endTime: 1 });
examSchema.index({ createdBy: 1, createdAt: -1 });

export default mongoose.model("Exam", examSchema);
