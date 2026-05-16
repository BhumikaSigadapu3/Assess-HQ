import apiClient from "../../services/apiClient.js";

export const getCandidateDashboardAnalytics = async (params = {}) => {
  const { data } = await apiClient.get("/candidate/dashboard/analytics", { params });
  return data;
};

export const updateCandidateProfile = async (payload) => {
  const { data } = await apiClient.patch("/candidate/profile", payload);
  return data;
};

export const registerForAssessment = async (examId) => {
  const { data } = await apiClient.post(`/candidate/exams/${examId}/register`);
  return data;
};

export const getCandidateExamLeaderboard = async (examId) => {
  const { data } = await apiClient.get(`/candidate/exams/${examId}/leaderboard`);
  return data;
};

export const fetchCandidateExamsCatalog = async () => {
  const { data } = await apiClient.get("/candidate/exams");
  return data;
};
