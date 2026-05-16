import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getCandidateDashboardAnalytics } from "../exam/candidateDashboardApi.js";

const CandidateDashboardContext = createContext(null);

export const formatPercent = (value, empty = "No data") => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return empty;
  return `${Number(value).toFixed(1)}%`;
};

export const formatDateTime = (value) => {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
};

export const getScoreTone = (score = 0) => {
  if (Number(score) >= 75) return "emerald";
  if (Number(score) >= 50) return "amber";
  return "rose";
};

const normalizeTopic = (topic) => {
  if (!topic) return "General";
  return String(topic)
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
};

const buildSkillRadar = (dashboard) => {
  const weakTopics = dashboard?.assessments?.weakTopics || [];
  const difficulty = dashboard?.assessments?.difficultyBreakdown || [];
  const coding = dashboard?.coding || {};
  const metrics = dashboard?.metrics || {};

  const topicRows = weakTopics.slice(0, 4).map((topic) => ({
    skill: normalizeTopic(topic.topic),
    score: Math.max(0, Math.min(100, Number(topic.accuracy) || 0))
  }));

  const difficultyRows = difficulty.slice(0, 3).map((row) => ({
    skill: normalizeTopic(row.difficulty),
    score: Math.max(0, Math.min(100, Number(row.accuracy) || 0))
  }));

  const coreRows = [
    { skill: "Coding", score: Number(coding.averageScore) || 0 },
    { skill: "Assessments", score: Number(metrics.averageScore) || 0 },
    { skill: "AI Readiness", score: Number(metrics.aiSkillScore) || 0 }
  ].filter((row) => row.score > 0);

  return [...topicRows, ...difficultyRows, ...coreRows].slice(0, 7);
};

const buildActivityFeed = (dashboard) => {
  const submissions = (dashboard?.coding?.recentSubmissions || []).map((item) => ({
    id: `coding-${item.id}`,
    type: "Coding",
    title: item.questionTitle || "Coding submission",
    description: `${item.language || "Code"} submission scored ${formatPercent(item.score, "0%")}`,
    timestamp: item.createdAt
  }));

  const scores = (dashboard?.assessments?.recentScores || []).map((item) => ({
    id: `score-${item.id}`,
    type: "Assessment",
    title: item.examTitle || "Assessment completed",
    description: `Submitted with ${formatPercent(item.scorePercent, "0%")} score`,
    timestamp: item.submittedAt
  }));

  const notifications = (dashboard?.notifications?.latest || []).map((item) => ({
    id: `notification-${item._id}`,
    type: "Notification",
    title: item.title || item.type || "Notification",
    description: item.message || "Platform update",
    timestamp: item.createdAt
  }));

  return [...submissions, ...scores, ...notifications]
    .filter((item) => item.timestamp)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 8);
};

const buildAiInsights = (dashboard) => {
  const weakTopic = dashboard?.assessments?.weakTopics?.[0];
  const interview = dashboard?.interviews || {};
  const coding = dashboard?.coding || {};
  const insights = [];

  if (weakTopic) {
    insights.push({
      title: `Improve ${normalizeTopic(weakTopic.topic)} pattern recognition`,
      description: `Accuracy is ${formatPercent(weakTopic.accuracy, "0%")} across ${weakTopic.attempted || 0} attempted item${
        weakTopic.attempted === 1 ? "" : "s"
      }.`,
      tone: "rose"
    });
  }

  if (interview.count) {
    insights.push({
      title: "Communication signal available",
      description: `Average communication score is ${formatPercent(interview.averageCommunicationScore, "0%")}.`,
      tone: "sky"
    });
  }

  if (coding.totalSubmissions) {
    insights.push({
      title: "Coding execution trend",
      description: `Accepted rate is ${formatPercent(coding.acceptanceRate, "0%")} with a ${coding.streakDays || 0}-day active streak.`,
      tone: "emerald"
    });
  }

  if (!insights.length) {
    insights.push({
      title: "Start generating readiness signals",
      description: "Complete assessments, submit coding problems, or run AI analysis to unlock personalized insights.",
      tone: "brand"
    });
  }

  return insights;
};

const buildContestTrend = (dashboard) => {
  const trend = dashboard?.assessments?.scoreTrend || [];
  return trend.map((item, index) => ({
    name: item.examTitle || `Round ${index + 1}`,
    rating: Math.round(1200 + (Number(item.scorePercent) || 0) * 8),
    score: Number(item.scorePercent) || 0
  }));
};

export function CandidateDashboardProvider({ children }) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshDashboard = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await getCandidateDashboardAnalytics({ limit: 10 });
      setDashboard(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load candidate analytics");
      throw err;
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshDashboard().catch(() => {});
  }, [refreshDashboard]);

  const value = useMemo(
    () => ({
      dashboard,
      loading,
      error,
      metrics: dashboard?.metrics || {},
      profile: dashboard?.profile || {},
      assessments: dashboard?.assessments || {},
      coding: dashboard?.coding || {},
      interviews: dashboard?.interviews || {},
      notifications: dashboard?.notifications || {},
      recommendations: dashboard?.recommendations || [],
      skillRadar: buildSkillRadar(dashboard),
      activityFeed: buildActivityFeed(dashboard),
      aiInsights: buildAiInsights(dashboard),
      contestTrend: buildContestTrend(dashboard),
      refreshDashboard
    }),
    [dashboard, error, loading, refreshDashboard]
  );

  return <CandidateDashboardContext.Provider value={value}>{children}</CandidateDashboardContext.Provider>;
}

export const useCandidateDashboard = () => {
  const context = useContext(CandidateDashboardContext);
  if (!context) {
    throw new Error("useCandidateDashboard must be used inside CandidateDashboardProvider");
  }
  return context;
};

/** Same context when inside CandidateDashboardProvider; otherwise `null` (e.g. recruiter shell). */
export const useOptionalCandidateDashboard = () => useContext(CandidateDashboardContext);
