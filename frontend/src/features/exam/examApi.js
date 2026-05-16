import apiClient from "../../services/apiClient.js";

export const fetchAvailableExams = async () => {
  const { data } = await apiClient.get("/candidate/exams");
  return data;
};

export const createExam = async (payload) => {
  const { data } = await apiClient.post("/recruiter/exams", payload);
  return data;
};
