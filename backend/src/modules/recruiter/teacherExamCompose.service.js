import mongoose from "mongoose";
import Exam from "../../models/Exam.js";
import Question from "../../models/Question.js";
import ExamAttempt from "../../models/ExamAttempt.js";
import { AppError } from "../../utils/appError.js";
import { cacheDel } from "../cache/cache.service.js";

const ACTIVE_EXAMS_CACHE_KEY = "cache:exams:active:v1";

export const normalizeTopics = (topics) => {
  if (typeof topics === "string") {
    return [...new Set(topics.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 12);
  }
  if (!Array.isArray(topics)) return [];
  return [...new Set(topics.map((t) => String(t).trim().toLowerCase()).filter(Boolean))].slice(0, 12);
};

export const buildStarterMap = (q) => {
  if (q.starterCode && typeof q.starterCode === "object" && !Array.isArray(q.starterCode)) {
    return new Map(
      Object.entries(q.starterCode).map(([lang, code]) => [String(lang).toLowerCase(), String(code ?? "")])
    );
  }
  const lang = String(q.starterLanguage || "python").toLowerCase();
  const code = String(q.starterCodeText ?? q.starterCode ?? "");
  if (!code.trim()) return new Map();
  return new Map([[lang, code]]);
};

export const validateMcqPayload = (q) => {
  const options = (q.options || [])
    .map((o, idx) => ({
      label: String(o.label || String.fromCharCode(65 + idx)).trim().slice(0, 4),
      value: String(o.value ?? "").trim(),
      isCorrect: Boolean(o.isCorrect)
    }))
    .filter((o) => o.value.length > 0);
  if (options.length < 2) throw new AppError("Each MCQ needs at least two non-empty options", 400);
  const correct = options.filter((o) => o.isCorrect);
  if (correct.length !== 1) throw new AppError("Each MCQ must have exactly one correct option", 400);
  return options;
};

export const validateCodingTestCases = (q) => {
  const raw = Array.isArray(q.testCases) ? q.testCases : [];
  const testCases = raw.slice(0, 30).map((tc) => ({
    input: tc.input != null ? String(tc.input) : "",
    expectedOutput: tc.expectedOutput != null ? String(tc.expectedOutput) : "",
    isHidden: tc.isHidden === true,
    weight: Math.max(1, Number(tc.weight ?? 1))
  }));
  if (testCases.length < 2) {
    throw new AppError("Each coding question needs at least two test cases (one sample + hidden cases)", 400);
  }
  const visible = testCases.filter((tc) => !tc.isHidden);
  const hidden = testCases.filter((tc) => tc.isHidden);
  if (visible.length !== 1) {
    throw new AppError("Each coding question must have exactly one visible (sample) test case", 400);
  }
  if (hidden.length < 1) {
    throw new AppError("Each coding question must have at least one hidden test case", 400);
  }
  return testCases;
};

/**
 * Atomically creates an exam and all attached questions (MCQ + coding) in order on exam.questionIds.
 */
export const createExamWithQuestionsForRecruiter = async ({ recruiterId, payload }) => {
  const recruiterObjectId = new mongoose.Types.ObjectId(String(recruiterId));
  const mcqCount = Number(payload?.questionCounts?.mcq ?? 0);
  const codingCount = Number(payload?.questionCounts?.coding ?? 0);
  if (!Number.isInteger(mcqCount) || !Number.isInteger(codingCount) || mcqCount < 0 || codingCount < 0) {
    throw new AppError("questionCounts.mcq and questionCounts.coding must be non-negative integers", 400);
  }
  if (mcqCount + codingCount < 1) throw new AppError("Add at least one question (MCQ or coding)", 400);
  if (mcqCount + codingCount > 100) throw new AppError("Too many questions (max 100)", 400);

  const questions = payload.questions;
  if (!Array.isArray(questions) || questions.length !== mcqCount + codingCount) {
    throw new AppError(`Provide exactly ${mcqCount + codingCount} question object(s) in questions[]`, 400);
  }

  let mcqSeen = 0;
  let codingSeen = 0;
  for (const q of questions) {
    if (q.type === "mcq") mcqSeen += 1;
    else if (q.type === "coding") codingSeen += 1;
    else throw new AppError('Each question needs type "mcq" or "coding"', 400);
  }
  if (mcqSeen !== mcqCount || codingSeen !== codingCount) {
    throw new AppError(`questions[] must contain ${mcqCount} MCQ and ${codingCount} coding item(s) (check type field)`, 400);
  }

  const title = String(payload.title || "").trim();
  if (title.length < 3) throw new AppError("Title is required (min 3 characters)", 400);
  const durationMinutes = Number(payload.durationMinutes);
  if (!Number.isFinite(durationMinutes) || durationMinutes < 1 || durationMinutes > 480) {
    throw new AppError("durationMinutes must be between 1 and 480", 400);
  }

  const settings = {
    shuffleQuestions: payload.settings?.shuffleQuestions !== false,
    shuffleOptions: Boolean(payload.settings?.shuffleOptions),
    allowTabSwitch: Boolean(payload.settings?.allowTabSwitch),
    autoSubmit: payload.settings?.autoSubmit !== false,
    resumeEnabled: payload.settings?.resumeEnabled !== false,
    negativeMarkingEnabled: Boolean(payload.settings?.negativeMarkingEnabled),
    defaultNegativeMark: Number(payload.settings?.defaultNegativeMark ?? 0)
  };

  const maxInterviewRounds = Math.min(20, Math.max(1, Number(payload.maxInterviewRounds ?? 3)));

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const [examDoc] = await Exam.create(
      [
        {
          title,
          description: payload.description != null ? String(payload.description) : "",
          durationMinutes,
          startTime: payload.startTime || null,
          endTime: payload.endTime || null,
          registrationDeadline: payload.registrationDeadline ? new Date(payload.registrationDeadline) : null,
          status: "draft",
          settings,
          questionIds: [],
          sections: [],
          createdBy: recruiterObjectId,
          maxInterviewRounds
        }
      ],
      { session }
    );

    const questionIds = [];

    for (const q of questions) {
      const qTitle = String(q.title || "").trim();
      if (qTitle.length < 3) throw new AppError("Each question title must be at least 3 characters", 400);

      if (q.type === "mcq") {
        const options = validateMcqPayload(q);
        const [created] = await Question.create(
          [
            {
              examId: examDoc._id,
              createdBy: recruiterObjectId,
              type: "mcq",
              title: qTitle.slice(0, 180),
              prompt: (() => {
                const p = String(q.prompt || "").trim();
                if (p.length < 5) throw new AppError("Each MCQ prompt must be at least 5 characters", 400);
                return p;
              })(),
              difficulty: ["easy", "medium", "hard"].includes(q.difficulty) ? q.difficulty : "medium",
              topics: normalizeTopics(q.topics),
              marks: Math.min(100, Math.max(0, Number(q.marks ?? 1))),
              negativeMark: Math.min(100, Math.max(0, Number(q.negativeMark ?? 0))),
              options
            }
          ],
          { session }
        );
        questionIds.push(created._id);
      } else {
        const supportedLanguages =
          Array.isArray(q.supportedLanguages) && q.supportedLanguages.length > 0
            ? q.supportedLanguages.map((l) => String(l).toLowerCase()).slice(0, 12)
            : ["javascript", "python", "java", "cpp"];

        const testCases = validateCodingTestCases(q);
        const starterMap = buildStarterMap(q);

        const [created] = await Question.create(
          [
            {
              examId: examDoc._id,
              createdBy: recruiterObjectId,
              type: "coding",
              title: qTitle.slice(0, 180),
              prompt: (() => {
                const p = String(q.prompt || "").trim();
                if (p.length < 5) throw new AppError("Each coding prompt must be at least 5 characters", 400);
                return p;
              })(),
              difficulty: ["easy", "medium", "hard"].includes(q.difficulty) ? q.difficulty : "medium",
              topics: normalizeTopics(q.topics),
              marks: Math.min(100, Math.max(0, Number(q.marks ?? 1))),
              negativeMark: Math.min(100, Math.max(0, Number(q.negativeMark ?? 0))),
              supportedLanguages,
              starterCode: starterMap.size ? starterMap : new Map([["python", ""]]),
              testCases
            }
          ],
          { session }
        );
        questionIds.push(created._id);
      }
    }

    await Exam.updateOne({ _id: examDoc._id }, { $set: { questionIds } }, { session });
    await session.commitTransaction();
    await cacheDel(ACTIVE_EXAMS_CACHE_KEY);

    return Exam.findById(examDoc._id).lean();
  } catch (err) {
    await session.abortTransaction();
    if (err instanceof AppError) throw err;
    throw err;
  } finally {
    session.endSession();
  }
};

const validateComposeQuestionPayload = (payload) => {
  const mcqCount = Number(payload?.questionCounts?.mcq ?? 0);
  const codingCount = Number(payload?.questionCounts?.coding ?? 0);
  if (!Number.isInteger(mcqCount) || !Number.isInteger(codingCount) || mcqCount < 0 || codingCount < 0) {
    throw new AppError("questionCounts.mcq and questionCounts.coding must be non-negative integers", 400);
  }
  if (mcqCount + codingCount < 1) throw new AppError("Add at least one question (MCQ or coding)", 400);
  if (mcqCount + codingCount > 100) throw new AppError("Too many questions (max 100)", 400);

  const questions = payload.questions;
  if (!Array.isArray(questions) || questions.length !== mcqCount + codingCount) {
    throw new AppError(`Provide exactly ${mcqCount + codingCount} question object(s) in questions[]`, 400);
  }

  let mcqSeen = 0;
  let codingSeen = 0;
  for (const q of questions) {
    if (q.type === "mcq") mcqSeen += 1;
    else if (q.type === "coding") codingSeen += 1;
    else throw new AppError('Each question needs type "mcq" or "coding"', 400);
  }
  if (mcqSeen !== mcqCount || codingSeen !== codingCount) {
    throw new AppError(`questions[] must contain ${mcqCount} MCQ and ${codingCount} coding item(s) (check type field)`, 400);
  }
  return questions;
};

export const replaceRecruiterDraftExamQuestions = async ({ recruiterId, examId, payload }) => {
  const recruiterObjectId = new mongoose.Types.ObjectId(String(recruiterId));
  const examObjectId = new mongoose.Types.ObjectId(String(examId));
  const questions = validateComposeQuestionPayload(payload);

  const exam = await Exam.findOne({ _id: examObjectId, createdBy: recruiterObjectId, status: "draft" });
  if (!exam) throw new AppError("Draft assessment not found", 404);

  const attempts = await ExamAttempt.countDocuments({ examId: examObjectId });
  if (attempts > 0) {
    throw new AppError("Cannot replace questions after attempts exist for this assessment", 403);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await Question.deleteMany({ examId: examObjectId }, { session });

    const questionIds = [];

    for (const q of questions) {
      const qTitle = String(q.title || "").trim();
      if (qTitle.length < 3) throw new AppError("Each question title must be at least 3 characters", 400);

      if (q.type === "mcq") {
        const options = validateMcqPayload(q);
        const [created] = await Question.create(
          [
            {
              examId: examObjectId,
              createdBy: recruiterObjectId,
              type: "mcq",
              title: qTitle.slice(0, 180),
              prompt: (() => {
                const p = String(q.prompt || "").trim();
                if (p.length < 5) throw new AppError("Each MCQ prompt must be at least 5 characters", 400);
                return p;
              })(),
              difficulty: ["easy", "medium", "hard"].includes(q.difficulty) ? q.difficulty : "medium",
              topics: normalizeTopics(q.topics),
              marks: Math.min(100, Math.max(0, Number(q.marks ?? 1))),
              negativeMark: Math.min(100, Math.max(0, Number(q.negativeMark ?? 0))),
              options
            }
          ],
          { session }
        );
        questionIds.push(created._id);
      } else {
        const supportedLanguages =
          Array.isArray(q.supportedLanguages) && q.supportedLanguages.length > 0
            ? q.supportedLanguages.map((l) => String(l).toLowerCase()).slice(0, 12)
            : ["javascript", "python", "java", "cpp"];

        const testCases = validateCodingTestCases(q);
        const starterMap = buildStarterMap(q);

        const [created] = await Question.create(
          [
            {
              examId: examObjectId,
              createdBy: recruiterObjectId,
              type: "coding",
              title: qTitle.slice(0, 180),
              prompt: (() => {
                const p = String(q.prompt || "").trim();
                if (p.length < 5) throw new AppError("Each coding prompt must be at least 5 characters", 400);
                return p;
              })(),
              difficulty: ["easy", "medium", "hard"].includes(q.difficulty) ? q.difficulty : "medium",
              topics: normalizeTopics(q.topics),
              marks: Math.min(100, Math.max(0, Number(q.marks ?? 1))),
              negativeMark: Math.min(100, Math.max(0, Number(q.negativeMark ?? 0))),
              supportedLanguages,
              starterCode: starterMap.size ? starterMap : new Map([["python", ""]]),
              testCases
            }
          ],
          { session }
        );
        questionIds.push(created._id);
      }
    }

    await Exam.updateOne({ _id: examObjectId }, { $set: { questionIds, sections: [] } }, { session });
    await session.commitTransaction();
    await cacheDel(ACTIVE_EXAMS_CACHE_KEY);

    return Exam.findById(examObjectId).lean();
  } catch (err) {
    await session.abortTransaction();
    if (err instanceof AppError) throw err;
    throw err;
  } finally {
    session.endSession();
  }
};
