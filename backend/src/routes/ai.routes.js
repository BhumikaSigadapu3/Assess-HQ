import { Router } from "express";
import { body, param } from "express-validator";
import {
  getWeakTopics,
  postInterviewInsights,
  postPerformancePrediction,
  postResumeAts
} from "../controllers/ai.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import { ROLES } from "../constants/roles.js";
import { validate } from "../middlewares/validate.middleware.js";

const router = Router();

const resumeValidator = [
  body("resumeText").isString().isLength({ min: 40, max: 50_000 }),
  body("jobDescription").optional().isString().isLength({ max: 25_000 }),
  body("targetRole").optional().isString().trim().isLength({ min: 2, max: 120 })
];

const interviewValidator = [
  body("transcript").isString().isLength({ min: 20, max: 30_000 }),
  body("durationSeconds").optional().isInt({ min: 0 })
];

const predictionValidator = [
  body("codingScore").isFloat({ min: 0, max: 100 }),
  body("mcqScore").isFloat({ min: 0, max: 100 }),
  body("suspiciousEvents").optional().isInt({ min: 0 })
];

router.post(
  "/resume/analyze",
  protect,
  authorize(ROLES.CANDIDATE, ROLES.RECRUITER, ROLES.ADMIN),
  resumeValidator,
  validate,
  postResumeAts
);

router.post(
  "/interview/analyze",
  protect,
  authorize(ROLES.RECRUITER, ROLES.ADMIN, ROLES.CANDIDATE),
  interviewValidator,
  validate,
  postInterviewInsights
);

router.post(
  "/performance/predict",
  protect,
  authorize(ROLES.RECRUITER, ROLES.ADMIN, ROLES.CANDIDATE),
  predictionValidator,
  validate,
  postPerformancePrediction
);

router.get(
  "/exams/:examId/weak-topics",
  protect,
  authorize(ROLES.CANDIDATE, ROLES.ADMIN),
  [param("examId").isMongoId()],
  validate,
  getWeakTopics
);

export default router;
