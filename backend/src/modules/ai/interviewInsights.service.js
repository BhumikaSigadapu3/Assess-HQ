import { generateInterviewFeedback, predictPerformance } from "./analysis.service.js";
import { openAiChatJson } from "./openai.client.js";

const simpleSentiment = (text) => {
  const positive = (text.match(/\b(great|good|yes|absolutely|happy|confident)\b/gi) || []).length;
  const negative = (text.match(/\b(no|not|unsure|difficult|struggle|sorry)\b/gi) || []).length;
  const score = (positive + 1) / (positive + negative + 2);
  return Number(score.toFixed(3));
};

const simpleConfidence = (text) => {
  const hedges = (text.match(/\b(maybe|perhaps|i think|not sure)\b/gi) || []).length;
  const assertive = (text.match(/\b(definitely|clearly|i implemented|we shipped)\b/gi) || []).length;
  const score = (assertive + 1) / (assertive + hedges + 2);
  return Number(score.toFixed(3));
};

export const analyzeInterviewTranscript = async ({ transcript, durationSeconds }) => {
  const text = String(transcript || "").slice(0, 30_000);
  const sentimentScore = simpleSentiment(text);
  const confidenceScore = simpleConfidence(text);
  const structured = generateInterviewFeedback({ sentimentScore, confidenceScore });

  try {
    const ai = await openAiChatJson({
      messages: [
        {
          role: "system",
          content:
            "You are an interview coach. Given a transcript, return JSON: sentimentScore (0-1), confidenceScore (0-1), coachingNotes (string[]), riskFlags (string[])."
        },
        { role: "user", content: text.slice(0, 8000) }
      ]
    });
    if (ai && (ai.sentimentScore != null || ai.confidenceScore != null)) {
      return {
        source: "openai",
        sentimentScore: Number(ai.sentimentScore ?? sentimentScore),
        confidenceScore: Number(ai.confidenceScore ?? confidenceScore),
        coachingNotes: ai.coachingNotes || [],
        riskFlags: ai.riskFlags || [],
        durationSeconds: durationSeconds ?? null
      };
    }
  } catch {
    // ignore
  }

  return {
    source: "heuristic",
    sentimentScore,
    confidenceScore,
    coachingNotes: [
      `Structured feedback: communication ${structured.communicationScore}/100`,
      `Observed confidence proxy: ${structured.confidenceScore}/100`
    ],
    riskFlags: sentimentScore < 0.45 ? ["Low sentiment engagement"] : [],
    durationSeconds: durationSeconds ?? null,
    structured
  };
};

export const predictCandidatePerformance = async ({ codingScore, mcqScore, suspiciousEvents }) => {
  const prediction = predictPerformance({
    codingScore: Number(codingScore || 0),
    mcqScore: Number(mcqScore || 0),
    suspiciousEvents: Number(suspiciousEvents || 0)
  });

  return {
    predictionScore: prediction,
    bands: {
      hire: prediction >= 78,
      maybe: prediction >= 55 && prediction < 78,
      noHire: prediction < 55
    }
  };
};
