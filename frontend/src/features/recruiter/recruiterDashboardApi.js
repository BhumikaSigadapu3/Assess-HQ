import apiClient from "../../services/apiClient.js";

export const getRecruiterDashboardAnalytics = async (params = {}) => {
  const { data } = await apiClient.get("/recruiter/dashboard/analytics", { params });
  return data;
};

export const listRecruiterCandidates = async (params = {}) => {
  const { data } = await apiClient.get("/recruiter/candidates", { params });
  return data;
};

export const listRecruiterQuestions = async (params = {}) => {
  const { data } = await apiClient.get("/recruiter/questions", { params });
  return data;
};

export const listRecruiterReports = async (params = {}) => {
  const { data } = await apiClient.get("/recruiter/reports", { params });
  return data;
};

export const listRecruiterInterviews = async (params = {}) => {
  const { data } = await apiClient.get("/recruiter/interviews", { params });
  return data;
};

export const createRecruiterExam = async (payload) => {
  const { data } = await apiClient.post("/recruiter/exams", payload);
  return data;
};

export const composeRecruiterExam = async (payload) => {
  const { data } = await apiClient.post("/recruiter/exams/compose", payload);
  return data;
};

export const createRecruiterQuestion = async (payload) => {
  const { data } = await apiClient.post("/recruiter/questions", payload);
  return data;
};

export const scheduleRecruiterInterview = async (payload) => {
  const { data } = await apiClient.post("/recruiter/interviews", payload);
  return data;
};

export const patchRecruiterInterview = async (interviewId, payload) => {
  const { data } = await apiClient.patch(`/recruiter/interviews/${interviewId}`, payload);
  return data;
};

export const generateRecruiterReport = async (payload) => {
  const { data } = await apiClient.post("/recruiter/reports/generate", payload);
  return data;
};

export const getRecruiterExamsSummary = async () => {
  const { data } = await apiClient.get("/recruiter/exams/summary");
  return data;
};

export const getRecruiterExamOverview = async (examId) => {
  const { data } = await apiClient.get(`/recruiter/exams/${examId}/overview`);
  return data;
};

export const patchRecruiterExam = async (examId, payload) => {
  const { data } = await apiClient.patch(`/recruiter/exams/${examId}`, payload);
  return data;
};

export const getRecruiterExamDraft = async (examId) => {
  const { data } = await apiClient.get(`/recruiter/exams/${examId}/draft`);
  return data;
};

export const putRecruiterExamDraftQuestions = async (examId, payload) => {
  const { data } = await apiClient.put(`/recruiter/exams/${examId}/draft/questions`, payload);
  return data;
};

export const getExamLeaderboard = async (examId, params = {}) => {
  const { data } = await apiClient.get(`/recruiter/exams/${examId}/leaderboard`, { params });
  return data;
};

export const getExamCandidateProfile = async (examId, candidateId) => {
  const { data } = await apiClient.get(`/recruiter/exams/${examId}/candidates/${candidateId}/profile`);
  return data;
};

export const postExamShortlist = async (examId, candidateIds) => {
  const { data } = await apiClient.post(`/recruiter/exams/${examId}/shortlist`, { candidateIds });
  return data;
};

export const getRecruiterHiringShortlist = async () => {
  const { data } = await apiClient.get("/recruiter/hiring/shortlist");
  return data;
};
