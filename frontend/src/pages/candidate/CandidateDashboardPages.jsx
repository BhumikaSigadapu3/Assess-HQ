import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  Bell,
  Bookmark,
  CalendarClock,
  Code2,
  FileScan,
  Flame,
  Medal,
  Settings,
  Trophy,
  UserRound
} from "lucide-react";
import {
  AiInsightsPanel,
  AiRecommendationCards,
  CodingActivityHeatmap,
  ContestRatingTrendChart,
  DashboardLoadingState,
  FuturisticCard,
  HeroOverview,
  PageHeader,
  RecentActivityFeed,
  ResumeAtsScoreCard,
  ScoreTrendAreaChart,
  SkillRadarGraph,
  UpcomingAssessmentsWidget,
  WidgetTitle
} from "../../components/candidate/CandidateDashboardWidgets.jsx";
import { EmptyState, ProgressBar, StatusPill } from "../../components/DashboardPrimitives.jsx";
import { formatDateTime, formatPercent, getScoreTone, useCandidateDashboard, useOptionalCandidateDashboard } from "../../features/candidate/CandidateDashboardContext.jsx";
import {
  registerForAssessment,
  getCandidateExamLeaderboard,
  fetchCandidateExamsCatalog,
  updateCandidateProfile
} from "../../features/exam/candidateDashboardApi.js";
import apiClient from "../../services/apiClient.js";

const pageMotion = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 }
};

export function CandidateHomePage() {
  const { metrics, interviews, activityFeed, loading, error } = useCandidateDashboard();

  if (loading) return <DashboardLoadingState />;

  return (
    <motion.section {...pageMotion} transition={{ duration: 0.28 }} className="space-y-6">
      <PageHeader
        eyebrow="Home"
        title="Your workspace"
        description="Active assessments, upcoming interviews, and recent activity — synced with recruiters in real time."
      />
      {error ? (
        <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3">
        <FuturisticCard glow="sky">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Active assessments</p>
          <p className="mt-3 text-4xl font-semibold text-white">{metrics.upcomingAssessments ?? 0}</p>
        </FuturisticCard>
        <FuturisticCard glow="amber">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Upcoming interviews</p>
          <p className="mt-3 text-4xl font-semibold text-white">{metrics.upcomingInterviews ?? 0}</p>
        </FuturisticCard>
        <FuturisticCard glow="emerald">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Recent activity</p>
          <p className="mt-3 text-4xl font-semibold text-white">{activityFeed?.length ?? 0}</p>
        </FuturisticCard>
      </div>
      <FuturisticCard glow="slate">
        <WidgetTitle icon={Bell} title="Recent activity" subtitle="Submissions, scores, and recruiter notifications." />
        <RecentActivityFeed />
      </FuturisticCard>
    </motion.section>
  );
}

function PageFrame({ eyebrow, title, description, action, children }) {
  const ctx = useOptionalCandidateDashboard();
  if (ctx) {
    const { loading, error } = ctx;
    if (loading) return <DashboardLoadingState />;

    return (
      <motion.section {...pageMotion} transition={{ duration: 0.28 }} className="space-y-6">
        <PageHeader eyebrow={eyebrow} title={title} description={description} action={action} />
        {error ? (
          <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div>
        ) : null}
        {children}
      </motion.section>
    );
  }

  return (
    <motion.section {...pageMotion} transition={{ duration: 0.28 }} className="space-y-6">
      <PageHeader eyebrow={eyebrow} title={title} description={description} action={action} />
      {children}
    </motion.section>
  );
}

function AssessmentRows({ compact = false }) {
  const { assessments, profile, refreshDashboard } = useCandidateDashboard();
  const items = assessments.upcoming || [];
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState(null);

  const canRegister = Boolean(profile?.resumeUrl?.trim()) && (profile?.skills?.length || 0) > 0;

  const onRegister = async (examId) => {
    setBusyId(examId);
    setMsg(null);
    try {
      await registerForAssessment(examId);
      await refreshDashboard({ silent: true });
      setMsg({ type: "ok", text: "Registered successfully." });
    } catch (err) {
      setMsg({ type: "err", text: err.response?.data?.message || "Registration failed" });
    } finally {
      setBusyId(null);
    }
  };

  if (!items.length) {
    return <EmptyState title="No active assessments" description="Live and scheduled assessment invitations will appear here." />;
  }

  return (
    <div className="space-y-3">
      {msg ? (
        <div
          className={`rounded-2xl border px-3 py-2 text-sm ${
            msg.type === "ok" ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100" : "border-rose-400/20 bg-rose-500/10 text-rose-100"
          }`}
        >
          {msg.text}
        </div>
      ) : null}
      {items.map((item) => (
        <article key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-white">{item.title}</h3>
                <StatusPill tone={item.status === "in_progress" ? "amber" : "sky"}>{item.status.replace("_", " ")}</StatusPill>
                {item.registered ? <StatusPill tone="emerald">Registered</StatusPill> : null}
              </div>
              {!compact && item.description ? <p className="mt-2 max-w-2xl text-sm text-slate-400">{item.description}</p> : null}
              {item.createdByName ? (
                <p className="mt-2 text-xs text-slate-500">Created by {item.createdByName}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!item.registered && item.registrationOpen ? (
                <button
                  type="button"
                  disabled={!canRegister || busyId === item.id}
                  onClick={() => onRegister(item.id)}
                  className="rounded-xl border border-violet-300/30 bg-violet-500/15 px-3 py-2 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {!canRegister ? "Add resume & skills" : busyId === item.id ? "…" : "Register"}
                </button>
              ) : null}
              {!item.registered && !item.registrationOpen ? (
                <span className="text-xs text-slate-500">Registration closed</span>
              ) : null}
              <Link
                to={`/candidate/exams/${item.id}`}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  item.status === "in_progress" || item.registered
                    ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/20"
                    : "border-white/10 text-slate-500 opacity-60"
                }`}
                onClick={(e) => {
                  if (item.status !== "in_progress" && !item.registered) e.preventDefault();
                }}
              >
                {item.status === "in_progress" ? "Resume" : "Start"}
              </Link>
            </div>
          </div>
          <div className="mt-4 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
            <span>{item.durationMinutes} minutes</span>
            <span>Reg. deadline {item.registrationDeadline ? formatDateTime(item.registrationDeadline) : "—"}</span>
            <span>Starts {formatDateTime(item.startTime)}</span>
            <span className="sm:col-span-3">Ends {formatDateTime(item.endTime)}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

function SubmissionRows() {
  const { coding } = useCandidateDashboard();
  const submissions = coding.recentSubmissions || [];

  if (!submissions.length) {
    return <EmptyState title="No coding submissions" description="Run and submit coding problems to populate this workspace." />;
  }

  return (
    <div className="space-y-3">
      {submissions.map((submission) => (
        <article key={submission.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-white">{submission.questionTitle || "Coding challenge"}</h3>
              <p className="mt-1 text-sm text-slate-400">
                {submission.language || "Code"} submitted {formatDateTime(submission.createdAt)}
              </p>
            </div>
            <StatusPill tone={submission.status === "accepted" ? "emerald" : "sky"}>{submission.status}</StatusPill>
          </div>
          <div className="mt-4">
            <ProgressBar label="Score" value={submission.score} tone={getScoreTone(submission.score)} />
          </div>
        </article>
      ))}
    </div>
  );
}

function PageStatGrid() {
  const { metrics, coding } = useCandidateDashboard();
  const stats = [
    ["AI readiness", metrics.aiSkillScore == null ? "No data" : formatPercent(metrics.aiSkillScore)],
    ["Average score", metrics.completedAssessments ? formatPercent(metrics.averageScore) : "No scores"],
    ["Accepted solutions", coding.acceptedSubmissions || 0],
    ["Unread notifications", metrics.unreadNotifications || 0]
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {stats.map(([label, value]) => (
        <FuturisticCard key={label} glow="slate" className="p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
        </FuturisticCard>
      ))}
    </div>
  );
}

export function CandidateOverviewPage() {
  return (
    <PageFrame
      eyebrow="Overview"
      title="Candidate Command Center"
      description="A futuristic, data-rich overview of technical readiness, coding velocity, recruiter signals, and AI recommendations."
      action={
        <Link to="/candidate/coding-arena" className="rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950">
          Launch coding arena
        </Link>
      }
    >
      <HeroOverview />
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <SkillRadarGraph />
        <AiInsightsPanel />
      </div>
      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <CodingActivityHeatmap />
        <ContestRatingTrendChart />
      </div>
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <ResumeAtsScoreCard />
        <ScoreTrendAreaChart />
      </div>
      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <UpcomingAssessmentsWidget />
        <AiRecommendationCards />
      </div>
      <RecentActivityFeed />
    </PageFrame>
  );
}

export function CandidateAssessmentsPage() {
  return (
    <PageFrame eyebrow="Assessments" title="Assessment Operations" description="Live, scheduled, and in-progress technical assessments with recruiter-grade status tracking.">
      <PageStatGrid />
      <FuturisticCard glow="amber">
        <WidgetTitle icon={CalendarClock} title="Assessment Queue" subtitle="Every active assessment invitation in one operational view." />
        <AssessmentRows />
      </FuturisticCard>
      <ScoreTrendAreaChart />
    </PageFrame>
  );
}

export function CandidateCodingArenaPage() {
  const { coding } = useCandidateDashboard();

  return (
    <PageFrame
      eyebrow="Coding Arena"
      title="High-Signal Coding Workspace"
      description="Track accepted solutions, streak health, recent execution quality, and launch the Monaco-based coding environment."
      action={
        <Link to="/candidate/workspace/coding" className="rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950">
          Open Monaco workspace
        </Link>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <FuturisticCard glow="sky">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Submissions</p>
          <p className="mt-3 text-4xl font-semibold text-white">{coding.totalSubmissions || 0}</p>
        </FuturisticCard>
        <FuturisticCard glow="emerald">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Accepted</p>
          <p className="mt-3 text-4xl font-semibold text-white">{coding.acceptedSubmissions || 0}</p>
        </FuturisticCard>
        <FuturisticCard glow="rose">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Streak</p>
          <p className="mt-3 text-4xl font-semibold text-white">{coding.streakDays || 0}d</p>
        </FuturisticCard>
      </div>
      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <CodingActivityHeatmap />
        <FuturisticCard glow="slate">
          <WidgetTitle icon={Code2} title="Recent Submissions" subtitle="Latest judged attempts and scoring signals." />
          <SubmissionRows />
        </FuturisticCard>
      </div>
    </PageFrame>
  );
}

export function CandidateContestsPage() {
  return (
    <PageFrame eyebrow="Contests" title="Contest Intelligence" description="Competitive rounds, rating movement, and participation analytics.">
      <ContestRatingTrendChart />
      <FuturisticCard glow="sky">
        <WidgetTitle icon={Trophy} title="Contest Participation" subtitle="Contest modules will stream here as timed rounds are launched." />
        <EmptyState title="No contest events yet" description="Completed contest rounds will populate participation, rank, and rating movement." />
      </FuturisticCard>
    </PageFrame>
  );
}

export function CandidateInterviewsPage() {
  const { interviews } = useCandidateDashboard();
  const rounds = interviews.scheduledRounds || [];

  return (
    <PageFrame eyebrow="Interviews" title="Interview rounds & readiness" description="Recruiter-scheduled technical and hiring rounds, plus AI-assisted interview feedback signals.">
      {rounds.length ? (
        <FuturisticCard glow="cyan">
          <WidgetTitle icon={CalendarClock} title="Scheduled interview rounds" subtitle="From your recruiting team — dates and meet links." />
          <div className="space-y-3">
            {rounds.map((r) => (
              <article key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-white">{r.assessmentName || "Interview round"}</h3>
                    <p className="mt-1 text-sm text-slate-400 capitalize">{String(r.roundType || "").replace("_", " ")}</p>
                    <p className="mt-2 text-xs text-slate-500">{formatDateTime(r.scheduledAt)} · {r.durationMinutes} min</p>
                  </div>
                  {r.meetingUrl ? (
                    <a
                      href={r.meetingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-300/20"
                    >
                      Join meeting
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </FuturisticCard>
      ) : null}
      {interviews.completedRounds?.length ? (
        <FuturisticCard glow="slate">
          <WidgetTitle icon={CalendarClock} title="Completed interviews" subtitle="Outcomes recorded by your recruiting team." />
          <div className="space-y-3">
            {interviews.completedRounds.map((r) => (
              <article key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-white">{r.assessmentName || "Interview round"}</h3>
                    <p className="mt-1 text-xs text-slate-500">{formatDateTime(r.scheduledAt)}</p>
                  </div>
                  {r.outcome ? (
                    <StatusPill tone={r.outcome === "shortlisted" ? "emerald" : "rose"}>{r.outcome}</StatusPill>
                  ) : (
                    <StatusPill tone="slate">Completed</StatusPill>
                  )}
                </div>
              </article>
            ))}
          </div>
        </FuturisticCard>
      ) : null}
      <div className="grid gap-4 xl:grid-cols-3">
        <FuturisticCard glow="sky">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Communication</p>
          <p className="mt-3 text-4xl font-semibold text-white">{formatPercent(interviews.averageCommunicationScore)}</p>
        </FuturisticCard>
        <FuturisticCard glow="emerald">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Confidence</p>
          <p className="mt-3 text-4xl font-semibold text-white">{formatPercent(interviews.averageConfidenceScore)}</p>
        </FuturisticCard>
        <FuturisticCard glow="brand">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Sentiment</p>
          <p className="mt-3 text-4xl font-semibold text-white">{formatPercent(interviews.averageSentimentScore)}</p>
        </FuturisticCard>
      </div>
      <AiInsightsPanel />
    </PageFrame>
  );
}

export function CandidateLeaderboardPage() {
  const { metrics, loading, error } = useCandidateDashboard();
  const ranking = metrics.ranking || {};
  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [board, setBoard] = useState(null);
  const [boardLoading, setBoardLoading] = useState(false);

  useEffect(() => {
    setCatalogLoading(true);
    fetchCandidateExamsCatalog()
      .then(setCatalog)
      .catch((e) => setCatalogError(e.response?.data?.message || "Failed to load assessments"))
      .finally(() => setCatalogLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setBoard(null);
      return;
    }
    setBoardLoading(true);
    getCandidateExamLeaderboard(selectedId)
      .then(setBoard)
      .catch(() => setBoard(null))
      .finally(() => setBoardLoading(false));
  }, [selectedId]);

  if (loading) return <DashboardLoadingState />;

  return (
    <motion.section {...pageMotion} transition={{ duration: 0.28 }} className="space-y-6">
      <PageHeader
        eyebrow="Leaderboard"
        title="Rankings"
        description="Global cohort position and per-assessment scoreboards. Your row is highlighted when you have a submitted attempt."
      />
      {error ? (
        <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div>
      ) : null}
      <FuturisticCard glow="amber">
        <WidgetTitle icon={Medal} title="Global rank snapshot" subtitle="Across all completed assessments on the platform." />
        <div className="grid gap-4 md:grid-cols-3">
          <RankTile label="Rank" value={ranking.rank ? `#${ranking.rank}` : "Unranked"} />
          <RankTile label="Percentile" value={ranking.percentile ? formatPercent(ranking.percentile) : "No data"} />
          <RankTile label="Cohort" value={ranking.cohortSize || 0} />
        </div>
      </FuturisticCard>

      <FuturisticCard glow="sky">
        <WidgetTitle icon={Medal} title="Assessment leaderboards" subtitle="Select an assessment to load ranked scores." />
        {catalogError ? <p className="text-sm text-rose-200">{catalogError}</p> : null}
        {catalogLoading ? <div className="h-24 animate-pulse rounded-2xl bg-white/10" /> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          {!catalogLoading &&
            catalog.map((ex) => (
              <button
                key={ex._id}
                type="button"
                onClick={() => setSelectedId(String(ex._id))}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  selectedId === String(ex._id)
                    ? "border-cyan-300/50 bg-cyan-300/15 text-cyan-50"
                    : "border-white/10 bg-white/[0.04] text-slate-200 hover:border-cyan-300/30"
                }`}
              >
                {ex.title}
              </button>
            ))}
        </div>
        {selectedId ? (
          <div className="mt-6 space-y-3">
            {boardLoading ? <div className="h-32 animate-pulse rounded-2xl bg-white/10" /> : null}
            {!boardLoading && board?.entries?.length ? (
              <div className="overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full min-w-[320px] text-left text-sm">
                  <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-3 py-2">Rank</th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {board.entries.map((row) => (
                      <tr
                        key={`${row.rank}-${row.name}`}
                        className={row.isViewer ? "bg-cyan-500/15 text-cyan-50" : "border-t border-white/5 text-slate-200"}
                      >
                        <td className="px-3 py-2 font-mono">{row.rank}</td>
                        <td className="px-3 py-2">{row.name}</td>
                        <td className="px-3 py-2">{formatPercent(row.score, "0%")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            {!boardLoading && selectedId && !board?.entries?.length ? (
              <EmptyState title="No scores yet" description="Leaderboard appears after candidates submit attempts." />
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">Choose an assessment above.</p>
        )}
      </FuturisticCard>

      <ScoreTrendAreaChart />
    </motion.section>
  );
}

function RankTile({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-3 text-4xl font-semibold text-white">{value}</p>
    </div>
  );
}

export function CandidateAiInsightsPage() {
  return (
    <PageFrame eyebrow="AI Insights" title="AI Career Coach" description="Personalized, data-backed readiness analysis across coding, assessments, interviews, and resume signals.">
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <AiInsightsPanel />
        <AiRecommendationCards />
      </div>
      <SkillRadarGraph />
    </PageFrame>
  );
}

export function CandidateResumeAnalyzerPage() {
  const location = useLocation();
  const isRecruiterShell = location.pathname.startsWith("/recruiter/");
  const [targetRole, setTargetRole] = useState("Software Engineer");
  const [jobDescription, setJobDescription] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [analyzeError, setAnalyzeError] = useState(null);

  const runAnalysis = async () => {
    setAnalyzeError(null);
    setLoading(true);
    try {
      const { data } = await apiClient.post("/ai/resume/analyze", { resumeText, jobDescription, targetRole });
      setResult(data);
    } catch (e) {
      setAnalyzeError(e.response?.data?.message || e.message || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageFrame
      eyebrow="Resume Analyzer"
      title="ATS & Recruiter Fit"
      description={
        isRecruiterShell
          ? "Paste resume text and an optional job description for ATS-style feedback — same analysis service as the candidate workspace."
          : "Resume readiness, keyword coverage, and AI coaching — without leaving the candidate workspace."
      }
    >
      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <ResumeAtsScoreCard />
        <FuturisticCard glow="emerald">
          <WidgetTitle
            icon={FileScan}
            title="Run resume analysis"
            subtitle="Paste your resume and an optional job description. Results appear below and use the same /ai/resume/analyze service as the rest of the platform."
          />
          {analyzeError ? (
            <div className="mt-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">{analyzeError}</div>
          ) : null}
          <label className="mt-4 block text-sm font-semibold text-slate-200">
            Target role
            <input
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/45"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
            />
          </label>
          <label className="mt-3 block text-sm font-semibold text-slate-200">
            Job description (optional)
            <textarea
              className="mt-2 min-h-[88px] w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/45"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste a JD for tighter keyword matching…"
            />
          </label>
          <label className="mt-3 block text-sm font-semibold text-slate-200">
            Resume text
            <textarea
              className="mt-2 min-h-[140px] w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/45"
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste resume content…"
            />
          </label>
          <button
            type="button"
            disabled={loading || !resumeText.trim()}
            onClick={runAnalysis}
            className="mt-4 w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Analyzing…" : "Analyze resume"}
          </button>
          {result ? (
            <pre className="mt-4 max-h-80 overflow-auto rounded-2xl border border-white/10 bg-slate-950/80 p-3 text-xs text-emerald-100">
              {JSON.stringify(result, null, 2)}
            </pre>
          ) : null}
        </FuturisticCard>
      </div>
      <div className="mt-4">
        <AiRecommendationCards />
      </div>
    </PageFrame>
  );
}

export function CandidateAnalyticsPage() {
  return (
    <PageFrame eyebrow="Analytics" title="Performance Analytics" description="Radar, trends, score movement, and weak-topic analytics powered by real candidate data.">
      <div className="grid gap-4 xl:grid-cols-2">
        <SkillRadarGraph />
        <ScoreTrendAreaChart />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <CodingActivityHeatmap />
        <ContestRatingTrendChart />
      </div>
    </PageFrame>
  );
}

export function CandidatePracticePage() {
  return (
    <PageFrame
      eyebrow="Practice"
      title="Practice Lab"
      description="A focused lane for self-paced drills, weak-topic recovery, and coding repetition."
      action={
        <Link to="/candidate/workspace/coding" className="rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950">
          Practice coding
        </Link>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <AiRecommendationCards />
        <FuturisticCard glow="emerald">
          <WidgetTitle icon={Flame} title="Practice Focus" subtitle="Generated from weak topics and coding history." />
          <EmptyState title="No dedicated practice set yet" description="Weak-topic drills will appear after more assessment attempts are completed." />
        </FuturisticCard>
      </div>
    </PageFrame>
  );
}

export function CandidateBookmarksPage() {
  return (
    <PageFrame eyebrow="Bookmarks" title="Saved Problems & Notes" description="A premium workspace for saved questions, practice notes, and recruiter prep bookmarks.">
      <FuturisticCard glow="slate">
        <WidgetTitle icon={Bookmark} title="Bookmarks" subtitle="Saved content will appear here once bookmarking is connected." />
        <EmptyState title="No bookmarks yet" description="Bookmark support is ready in the dashboard shell; saved problems can be wired from the coding module." />
      </FuturisticCard>
    </PageFrame>
  );
}

export function CandidateNotificationsPage() {
  const { notifications } = useCandidateDashboard();
  const items = notifications.latest || [];

  return (
    <PageFrame eyebrow="Notifications" title="Signal Inbox" description="Assessment reminders, AI feedback events, recruiter messages, and platform updates.">
      <FuturisticCard glow="sky">
        <WidgetTitle icon={Bell} title={`${notifications.unreadCount || 0} unread notifications`} subtitle="Latest platform events." />
        {items.length ? (
          <div className="space-y-3">
            {items.map((item) => (
              <article key={item._id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-white">{item.title || item.type}</h3>
                    {item.message ? <p className="mt-1 text-sm text-slate-400">{item.message}</p> : null}
                    <p className="mt-2 text-xs text-slate-500">{formatDateTime(item.createdAt)}</p>
                  </div>
                  {!item.isRead ? <StatusPill tone="brand">New</StatusPill> : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="No notifications" description="You are all caught up." />
        )}
      </FuturisticCard>
    </PageFrame>
  );
}

export function CandidateProfilePage() {
  const { profile, refreshDashboard } = useCandidateDashboard();

  return (
    <PageFrame
      eyebrow="Profile"
      title="Recruiter-Visible Candidate Profile"
      description="Add your headline, skills, and resume so recruiters can evaluate your profile alongside assessment and coding signals."
    >
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <FuturisticCard glow="brand">
          <WidgetTitle icon={UserRound} title={profile.name || "Candidate"} subtitle={profile.email || "No email available"} />
          <div className="grid gap-4 md:grid-cols-2">
            <ProfileField label="Headline" value={profile.headline || "No headline added"} />
            <ProfileField label="Member since" value={formatDateTime(profile.memberSince)} />
            <ProfileField label="Resume" value={profile.resumeUrl ? "Connected" : "Not connected"} />
            <ProfileField label="Skills" value={profile.skills?.length ? profile.skills.join(", ") : "No skills added"} />
          </div>
        </FuturisticCard>
        <ProfileEditor profile={profile} onSaved={() => refreshDashboard({ silent: true })} />
      </div>
      <FuturisticCard glow="sky">
        <WidgetTitle icon={UserRound} title={profile.name || "Candidate"} subtitle={profile.email || "No email available"} />
        <div className="grid gap-4 lg:grid-cols-3">
          <RecruiterPreviewBlock title="Headline" value={profile.headline || "Add a concise role-focused headline."} />
          <RecruiterPreviewBlock title="Skills" value={profile.skills?.length ? profile.skills.join("  /  ") : "Add technical skills recruiters should filter by."} />
          <RecruiterPreviewBlock
            title="Resume"
            value={profile.resumeUrl ? "Resume link available for recruiter review." : "Add a public resume URL."}
          />
        </div>
      </FuturisticCard>
    </PageFrame>
  );
}

function ProfileEditor({ profile, onSaved }) {
  const [headline, setHeadline] = useState(profile.headline || "");
  const [resumeUrl, setResumeUrl] = useState(profile.resumeUrl || "");
  const [skillsText, setSkillsText] = useState((profile.skills || []).join(", "));
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setHeadline(profile.headline || "");
    setResumeUrl(profile.resumeUrl || "");
    setSkillsText((profile.skills || []).join(", "));
  }, [profile.headline, profile.resumeUrl, profile.skills]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const skills = skillsText
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean);

      const cleanedResume = resumeUrl.replace(/\s+/g, "").trim();

      await updateCandidateProfile({
        headline,
        resumeUrl: cleanedResume,
        skills
      });
      await onSaved?.();
      setStatus({ type: "success", message: "Profile saved. Recruiters can now see your updated headline, skills, and resume." });
    } catch (err) {
      const details = err.response?.data?.details;
      const firstDetail = Array.isArray(details) && details[0]?.msg ? details[0].msg : null;
      const apiMessage =
        typeof err.response?.data?.message === "string" ? err.response.data.message : null;
      const status = err.response?.status;
      const message =
        firstDetail ||
        apiMessage ||
        (status ? `Request failed (${status})` : null) ||
        err.message ||
        "Failed to save profile";
      setStatus({
        type: "error",
        message
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <FuturisticCard glow="emerald">
      <WidgetTitle icon={FileScan} title="Edit profile" subtitle="These details are visible to recruiters when you apply and register for assessments." />
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm font-semibold text-slate-200">Professional headline</span>
          <input
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/45 focus:bg-cyan-300/5"
            maxLength={160}
            placeholder="Example: Full-stack MERN developer | DSA strong | AI recruitment platform builder"
            value={headline}
            onChange={(event) => setHeadline(event.target.value)}
          />
          <span className="mt-1 block text-xs text-slate-500">{headline.length}/160 characters</span>
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-200">Skills recruiters can search</span>
          <textarea
            className="mt-2 h-28 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/45 focus:bg-cyan-300/5"
            placeholder="React, Node.js, MongoDB, Express, DSA, System Design, Tailwind"
            value={skillsText}
            onChange={(event) => setSkillsText(event.target.value)}
          />
          <span className="mt-1 block text-xs text-slate-500">Separate skills with commas. Up to 30 skills are saved.</span>
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-200">Resume URL</span>
          <input
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/45 focus:bg-cyan-300/5"
            placeholder="https://drive.google.com/..."
            value={resumeUrl}
            onChange={(event) => setResumeUrl(event.target.value)}
          />
          <span className="mt-1 block text-xs text-slate-500">Use a public or recruiter-accessible resume link.</span>
        </label>

        {status ? (
          <div
            className={`rounded-2xl border p-3 text-sm ${
              status.type === "success"
                ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
                : "border-rose-400/20 bg-rose-500/10 text-rose-100"
            }`}
          >
            {status.message}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-2xl bg-gradient-to-r from-cyan-300 to-violet-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_28px_rgba(34,211,238,0.18)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving profile..." : "Save profile"}
        </button>
      </form>
    </FuturisticCard>
  );
}

function RecruiterPreviewBlock({ title, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">{title}</p>
      <p className="mt-3 text-sm leading-6 text-slate-300">{value}</p>
    </div>
  );
}

function ProfileField({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

export function CandidateSettingsPage() {
  return (
    <PageFrame eyebrow="Settings" title="Candidate Settings" description="Workspace preferences, privacy controls, and AI coaching defaults.">
      <FuturisticCard glow="slate">
        <WidgetTitle icon={Settings} title="Settings" subtitle="Premium settings surface for candidate experience preferences." />
        <div className="grid gap-3 md:grid-cols-2">
          <SettingsRow title="Dark futuristic theme" description="Enabled by default for the candidate cockpit." />
          <SettingsRow title="AI coaching signals" description="Recommendations are generated from real assessment and coding data." />
          <SettingsRow title="Recruiter visibility" description="Ranking, assessment scores, and reports are available through platform roles." />
          <SettingsRow title="Notification center" description="Assessment and feedback events appear in the candidate signal inbox." />
        </div>
      </FuturisticCard>
    </PageFrame>
  );
}

function SettingsRow({ title, description }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}
