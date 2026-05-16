import mongoose from "mongoose";
import Exam from "../../models/Exam.js";
import ExamAttempt from "../../models/ExamAttempt.js";
import ExamRegistration from "../../models/ExamRegistration.js";
import User from "../../models/User.js";
import { AppError } from "../../utils/appError.js";
import { bustActiveExamCache } from "../recruiter/recruiterAssessment.service.js";

const COMPLETED = ["submitted", "auto_submitted"];
const toObjectId = (value) => new mongoose.Types.ObjectId(String(value));

const round = (value, digits = 1) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  const factor = 10 ** digits;
  return Math.round(numeric * factor) / factor;
};

const attemptScorePercent = (att) => {
  const maxS = Number(att.analytics?.maxScore) || 0;
  const sc = Number(att.analytics?.score) || 0;
  if (!maxS) return 0;
  return round((sc / maxS) * 100);
};

export const registerCandidateForExam = async ({ examId, candidateId }) => {
  const exam = await Exam.findById(examId).lean();
  if (!exam) throw new AppError("Assessment not found", 404);
  if (!["scheduled", "active"].includes(exam.status)) {
    throw new AppError("Assessment is not open for registration", 400);
  }
  const now = new Date();
  if (exam.registrationDeadline && now > new Date(exam.registrationDeadline)) {
    throw new AppError("Registration deadline has passed", 400);
  }
  if (exam.endTime && now > new Date(exam.endTime)) {
    throw new AppError("This assessment has ended", 400);
  }
  const user = await User.findById(candidateId).select("profile").lean();
  const resume = user?.profile?.resumeUrl?.trim();
  const skills = user?.profile?.skills || [];
  if (!resume) throw new AppError("Upload or set a resume before registering", 400);
  if (!skills.length) throw new AppError("Add at least one skill before registering", 400);

  try {
    await ExamRegistration.create({ examId: toObjectId(examId), candidateId: toObjectId(candidateId) });
  } catch (e) {
    if (e && e.code === 11000) throw new AppError("Already registered for this assessment", 409);
    throw e;
  }
  await bustActiveExamCache();
  return { registered: true, examId: String(examId) };
};

export const listCandidateExamsEnriched = async (candidateId) => {
  const cid = toObjectId(candidateId);
  const now = new Date();
  const exams = await Exam.find({
    status: { $in: ["scheduled", "active", "completed"] }
  })
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 })
    .lean();

  const examIds = exams.map((e) => e._id);
  const [regs, attempts] = await Promise.all([
    ExamRegistration.find({ candidateId: cid, examId: { $in: examIds } }).select("examId").lean(),
    ExamAttempt.find({ candidateId: cid, examId: { $in: examIds } })
      .select("examId status analytics submittedAt updatedAt")
      .lean()
  ]);
  const regSet = new Set(regs.map((r) => String(r.examId)));
  const attemptByExam = new Map();
  for (const a of attempts) {
    const eid = String(a.examId);
    const prev = attemptByExam.get(eid);
    if (!prev || new Date(a.updatedAt || a.submittedAt || 0) > new Date(prev.updatedAt || prev.submittedAt || 0)) {
      attemptByExam.set(eid, a);
    }
  }

  return exams.map((exam) => {
    const regDeadline = exam.registrationDeadline ? new Date(exam.registrationDeadline) : null;
    const ended = exam.status === "completed" || (exam.endTime && now > new Date(exam.endTime));
    const registrationOpen =
      !ended &&
      ["scheduled", "active"].includes(exam.status) &&
      (!regDeadline || Number.isNaN(regDeadline.getTime()) || now <= regDeadline);
    const saasStatus = ended ? "COMPLETED" : "ACTIVE";

    const att = attemptByExam.get(String(exam._id));
    const completed = att && COMPLETED.includes(att.status);
    const scorePercent = completed ? attemptScorePercent(att) : null;

    return {
      _id: exam._id,
      title: exam.title,
      description: exam.description || "",
      durationMinutes: exam.durationMinutes,
      status: exam.status,
      startTime: exam.startTime,
      endTime: exam.endTime,
      registrationDeadline: exam.registrationDeadline,
      maxInterviewRounds: exam.maxInterviewRounds ?? 3,
      createdBy: exam.createdBy
        ? { name: exam.createdBy.name || "", email: exam.createdBy.email || "" }
        : { name: "", email: "" },
      registered: regSet.has(String(exam._id)),
      registrationOpen: Boolean(registrationOpen && !ended),
      saasStatus: ended ? "COMPLETED" : "ACTIVE",
      attempt: att
        ? {
            status: att.status,
            scorePercent,
            submittedAt: att.submittedAt
          }
        : null
    };
  });
};

export const getCandidateExamLeaderboardView = async ({ examId, viewerCandidateId }) => {
  const exam = await Exam.findById(examId).select("title status").lean();
  if (!exam) throw new AppError("Assessment not found", 404);
  if (!["scheduled", "active", "completed"].includes(exam.status)) {
    throw new AppError("Leaderboard is not available", 403);
  }

  const examOid = toObjectId(examId);
  const attempts = await ExamAttempt.find({ examId: examOid, status: { $in: COMPLETED } })
    .populate("candidateId", "name")
    .sort({ submittedAt: -1 })
    .lean();

  const best = new Map();
  for (const att of attempts) {
    const cand = att.candidateId;
    const cid = String(cand?._id || att.candidateId);
    if (!cand || typeof cand === "string") continue;
    const pct = attemptScorePercent(att);
    const prev = best.get(cid);
    if (!prev || pct > prev.score) {
      best.set(cid, { candidateId: cid, name: cand.name || "Candidate", score: pct });
    }
  }

  const sorted = [...best.values()].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  const entries = sorted.map((row, idx) => ({
    rank: idx + 1,
    name: row.name,
    score: row.score,
    candidateId: row.candidateId,
    isViewer: String(viewerCandidateId) === String(row.candidateId)
  }));

  const viewerEntry = entries.find((e) => e.isViewer) || null;

  return {
    exam: { _id: exam._id, title: exam.title, status: exam.status },
    entries,
    viewerRank: viewerEntry?.rank ?? null,
    viewerScore: viewerEntry?.score ?? null
  };
};
