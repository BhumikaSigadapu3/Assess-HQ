import { body, param } from "express-validator";

export const examSessionParamValidator = [param("examId").isMongoId()];

export const examCodingRunValidator = [
  ...examSessionParamValidator,
  body("questionId").isMongoId(),
  body("sourceCode").isString().isLength({ min: 1, max: 200_000 }),
  body("languageId").isInt({ min: 1 }),
  body("language").optional({ values: "falsy" }).isString().isLength({ max: 64 })
];

export const saveExamAnswerValidator = [
  ...examSessionParamValidator,
  body("questionId").isMongoId(),
  body("selectedOption")
    .optional({ nullable: true })
    .custom((value) => value === null || value === undefined || typeof value === "string" || typeof value === "number")
    .withMessage("selectedOption must be a string, number, or null"),
  body("isMarkedForReview").optional({ nullable: true }).isBoolean(),
  body("timeSpentSeconds").optional({ nullable: true }).isInt({ min: 0 }),
  body("sectionKey").optional({ nullable: true }).isString()
];
