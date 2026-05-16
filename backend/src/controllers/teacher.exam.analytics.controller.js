import { asyncHandler } from "../utils/asyncHandler.js";
import { getExamAttemptsSummary } from "../modules/exam/examAnalytics.service.js";

export const listExamAttemptsAnalytics = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  const data = await getExamAttemptsSummary({
    examId: req.params.examId,
    recruiterId: req.user._id,
    page,
    limit
  });
  res.json(data);
});
