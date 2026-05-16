const DEFAULT_KEYWORDS = [
  "react",
  "node",
  "typescript",
  "javascript",
  "aws",
  "kubernetes",
  "docker",
  "mongodb",
  "sql",
  "system design",
  "leadership",
  "mentoring",
  "testing",
  "ci/cd",
  "rest",
  "graphql"
];

const STOP_WORDS = new Set([
  "and",
  "the",
  "with",
  "for",
  "from",
  "that",
  "this",
  "your",
  "you",
  "are",
  "will",
  "have",
  "our",
  "their",
  "into",
  "using",
  "about"
]);

const normalizeText = (text) => String(text || "").toLowerCase();

const unique = (items) => [...new Set(items.filter(Boolean))];

export const extractTargetKeywords = ({ resumeText, jobDescription }) => {
  const combined = normalizeText(`${jobDescription || ""} ${resumeText || ""}`);
  const words = combined.match(/[a-z][a-z0-9+#./-]{2,}/g) || [];
  const frequentTerms = Object.entries(
    words.reduce((acc, word) => {
      if (STOP_WORDS.has(word)) return acc;
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {})
  )
    .sort(([, left], [, right]) => right - left)
    .slice(0, 16)
    .map(([word]) => word);

  return unique([...DEFAULT_KEYWORDS, ...frequentTerms]).slice(0, 28);
};

export const scoreKeywordCoverage = ({ resumeText, jobDescription }) => {
  const resume = normalizeText(resumeText);
  const targetKeywords = extractTargetKeywords({ resumeText, jobDescription });
  const matched = targetKeywords.filter((keyword) => resume.includes(keyword));
  const missing = targetKeywords.filter((keyword) => !resume.includes(keyword));
  const coverage = targetKeywords.length ? Math.round((matched.length / targetKeywords.length) * 100) : 0;

  return {
    score: coverage,
    matched,
    missing: missing.slice(0, 12),
    totalTargetKeywords: targetKeywords.length
  };
};

export const scoreSectionQuality = (resumeText) => {
  const text = normalizeText(resumeText);
  const sections = {
    summary: /\b(summary|profile|objective)\b/.test(text),
    experience: /\b(experience|employment|work history)\b/.test(text),
    skills: /\b(skills|technologies|tooling)\b/.test(text),
    education: /\b(education|degree|university|college)\b/.test(text),
    projects: /\b(projects|portfolio)\b/.test(text)
  };
  const presentCount = Object.values(sections).filter(Boolean).length;

  return {
    score: Math.round((presentCount / Object.keys(sections).length) * 100),
    sections
  };
};

export const scoreImpact = (resumeText) => {
  const text = String(resumeText || "");
  const metricMentions = (text.match(/\b\d+(\.\d+)?%|\$\d+|\b\d+x\b|\b\d+\+?\s+(users|customers|requests|ms|seconds|hours)\b/gi) || [])
    .length;
  const actionVerbs = (text.match(/\b(built|led|owned|improved|reduced|launched|migrated|designed|optimized|automated)\b/gi) || [])
    .length;
  const score = Math.min(100, metricMentions * 12 + actionVerbs * 4);

  return {
    score,
    metricMentions,
    actionVerbMentions: actionVerbs
  };
};

export const detectAtsRedFlags = (resumeText) => {
  const text = String(resumeText || "");
  const redFlags = [];

  if (text.length < 800) redFlags.push("Resume is very short; add more role impact and project detail.");
  if (!/@/.test(text)) redFlags.push("No email address detected.");
  if (!/\b(https?:\/\/|linkedin\.com|github\.com)\b/i.test(text)) {
    redFlags.push("No portfolio, LinkedIn, or GitHub link detected.");
  }
  if ((text.match(/\bresponsible for\b/gi) || []).length > 3) {
    redFlags.push("Repeated passive phrasing; replace with action/result statements.");
  }

  return redFlags;
};

export const buildHeuristicAtsReport = ({ resumeText, jobDescription = "", targetRole = "software role" }) => {
  const keywordCoverage = scoreKeywordCoverage({ resumeText, jobDescription });
  const sectionQuality = scoreSectionQuality(resumeText);
  const impact = scoreImpact(resumeText);
  const redFlags = detectAtsRedFlags(resumeText);
  const lengthScore = Math.min(100, Math.round((String(resumeText || "").length / 3000) * 100));
  const atsScore = Math.round(
    keywordCoverage.score * 0.4 +
      sectionQuality.score * 0.2 +
      impact.score * 0.25 +
      lengthScore * 0.15 -
      redFlags.length * 4
  );

  return {
    source: "heuristic",
    targetRole,
    atsScore: Math.max(0, Math.min(100, atsScore)),
    keywordCoverage,
    sectionQuality,
    impact,
    redFlags,
    strengths: [
      keywordCoverage.matched.length ? "Relevant keywords detected" : null,
      sectionQuality.score >= 80 ? "Core resume sections are present" : null,
      impact.score >= 50 ? "Impact-oriented language and metrics detected" : null
    ].filter(Boolean),
    gaps: [
      ...keywordCoverage.missing.slice(0, 5).map((keyword) => `Missing target keyword: ${keyword}`),
      ...redFlags
    ].slice(0, 10),
    recommendations: [
      "Mirror high-priority job description keywords naturally in experience bullets.",
      "Use action + metric + business outcome for each recent role.",
      "Keep section headings ATS-friendly: Summary, Experience, Skills, Projects, Education."
    ]
  };
};
