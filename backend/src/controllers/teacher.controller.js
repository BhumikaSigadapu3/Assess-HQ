import Exam from "../models/Exam.js";
import Question from "../models/Question.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/appError.js";
import { cacheDel } from "../modules/cache/cache.service.js";
import { createExamWithQuestionsForRecruiter } from "../modules/recruiter/teacherExamCompose.service.js";

const bustExamListCache = async () => {
  await cacheDel("cache:exams:active:v1");
};

export const createExam = asyncHandler(async (req, res) => {
  const exam = await Exam.create({ ...req.body, createdBy: req.user._id });
  await bustExamListCache();
  res.status(201).json(exam);
});

export const createExamWithQuestions = asyncHandler(async (req, res) => {
  const exam = await createExamWithQuestionsForRecruiter({
    recruiterId: req.user._id,
    payload: req.body
  });
  res.status(201).json(exam);
});

export const addQuestion = asyncHandler(async (req, res) => {
  if (req.body.examId) {
    const exam = await Exam.findOne({ _id: req.body.examId, createdBy: req.user._id }).select("_id").lean();
    if (!exam) throw new AppError("Assessment not found", 404);
  }
  const question = await Question.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json(question);
});

export const getMyExams = asyncHandler(async (req, res) => {
  const exams = await Exam.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
  res.json(exams);
});
