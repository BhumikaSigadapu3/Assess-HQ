import { Router } from "express";
import { body, param, query } from "express-validator";
import { addQuestion, createExam, createExamWithQuestions, getMyExams } from "../controllers/teacher.controller.js";
import { listExamAttemptsAnalytics } from "../controllers/teacher.exam.analytics.controller.js";
import {
  getRecruiterCandidates,
  getRecruiterDashboard,
  getRecruiterInterviews,
  getRecruiterQuestions,
  getRecruiterReports,
  patchRecruiterInterviewHandler,
  postGenerateRecruiterReport,
  postRecruiterInterview
} from "../controllers/recruiter.dashboard.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import { ROLES } from "../constants/roles.js";
import { validate } from "../middlewares/validate.middleware.js";
import { examSessionParamValidator } from "../validators/exam.validators.js";
import {
  getRecruiterExamCandidateProfile,
  getRecruiterExamLeaderboard,
  getRecruiterExamsSummary,
  getRecruiterHiringShortlist,
  getRecruiterExamDraftDetail,
  getRecruiterExamOverview,
  patchRecruiterExam,
  postRecruiterExamShortlist,
  putRecruiterExamDraftQuestions
} from "../controllers/recruiter.assessment.controller.js";

const router = Router();

const paginationValidator = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 })
];

const createExamValidator = [
  body("title").isString().trim().isLength({ min: 3, max: 160 }),
  body("description").optional({ nullable: true }).isString().trim().isLength({ max: 2000 }),
  body("durationMinutes").isInt({ min: 1, max: 480 }),
  body("startTime").optional({ nullable: true }).isISO8601(),
  body("endTime").optional({ nullable: true }).isISO8601(),
  body("registrationDeadline").optional({ nullable: true }).isISO8601(),
  body("questionIds").optional().isArray(),
  body("questionIds.*").optional().isMongoId(),
  body("sections").optional().isArray(),
  body("settings.shuffleQuestions").optional().isBoolean(),
  body("settings.shuffleOptions").optional().isBoolean(),
  body("settings.allowTabSwitch").optional().isBoolean(),
  body("settings.autoSubmit").optional().isBoolean(),
  body("settings.resumeEnabled").optional().isBoolean(),
  body("settings.negativeMarkingEnabled").optional().isBoolean(),
  body("settings.defaultNegativeMark").optional().isFloat({ min: 0, max: 100 }),
  body("status").optional().isIn(["draft", "scheduled", "active", "completed"])
];

const questionValidator = [
  body("examId").optional({ nullable: true }).isMongoId(),
  body("type").isIn(["mcq", "coding"]),
  body("title").isString().trim().isLength({ min: 3, max: 180 }),
  body("prompt").isString().trim().isLength({ min: 5, max: 20_000 }),
  body("difficulty").optional().isIn(["easy", "medium", "hard"]),
  body("sectionKey").optional({ nullable: true }).isString().trim().isLength({ max: 80 }),
  body("topics").optional().isArray({ max: 12 }),
  body("topics.*").optional().isString().trim().isLength({ min: 1, max: 60 }),
  body("marks").optional().isFloat({ min: 0, max: 100 }),
  body("negativeMark").optional().isFloat({ min: 0, max: 100 }),
  body("options").optional().isArray({ max: 12 }),
  body("starterCode").optional().isObject(),
  body("testCases").optional().isArray({ max: 30 }),
  body("supportedLanguages").optional().isArray({ max: 12 })
];

const interviewValidator = [
  body("candidateId").isMongoId(),
  body("examId").optional({ nullable: true }).isMongoId(),
  body("roundType").optional().isIn(["technical", "coding", "system_design", "hr", "culture"]),
  body("scheduledAt").isISO8601(),
  body("durationMinutes").optional().isInt({ min: 15, max: 240 }),
  body("meetingUrl").optional({ nullable: true }).isString().trim().isLength({ max: 2000 }),
  body("notes").optional({ nullable: true }).isString().trim().isLength({ max: 2000 })
];

const patchInterviewValidator = [
  param("interviewId").isMongoId(),
  body("status").optional().isIn(["scheduled", "completed", "cancelled", "no_show"]),
  body("outcome").optional({ nullable: true }).isIn(["shortlisted", "rejected"]),
  body("scheduledAt").optional().isISO8601(),
  body("durationMinutes").optional().isInt({ min: 15, max: 240 }),
  body("meetingUrl").optional({ nullable: true }).isString().trim().isLength({ max: 2000 }),
  body("notes").optional({ nullable: true }).isString().trim().isLength({ max: 2000 }),
  body("roundType").optional().isIn(["technical", "coding", "system_design", "hr", "culture"])
];

const examIdParam = [param("examId").isMongoId()];
const candidateIdParam = [param("candidateId").isMongoId()];

const patchExamValidator = [
  body("title").optional().isString().trim().isLength({ min: 3, max: 160 }),
  body("description").optional({ nullable: true }).isString().trim().isLength({ max: 2000 }),
  body("durationMinutes").optional().isInt({ min: 1, max: 480 }),
  body("startTime").optional({ nullable: true }).isISO8601(),
  body("endTime").optional({ nullable: true }).isISO8601(),
  body("registrationDeadline").optional({ nullable: true }).isISO8601(),
  body("status").optional().isIn(["draft", "scheduled", "active", "completed"]),
  body("maxInterviewRounds").optional().isInt({ min: 1, max: 20 }),
  body("settings").optional().isObject()
];

const shortlistBodyValidator = [body("candidateIds").isArray({ min: 1 }), body("candidateIds.*").isMongoId()];

const replaceDraftQuestionsValidator = [
  ...examIdParam,
  body("questionCounts").isObject(),
  body("questionCounts.mcq").isInt({ min: 0, max: 80 }),
  body("questionCounts.coding").isInt({ min: 0, max: 80 }),
  body("questions").isArray({ min: 1, max: 120 }),
  body("questionCounts").custom((value) => {
    const m = Number(value?.mcq ?? 0);
    const c = Number(value?.coding ?? 0);
    if (m + c < 1) throw new Error("At least one MCQ or coding question is required");
    return true;
  })
];

const composeExamValidator = [
  body("title").isString().trim().isLength({ min: 3, max: 160 }),
  body("description").optional({ nullable: true }).isString().trim().isLength({ max: 2000 }),
  body("durationMinutes").isInt({ min: 1, max: 480 }),
  body("startTime").optional({ nullable: true }).isISO8601(),
  body("endTime").optional({ nullable: true }).isISO8601(),
  body("registrationDeadline").optional({ nullable: true }).isISO8601(),
  body("status").optional().isIn(["draft", "scheduled", "active", "completed"]),
  body("questionCounts").isObject(),
  body("questionCounts.mcq").isInt({ min: 0, max: 80 }),
  body("questionCounts.coding").isInt({ min: 0, max: 80 }),
  body("questionCounts").custom((value) => {
    const m = Number(value?.mcq ?? 0);
    const c = Number(value?.coding ?? 0);
    if (m + c < 1) throw new Error("At least one MCQ or coding question is required");
    return true;
  }),
  body("questions").isArray({ min: 1, max: 120 }),
  body("maxInterviewRounds").optional().isInt({ min: 1, max: 20 }),
  body("settings").optional().isObject()
];

const reportGenerationValidator = [body("examId").isMongoId(), body("candidateId").isMongoId()];

router.use(protect, authorize(ROLES.RECRUITER, ROLES.ADMIN));
router.get("/dashboard/analytics", [query("limit").optional().isInt({ min: 5, max: 20 })], validate, getRecruiterDashboard);
router.get("/candidates", paginationValidator, validate, getRecruiterCandidates);
router.get(
  "/questions",
  [
    ...paginationValidator,
    query("type").optional().isIn(["mcq", "coding"]),
    query("difficulty").optional().isIn(["easy", "medium", "hard"]),
    query("search").optional().isString().trim().isLength({ max: 120 })
  ],
  validate,
  getRecruiterQuestions
);
router.get("/reports", paginationValidator, validate, getRecruiterReports);
router.post("/reports/generate", reportGenerationValidator, validate, postGenerateRecruiterReport);
router.get(
  "/interviews",
  [...paginationValidator, query("status").optional().isIn(["scheduled", "completed", "cancelled", "no_show"])],
  validate,
  getRecruiterInterviews
);
router.post("/interviews", interviewValidator, validate, postRecruiterInterview);
router.patch("/interviews/:interviewId", patchInterviewValidator, validate, patchRecruiterInterviewHandler);
router.get("/hiring/shortlist", getRecruiterHiringShortlist);
router.get("/exams/summary", getRecruiterExamsSummary);
router.get("/exams/:examId/overview", examIdParam, validate, getRecruiterExamOverview);
router.get("/exams/:examId/draft", examIdParam, validate, getRecruiterExamDraftDetail);
router.put(
  "/exams/:examId/draft/questions",
  replaceDraftQuestionsValidator,
  validate,
  putRecruiterExamDraftQuestions
);
router.patch("/exams/:examId", examIdParam, patchExamValidator, validate, patchRecruiterExam);
router.get(
  "/exams/:examId/candidates/:candidateId/profile",
  [...examIdParam, ...candidateIdParam],
  validate,
  getRecruiterExamCandidateProfile
);
router.get(
  "/exams/:examId/leaderboard",
  [...examIdParam, query("sort").optional().isIn(["score", "name", "activity"]), query("order").optional().isIn(["asc", "desc"])],
  validate,
  getRecruiterExamLeaderboard
);
router.post("/exams/:examId/shortlist", examIdParam, shortlistBodyValidator, validate, postRecruiterExamShortlist);
router.post("/exams/compose", composeExamValidator, validate, createExamWithQuestions);
router.post("/exams", createExamValidator, validate, createExam);
router.get("/exams", getMyExams);
router.get("/exams/:examId/analytics", examSessionParamValidator, validate, listExamAttemptsAnalytics);
router.post("/questions", questionValidator, validate, addQuestion);

export default router;
