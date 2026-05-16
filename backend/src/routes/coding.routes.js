import { Router } from "express";
import {
  listMyCodingSubmissions,
  runCode,
  runCodingQuestion,
  runPracticeCodingSuite,
  submitCodingQuestionHandler
} from "../controllers/coding.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import { ROLES } from "../constants/roles.js";
import { validate } from "../middlewares/validate.middleware.js";
import { codingLimiter } from "../middlewares/rateLimiters.js";
import {
  listCodingSubmissionsValidator,
  runCodingQuestionValidator,
  runPracticeCodingValidator,
  submitCodingQuestionValidator
} from "../validators/coding.validators.js";
import { body } from "express-validator";

const router = Router();

const runSnippetValidator = [
  body("sourceCode").isString().isLength({ min: 1, max: 100_000 }),
  body("languageId").isInt({ min: 1 }),
  body("stdin").optional().isString()
];

router.post(
  "/run",
  codingLimiter,
  protect,
  authorize(ROLES.CANDIDATE, ROLES.RECRUITER, ROLES.ADMIN),
  runSnippetValidator,
  validate,
  runCode
);

router.post(
  "/practice/run",
  codingLimiter,
  protect,
  authorize(ROLES.CANDIDATE, ROLES.RECRUITER, ROLES.ADMIN),
  runPracticeCodingValidator,
  validate,
  runPracticeCodingSuite
);

router.post(
  "/questions/run",
  codingLimiter,
  protect,
  authorize(ROLES.CANDIDATE, ROLES.RECRUITER, ROLES.ADMIN),
  runCodingQuestionValidator,
  validate,
  runCodingQuestion
);

router.post(
  "/questions/submit",
  codingLimiter,
  protect,
  authorize(ROLES.CANDIDATE, ROLES.RECRUITER, ROLES.ADMIN),
  submitCodingQuestionValidator,
  validate,
  submitCodingQuestionHandler
);

router.get(
  "/submissions",
  protect,
  authorize(ROLES.CANDIDATE, ROLES.RECRUITER, ROLES.ADMIN),
  listCodingSubmissionsValidator,
  validate,
  listMyCodingSubmissions
);

export default router;
