import { getCandidateDashboardAnalytics as getCandidateDashboardAnalyticsData } from "../modules/exam/candidateDashboardAnalytics.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getCandidateDashboardAnalytics = asyncHandler(async (req, res) => {
  const data = await getCandidateDashboardAnalyticsData({
    candidate: req.user,
    limit: req.query.limit
  });

  res.json(data);
});
