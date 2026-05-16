import { body, query } from "express-validator";

export const runCodingQuestionValidator = [
  body("questionId").isMongoId(),
  body("sourceCode").isString().isLength({ min: 1, max: 200_000 }),
  body("languageId").isInt({ min: 1 }),
  body("examId").optional({ values: "falsy" }).isMongoId(),
  body("language").optional({ values: "falsy" }).isString().isLength({ max: 64 })
];

export const submitCodingQuestionValidator = [
  body("questionId").isMongoId(),
  body("examId").isMongoId(),
  body("sourceCode").isString().isLength({ min: 1, max: 200_000 }),
  body("language").isString().isLength({ min: 1, max: 64 }),
  body("languageId").isInt({ min: 1 })
];

export const listCodingSubmissionsValidator = [
  query("questionId").optional().isMongoId(),
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 50 })
];

export const runPracticeCodingValidator = [
  body("sourceCode").isString().isLength({ min: 1, max: 200_000 }),
  body("languageId").isInt({ min: 1 }),
  body("cases").isArray({ min: 1, max: 12 }),
  body("cases.*.input").optional().isString().isLength({ max: 20_000 }),
  body("cases.*.expectedOutput").optional().isString().isLength({ max: 20_000 })
];
