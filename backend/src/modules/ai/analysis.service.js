export const generateInterviewFeedback = ({ sentimentScore, confidenceScore }) => {
  const recommendation =
    confidenceScore > 0.7 && sentimentScore > 0.6
      ? "Strong potential candidate"
      : "Needs further rounds";

  return {
    communicationScore: Number((sentimentScore * 100).toFixed(2)),
    confidenceScore: Number((confidenceScore * 100).toFixed(2)),
    strengths: ["Problem solving", "Communication"],
    weaknesses: ["Time management"],
    recommendation
  };
};

export const predictPerformance = ({ codingScore, mcqScore, suspiciousEvents }) => {
  const base = codingScore * 0.6 + mcqScore * 0.4 - suspiciousEvents * 2;
  return Math.max(0, Math.min(100, Number(base.toFixed(2))));
};
