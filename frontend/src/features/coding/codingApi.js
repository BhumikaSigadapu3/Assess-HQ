import apiClient from "../../services/apiClient.js";

export const runSnippet = async (payload) => {
  const { data } = await apiClient.post("/coding/run", payload);
  return data;
};

/** Practice arena: custom stdin / expected pairs, no question bank. */
export const runPracticeCoding = async (payload) => {
  const { data } = await apiClient.post("/coding/practice/run", payload);
  return data;
};

export const runCodingQuestion = async (payload) => {
  const { data } = await apiClient.post("/coding/questions/run", payload);
  return data;
};

/** Exam-safe run: examId from URL path (matches session), persists autosave for grading. */
export const runExamCodingQuestion = async ({ examId, questionId, sourceCode, languageId, language }) => {
  const { data } = await apiClient.post(`/candidate/exams/${examId}/coding/run`, {
    questionId,
    sourceCode,
    languageId,
    ...(language ? { language } : {})
  });
  return data;
};

export const submitCodingQuestion = async (payload) => {
  const { data } = await apiClient.post("/coding/questions/submit", payload);
  return data;
};

export const listCodingSubmissions = async (params) => {
  const { data } = await apiClient.get("/coding/submissions", { params });
  return data;
};
