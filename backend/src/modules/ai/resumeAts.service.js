import { openAiChatJson } from "./openai.client.js";
import { createHash } from "node:crypto";
import { cacheGet, cacheSet } from "../cache/cache.service.js";
import { buildHeuristicAtsReport } from "./atsScoring.service.js";

const CACHE_TTL_SECONDS = 10 * 60;

const buildCacheKey = ({ resumeText, jobDescription, targetRole }) =>
  `ai:ats:${createHash("sha256")
    .update(`${targetRole || ""}\n${jobDescription || ""}\n${resumeText || ""}`)
    .digest("hex")}`;

export const analyzeResumeAts = async ({ resumeText, jobDescription = "", targetRole = "software role" }) => {
  const text = String(resumeText || "").slice(0, 50_000);
  const jobText = String(jobDescription || "").slice(0, 25_000);
  const cacheKey = buildCacheKey({ resumeText: text, jobDescription: jobText, targetRole });
  const cached = await cacheGet(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // Ignore stale or invalid cache values and recompute below.
    }
  }

  const heuristic = buildHeuristicAtsReport({
    resumeText: text,
    jobDescription: jobText,
    targetRole
  });

  try {
    const ai = await openAiChatJson({
      messages: [
        {
          role: "system",
          content:
            "You score resumes for ATS and recruiter fit. Return strict JSON with keys: atsScore (0-100), fitSummary (string), strengths (string[]), gaps (string[]), recommendations (string[]), interviewQuestions (string[])."
        },
        {
          role: "user",
          content: JSON.stringify({
            targetRole,
            jobDescription: jobText.slice(0, 8000),
            resumeText: text.slice(0, 12_000),
            heuristicSignals: heuristic
          })
        }
      ]
    });
    if (ai?.atsScore != null) {
      const report = {
        source: "openai",
        atsScore: Number(ai.atsScore),
        targetRole,
        fitSummary: ai.fitSummary || "",
        strengths: ai.strengths || [],
        gaps: ai.gaps || [],
        recommendations: ai.recommendations || [],
        interviewQuestions: ai.interviewQuestions || [],
        keywordCoverage: heuristic.keywordCoverage,
        sectionQuality: heuristic.sectionQuality,
        impact: heuristic.impact,
        redFlags: heuristic.redFlags
      };
      await cacheSet(cacheKey, JSON.stringify(report), CACHE_TTL_SECONDS);
      return report;
    }
  } catch {
    // fall back to heuristic
  }

  await cacheSet(cacheKey, JSON.stringify(heuristic), CACHE_TTL_SECONDS);
  return heuristic;
};
