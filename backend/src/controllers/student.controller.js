import Report from "../models/Report.js";
import User from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/appError.js";
import { listCandidateExamsEnriched } from "../modules/exam/candidateExam.service.js";

const stripResumeUrl = (raw) =>
  String(raw ?? "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, "")
    .trim();

const normalizeSkills = (raw) => {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return [...new Set(raw.map((s) => String(s).trim()).filter(Boolean))].slice(0, 30);
  }
  if (typeof raw === "string") {
    return [...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))].slice(0, 30);
  }
  return [];
};

export const getAvailableExams = asyncHandler(async (req, res) => {
  const exams = await listCandidateExamsEnriched(req.user._id);
  res.json(exams);
});

export const getMyReports = asyncHandler(async (req, res) => {
  const reports = await Report.find({ candidateId: req.user._id }).sort({ createdAt: -1 });
  res.json(reports);
});

export const updateMyProfile = asyncHandler(async (req, res) => {
  const headline =
    typeof req.body.headline === "string" ? req.body.headline.trim().slice(0, 160) : "";

  const resumeUrl = stripResumeUrl(req.body.resumeUrl ?? "");
  if (resumeUrl.length > 2000) {
    throw new AppError("Resume URL is too long", 422);
  }
  if (resumeUrl && !/^https?:\/\/.+/i.test(resumeUrl)) {
    throw new AppError("Resume URL must start with http:// or https://", 422);
  }

  const skills = normalizeSkills(req.body.skills);
  if (skills.length > 30) {
    throw new AppError("You can save at most 30 skills", 422);
  }
  for (const skill of skills) {
    if (skill.length > 40) {
      throw new AppError("Each skill must be 40 characters or less", 422);
    }
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        "profile.headline": headline,
        "profile.resumeUrl": resumeUrl,
        "profile.skills": skills
      }
    },
    { new: true, runValidators: true }
  ).select("name email role profile createdAt");

  res.json({
    message: "Profile updated",
    profile: {
      name: user.name,
      email: user.email,
      headline: user.profile?.headline || "",
      skills: user.profile?.skills || [],
      resumeUrl: user.profile?.resumeUrl || "",
      memberSince: user.createdAt
    }
  });
});
