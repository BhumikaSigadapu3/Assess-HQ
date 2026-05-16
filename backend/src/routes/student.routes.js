import { Router } from "express";
import { body, query } from "express-validator";
import { getAvailableExams, getMyReports, updateMyProfile } from "../controllers/student.controller.js";
import { getCandidateDashboardAnalytics } from "../controllers/student.analytics.controller.js";
import {
  getExamSession,
  getExamResult,
  saveExamAnswer,
  submitExam,
  postRegisterForExam,
  getExamLeaderboardCandidate,
  runExamCoding
} from "../controllers/student.exam.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import { ROLES } from "../constants/roles.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  examCodingRunValidator,
  examSessionParamValidator,
  saveExamAnswerValidator
} from "../validators/exam.validators.js";
import { codingLimiter } from "../middlewares/rateLimiters.js";

const router = Router();

/** Loose types only — rules live in updateMyProfile. Avoid `skills.*` on comma strings (validates per-character and fails on spaces). */
const profileValidator = [
  body("headline").optional({ nullable: true }).isString().isLength({ max: 160 }),
  body("resumeUrl").optional({ nullable: true }).isString().isLength({ max: 2000 }),
  body("skills").optional({ nullable: true })
];

router.use(protect, authorize(ROLES.CANDIDATE, ROLES.ADMIN));
router.get(
  "/dashboard/analytics",
  [query("limit").optional().isInt({ min: 3, max: 12 })],
  validate,
  getCandidateDashboardAnalytics
);
router.patch("/profile", profileValidator, validate, updateMyProfile);
router.get("/exams", getAvailableExams);
router.post("/exams/:examId/register", examSessionParamValidator, validate, postRegisterForExam);
router.get("/exams/:examId/leaderboard", examSessionParamValidator, validate, getExamLeaderboardCandidate);
router.get("/exams/:examId/session", examSessionParamValidator, validate, getExamSession);
router.get("/exams/:examId/result", examSessionParamValidator, validate, getExamResult);
router.post("/exams/:examId/answers", saveExamAnswerValidator, validate, saveExamAnswer);
router.post("/exams/:examId/coding/run", codingLimiter, examCodingRunValidator, validate, runExamCoding);
router.post("/exams/:examId/submit", examSessionParamValidator, validate, submitExam);
router.get("/reports", getMyReports);

export default router;
