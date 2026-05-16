import User from "../models/User.js";
import Exam from "../models/Exam.js";
import Report from "../models/Report.js";
import Analytics from "../models/Analytics.js";
import Shortlist from "../models/Shortlist.js";
import Notification from "../models/Notification.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/appError.js";
import { ACCOUNT_STATUS, ROLES } from "../constants/roles.js";

export const getAdminDashboard = asyncHandler(async (_req, res) => {
  const [users, exams, reports, suspicious, pendingRecruiters] = await Promise.all([
    User.countDocuments(),
    Exam.countDocuments(),
    Report.countDocuments(),
    Report.countDocuments({ "suspiciousEvents.0": { $exists: true } }),
    User.countDocuments({
      role: ROLES.RECRUITER,
      accountStatus: ACCOUNT_STATUS.PENDING_APPROVAL
    })
  ]);

  const latestPlatformMetrics = await Analytics.find({ scope: "platform" })
    .sort({ capturedAt: -1 })
    .limit(10);

  res.json({
    stats: { users, exams, reports, suspicious, pendingRecruiters },
    latestPlatformMetrics
  });
});

export const listRecruiterApprovals = asyncHandler(async (req, res) => {
  const status = req.query.status || ACCOUNT_STATUS.PENDING_APPROVAL;
  const allowedStatuses = [
    ACCOUNT_STATUS.PENDING_APPROVAL,
    ACCOUNT_STATUS.ACTIVE,
    ACCOUNT_STATUS.REJECTED,
    ACCOUNT_STATUS.SUSPENDED
  ];

  if (!allowedStatuses.includes(status)) {
    throw new AppError("Invalid recruiter approval status", 400);
  }

  const recruiters = await User.find({
    role: ROLES.RECRUITER,
    accountStatus: status
  })
    .select("name email role accountStatus isEmailVerified recruiterApproval createdAt updatedAt")
    .populate("recruiterApproval.reviewedBy", "name email")
    .sort({ createdAt: -1 })
    .limit(100);

  res.json({ recruiters });
});

const updateRecruiterApproval = async ({ recruiterId, reviewerId, accountStatus, reason }) => {
  const recruiter = await User.findOneAndUpdate(
    {
      _id: recruiterId,
      role: ROLES.RECRUITER
    },
    {
      $set: {
        accountStatus,
        "recruiterApproval.reviewedAt": new Date(),
        "recruiterApproval.reviewedBy": reviewerId,
        "recruiterApproval.decisionReason": reason || ""
      }
    },
    {
      new: true,
      projection: "name email role accountStatus isEmailVerified recruiterApproval createdAt updatedAt"
    }
  );

  if (!recruiter) throw new AppError("Recruiter not found", 404);
  return recruiter;
};

export const approveRecruiter = asyncHandler(async (req, res) => {
  const recruiter = await updateRecruiterApproval({
    recruiterId: req.params.userId,
    reviewerId: req.user._id,
    accountStatus: ACCOUNT_STATUS.ACTIVE,
    reason: req.body.reason
  });

  res.json({
    message: "Recruiter approved successfully",
    recruiter
  });
});

export const rejectRecruiter = asyncHandler(async (req, res) => {
  const recruiter = await updateRecruiterApproval({
    recruiterId: req.params.userId,
    reviewerId: req.user._id,
    accountStatus: ACCOUNT_STATUS.REJECTED,
    reason: req.body.reason
  });

  res.json({
    message: "Recruiter rejected successfully",
    recruiter
  });
});

/** Shortlisted candidates with recruiter + exam for hire verification. */
export const listHiringPlacements = asyncHandler(async (_req, res) => {
  const placements = await Shortlist.find({})
    .sort({ createdAt: -1 })
    .limit(100)
    .populate("recruiterId", "name email accountStatus createdAt")
    .populate("candidateId", "name email accountStatus")
    .populate("examId", "title status endTime")
    .lean();
  res.json({ placements });
});

export const suspendRecruiterAccount = asyncHandler(async (req, res) => {
  const recruiter = await User.findOneAndUpdate(
    { _id: req.params.userId, role: ROLES.RECRUITER },
    {
      $set: {
        accountStatus: ACCOUNT_STATUS.SUSPENDED,
        "recruiterApproval.reviewedAt": new Date(),
        "recruiterApproval.reviewedBy": req.user._id,
        "recruiterApproval.decisionReason": String(req.body.reason || "").trim().slice(0, 500) || "Suspended by platform admin"
      }
    },
    { new: true, projection: "name email role accountStatus recruiterApproval" }
  );
  if (!recruiter) throw new AppError("Recruiter not found", 404);
  res.json({ message: "Recruiter account suspended", recruiter });
});

export const postRecruiterHiringNudge = asyncHandler(async (req, res) => {
  const recruiter = await User.findOne({ _id: req.params.userId, role: ROLES.RECRUITER }).select("_id").lean();
  if (!recruiter) throw new AppError("Recruiter not found", 404);
  const message =
    String(req.body.message || "").trim().slice(0, 800) ||
    "Platform admin: please confirm you have contacted the shortlisted candidate and shared formal next steps / offer details.";
  await Notification.create({
    userId: recruiter._id,
    type: "admin_hiring_nudge",
    title: "Action required: candidate onboarding",
    message,
    isRead: false,
    payload: {}
  });
  res.json({ message: "Notification sent to recruiter" });
});
