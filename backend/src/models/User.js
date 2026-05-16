import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { ACCOUNT_STATUS, ROLES } from "../constants/roles.js";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.CANDIDATE
    },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, default: null, index: true },
    emailVerificationExpiresAt: { type: Date, default: null },
    accountStatus: {
      type: String,
      enum: Object.values(ACCOUNT_STATUS),
      default: ACCOUNT_STATUS.ACTIVE,
      index: true
    },
    recruiterApproval: {
      requestedAt: Date,
      reviewedAt: Date,
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      decisionReason: String
    },
    refreshToken: { type: String, select: false },
    profile: {
      headline: String,
      skills: [String],
      resumeUrl: String
    }
  },
  { timestamps: true }
);

userSchema.index({ emailVerificationToken: 1, emailVerificationExpiresAt: 1 });
userSchema.index({ role: 1, accountStatus: 1, createdAt: -1 });

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function comparePassword(plainText) {
  return bcrypt.compare(plainText, this.password);
};

export default mongoose.model("User", userSchema);
