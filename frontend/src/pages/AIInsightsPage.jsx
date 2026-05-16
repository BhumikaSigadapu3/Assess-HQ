import { useState } from "react";
import { ProgressBar, StatusPill } from "../components/DashboardPrimitives.jsx";
import apiClient from "../services/apiClient.js";

const scoreTone = (score = 0) => {
  if (score >= 75) return "emerald";
  if (score >= 50) return "amber";
  return "rose";
};

const formatScore = (score) => `${Math.round(Number(score) || 0)}%`;

function ScoreGauge({ score }) {
  const safeScore = Math.max(0, Math.min(100, Number(score) || 0));
  const tone = scoreTone(safeScore);
  const strokeColor = tone === "emerald" ? "#059669" : tone === "amber" ? "#d97706" : "#e11d48";

  return (
    <div className="relative grid place-items-center">
      <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90">
        <circle cx="60" cy="60" r="48" fill="none" stroke="currentColor" strokeWidth="12" className="text-slate-200 dark:text-slate-800" />
        <circle
          cx="60"
          cy="60"
          r="48"
          fill="none"
          stroke={strokeColor}
          strokeLinecap="round"
          strokeWidth="12"
          strokeDasharray={`${2 * Math.PI * 48}`}
          strokeDashoffset={`${2 * Math.PI * 48 * (1 - safeScore / 100)}`}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-3xl font-semibold text-slate-950 dark:text-white">{Math.round(safeScore)}</p>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">ATS score</p>
      </div>
    </div>
  );
}

function ReportList({ title, items = [], tone = "slate", emptyText }) {
  const markerClass = tone === "emerald" ? "bg-emerald-500" : tone === "rose" ? "bg-rose-500" : "bg-brand-500";

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
        <h4 className="font-semibold text-slate-950 dark:text-white">{title}</h4>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{emptyText || "No items detected."}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <h4 className="font-semibold text-slate-950 dark:text-white">{title}</h4>
      <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${markerClass}`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function KeywordChips({ title, keywords = [], tone = "slate" }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-slate-950 dark:text-white">{title}</h4>
        <span className="text-xs text-slate-400">{keywords.length}</span>
      </div>
      {keywords.length ? (
        <div className="flex max-h-32 flex-wrap gap-2 overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
          {keywords.map((keyword) => (
            <StatusPill key={keyword} tone={tone}>
              {keyword}
            </StatusPill>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-300 p-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          None detected.
        </p>
      )}
    </div>
  );
}

function SectionChecklist({ sections = {} }) {
  const entries = Object.entries(sections);
  if (!entries.length) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
      <h4 className="font-semibold text-slate-950 dark:text-white">ATS section scan</h4>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {entries.map(([section, present]) => (
          <div key={section} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm dark:bg-slate-900">
            <span className="capitalize text-slate-600 dark:text-slate-300">{section}</span>
            <StatusPill tone={present ? "emerald" : "rose"}>{present ? "Present" : "Missing"}</StatusPill>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResumeAtsReport({ report }) {
  if (!report) return null;

  const keywordCoverage = report.keywordCoverage || {};
  const sectionQuality = report.sectionQuality || {};
  const impact = report.impact || {};
  const summary =
    report.fitSummary ||
    `This resume currently scores ${formatScore(report.atsScore)} for ${report.targetRole}. Improve the score by closing keyword, section, and impact gaps.`;

  return (
    <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-brand-600 p-5 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-200">Professional ATS Report</p>
            <h3 className="mt-2 text-2xl font-semibold">{report.targetRole || "Target role"}</h3>
            <p className="mt-2 max-w-2xl text-sm text-slate-200">{summary}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusPill tone="brand">{report.source === "openai" ? "AI enriched" : "Heuristic analysis"}</StatusPill>
              <StatusPill tone={scoreTone(report.atsScore)}>{formatScore(report.atsScore)} overall</StatusPill>
            </div>
          </div>
          <div className="rounded-3xl bg-white/95 p-3 text-slate-950">
            <ScoreGauge score={report.atsScore} />
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Keyword match</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{formatScore(keywordCoverage.score)}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {keywordCoverage.matched?.length || 0} of {keywordCoverage.totalTargetKeywords || 0} target keywords found.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Section quality</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{formatScore(sectionQuality.score)}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">ATS-readable headings and resume structure.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Impact signals</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{formatScore(impact.score)}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {impact.metricMentions || 0} metrics and {impact.actionVerbMentions || 0} action verbs detected.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <ProgressBar label="Keyword coverage" value={keywordCoverage.score} tone={scoreTone(keywordCoverage.score)} />
          <ProgressBar label="Resume structure" value={sectionQuality.score} tone={scoreTone(sectionQuality.score)} />
          <ProgressBar label="Impact and outcomes" value={impact.score} tone={scoreTone(impact.score)} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <KeywordChips title="Matched keywords" keywords={keywordCoverage.matched || []} tone="emerald" />
          <KeywordChips title="Missing keywords to consider" keywords={keywordCoverage.missing || []} tone="amber" />
        </div>

        <SectionChecklist sections={sectionQuality.sections} />

        <div className="grid gap-4 lg:grid-cols-2">
          <ReportList title="Strengths" items={report.strengths || []} tone="emerald" emptyText="No clear strengths were detected yet." />
          <ReportList title="Priority gaps" items={report.gaps || []} tone="rose" emptyText="No major gaps were detected." />
        </div>

        <ReportList
          title="Recommended improvements"
          items={report.recommendations || []}
          tone="brand"
          emptyText="No recommendations were returned."
        />

        {report.interviewQuestions?.length ? (
          <ReportList title="Likely interview follow-ups" items={report.interviewQuestions} tone="brand" />
        ) : null}

        {report.redFlags?.length ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/30">
            <h4 className="font-semibold text-rose-900 dark:text-rose-100">ATS red flags</h4>
            <ul className="mt-3 space-y-2 text-sm text-rose-800 dark:text-rose-200">
              {report.redFlags.map((flag) => (
                <li key={flag}>{flag}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default function AIInsightsPage() {
  const [targetRole, setTargetRole] = useState("Software Engineer");
  const [jobDescription, setJobDescription] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [resumeResult, setResumeResult] = useState(null);
  const [resumeLoading, setResumeLoading] = useState(false);

  const [transcript, setTranscript] = useState("");
  const [interviewResult, setInterviewResult] = useState(null);

  const [examId, setExamId] = useState("");
  const [weakTopics, setWeakTopics] = useState(null);

  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);

  const runResume = async () => {
    setError(null);
    setResumeLoading(true);
    try {
      const { data } = await apiClient.post("/ai/resume/analyze", {
        resumeText,
        jobDescription,
        targetRole
      });
      setResumeResult(data);
    } catch (e) {
      setError(e.response?.data?.message || "Resume analysis failed");
    } finally {
      setResumeLoading(false);
    }
  };

  const runInterview = async () => {
    setError(null);
    try {
      const { data } = await apiClient.post("/ai/interview/analyze", {
        transcript,
        durationSeconds: 1800
      });
      setInterviewResult(data);
    } catch (e) {
      setError(e.response?.data?.message || "Interview analysis failed");
    }
  };

  const runWeakTopics = async () => {
    setError(null);
    try {
      const { data } = await apiClient.get(`/ai/exams/${examId}/weak-topics`);
      setWeakTopics(data);
    } catch (e) {
      setError(e.response?.data?.message || "Weak topic analysis failed");
    }
  };

  const runPrediction = async () => {
    setError(null);
    try {
      const { data } = await apiClient.post("/ai/performance/predict", {
        codingScore: 72,
        mcqScore: 68,
        suspiciousEvents: 1
      });
      setPrediction(data);
    } catch (e) {
      setError(e.response?.data?.message || "Prediction failed");
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">AI Insights</h1>
        <p className="text-sm text-slate-500">
          Modular AI layer with heuristic fallbacks and optional OpenAI enrichment via{" "}
          <code className="rounded bg-slate-100 px-1 dark:bg-slate-900">OPENAI_API_KEY</code>.
        </p>
      </div>

      {error ? <p className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <article className="space-y-3 rounded-xl border p-4 md:col-span-2">
          <h2 className="text-lg font-medium">Resume ATS</h2>
          <input
            className="w-full rounded border p-2 text-sm dark:bg-slate-900"
            placeholder="Target role"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
          />
          <textarea
            className="h-28 w-full rounded border p-2 text-sm dark:bg-slate-900"
            placeholder="Paste job description for keyword matching..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          />
          <textarea
            className="h-40 w-full rounded border p-2 text-sm dark:bg-slate-900"
            placeholder="Paste resume text..."
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
          />
          <button
            type="button"
            className="rounded bg-brand-600 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={resumeLoading}
            onClick={runResume}
          >
            {resumeLoading ? "Analyzing..." : "Analyze"}
          </button>
          <ResumeAtsReport report={resumeResult} />
        </article>

        <article className="space-y-2 rounded-xl border p-4">
          <h2 className="text-lg font-medium">Interview feedback</h2>
          <textarea
            className="h-40 w-full rounded border p-2 text-sm dark:bg-slate-900"
            placeholder="Paste interview transcript..."
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
          />
          <button type="button" className="rounded bg-brand-600 px-3 py-2 text-sm text-white" onClick={runInterview}>
            Analyze
          </button>
          {interviewResult ? (
            <pre className="max-h-48 overflow-auto rounded bg-slate-950 p-2 text-xs text-emerald-100">
              {JSON.stringify(interviewResult, null, 2)}
            </pre>
          ) : null}
        </article>

        <article className="space-y-2 rounded-xl border p-4">
          <h2 className="text-lg font-medium">Weak topics (post-exam)</h2>
          <input
            className="w-full rounded border p-2 text-sm dark:bg-slate-900"
            placeholder="Exam ID (Mongo ObjectId)"
            value={examId}
            onChange={(e) => setExamId(e.target.value)}
          />
          <button type="button" className="rounded bg-brand-600 px-3 py-2 text-sm text-white" onClick={runWeakTopics}>
            Generate plan
          </button>
          {weakTopics ? (
            <pre className="max-h-48 overflow-auto rounded bg-slate-950 p-2 text-xs text-emerald-100">
              {JSON.stringify(weakTopics, null, 2)}
            </pre>
          ) : null}
        </article>

        <article className="space-y-2 rounded-xl border p-4">
          <h2 className="text-lg font-medium">Hiring prediction (demo)</h2>
          <p className="text-xs text-slate-500">Uses weighted MCQ + coding proxy with integrity penalty.</p>
          <button type="button" className="rounded bg-brand-600 px-3 py-2 text-sm text-white" onClick={runPrediction}>
            Run sample prediction
          </button>
          {prediction ? (
            <pre className="max-h-48 overflow-auto rounded bg-slate-950 p-2 text-xs text-emerald-100">
              {JSON.stringify(prediction, null, 2)}
            </pre>
          ) : null}
        </article>
      </div>
    </section>
  );
}
