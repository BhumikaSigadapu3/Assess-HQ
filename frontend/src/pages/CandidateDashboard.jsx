import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  DashboardCard,
  EmptyState,
  MetricCard,
  ProgressBar,
  SkeletonBlock,
  StatusPill
} from "../components/DashboardPrimitives.jsx";
import { getCandidateDashboardAnalytics } from "../features/exam/candidateDashboardApi.js";

const sections = [
  ["overview", "Overview"],
  ["assessments", "Assessments"],
  ["coding-arena", "Coding Arena"],
  ["interviews", "Interviews"],
  ["leaderboard", "Leaderboard"],
  ["resume-analyzer", "Resume Analyzer"],
  ["ai-feedback", "AI Feedback"],
  ["analytics", "Analytics"],
  ["notifications", "Notifications"],
  ["profile", "Profile"]
];

const formatDate = (value) => {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
};

const formatPercent = (value, empty = "No data") => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return empty;
  return `${Number(value).toFixed(1)}%`;
};

const statusTone = {
  in_progress: "amber",
  ready: "emerald",
  scheduled: "sky",
  submitted: "emerald",
  auto_submitted: "amber",
  accepted: "emerald",
  completed: "sky"
};

const priorityTone = {
  high: "rose",
  medium: "amber",
  low: "sky"
};

const sectionVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 }
};

function LoadingDashboard() {
  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-950">
        <SkeletonBlock className="h-6 w-56" />
        <SkeletonBlock className="mt-3 h-4 w-full max-w-xl" />
        <div className="mt-6 grid gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-28" />
          ))}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonBlock key={index} className="h-72 rounded-3xl" />
        ))}
      </div>
    </section>
  );
}

function ScoreTrendChart({ scores }) {
  if (!scores?.length) {
    return <EmptyState title="No score trend yet" description="Complete an assessment to unlock trend analytics." />;
  }

  const points =
    scores.length === 1
      ? `0,${100 - scores[0].scorePercent} 100,${100 - scores[0].scorePercent}`
      : scores
          .map((score, index) => {
            const x = (index / (scores.length - 1)) * 100;
            const y = 100 - Math.min(100, Math.max(0, Number(score.scorePercent) || 0));
            return `${x},${y}`;
          })
          .join(" ");

  return (
    <div>
      <svg viewBox="0 0 100 100" className="h-40 w-full overflow-visible rounded-2xl bg-slate-50 p-3 dark:bg-slate-950">
        <polyline fill="none" stroke="currentColor" strokeWidth="3" points={points} className="text-brand-600 dark:text-brand-500" />
      </svg>
      <div className="mt-3 grid gap-2 text-xs text-slate-500 dark:text-slate-400 sm:grid-cols-2">
        {scores.map((score) => (
          <div key={score.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950">
            <span className="truncate">{score.examTitle}</span>
            <span className="font-semibold text-slate-800 dark:text-slate-100">{formatPercent(score.scorePercent)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AssessmentList({ assessments }) {
  if (!assessments?.length) {
    return (
      <EmptyState
        title="No open assessments"
        description="Scheduled and active assessments assigned to you will appear here."
      />
    );
  }

  return (
    <div className="space-y-3">
      {assessments.map((assessment) => (
        <article key={assessment.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-slate-950 dark:text-white">{assessment.title}</h3>
                <StatusPill tone={statusTone[assessment.status]}>{assessment.status.replace("_", " ")}</StatusPill>
              </div>
              {assessment.description ? (
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{assessment.description}</p>
              ) : null}
            </div>
            <Link
              to={`/candidate/exams/${assessment.id}`}
              className="rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-600/30 transition hover:bg-brand-500"
            >
              {assessment.status === "in_progress" ? "Resume" : "Open"}
            </Link>
          </div>
          <div className="mt-4 grid gap-2 text-sm text-slate-500 dark:text-slate-400 sm:grid-cols-3">
            <span>{assessment.durationMinutes} min</span>
            <span>Starts {formatDate(assessment.startTime)}</span>
            <span>Ends {formatDate(assessment.endTime)}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

function RecommendationList({ recommendations }) {
  if (!recommendations?.length) {
    return (
      <EmptyState
        title="No automated recommendations yet"
        description="Recommendations are generated after assessments, coding submissions, interviews, or resume evidence exists."
      />
    );
  }

  return (
    <div className="space-y-3">
      {recommendations.map((item) => (
        <article key={`${item.type}-${item.title}`} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <StatusPill tone={priorityTone[item.priority]}>{item.priority} priority</StatusPill>
              <h3 className="mt-3 font-semibold text-slate-950 dark:text-white">{item.title}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.description}</p>
            </div>
            <Link className="text-sm font-semibold text-brand-700 dark:text-brand-300" to={item.href}>
              {item.actionLabel}
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

function CodingSubmissionList({ submissions }) {
  if (!submissions?.length) {
    return <EmptyState title="No coding submissions" description="Submitted coding solutions will populate this activity feed." />;
  }

  return (
    <div className="space-y-3">
      {submissions.map((submission) => (
        <article key={submission.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-medium text-slate-950 dark:text-white">{submission.questionTitle || "Coding challenge"}</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {submission.language} - {formatDate(submission.createdAt)}
              </p>
            </div>
            <StatusPill tone={statusTone[submission.status]}>{submission.status}</StatusPill>
          </div>
          <div className="mt-3">
            <ProgressBar label="Submission score" value={submission.score} tone={submission.status === "accepted" ? "emerald" : "sky"} />
          </div>
        </article>
      ))}
    </div>
  );
}

export default function CandidateDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getCandidateDashboardAnalytics({ limit: 8 });
        if (active) setDashboard(data);
      } catch (err) {
        if (active) setError(err.response?.data?.message || "Failed to load candidate analytics");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadDashboard();
    return () => {
      active = false;
    };
  }, []);

  const metrics = dashboard?.metrics || {};
  const ranking = metrics.ranking || {};
  const profile = dashboard?.profile || {};
  const assessments = dashboard?.assessments || {};
  const coding = dashboard?.coding || {};
  const interviews = dashboard?.interviews || {};
  const notifications = dashboard?.notifications || {};

  const metricCards = useMemo(
    () => [
      {
        label: "AI skill score",
        value: metrics.aiSkillScore === null || metrics.aiSkillScore === undefined ? "No data" : formatPercent(metrics.aiSkillScore),
        description: "Weighted from submitted assessments, coding, and interview evidence.",
        tone: "brand"
      },
      {
        label: "Recent average",
        value: metrics.completedAssessments ? formatPercent(metrics.averageScore) : "No scores",
        description: `${metrics.completedAssessments || 0} completed assessment${metrics.completedAssessments === 1 ? "" : "s"}.`,
        tone: "emerald"
      },
      {
        label: "Coding streak",
        value: `${metrics.codingStreakDays || 0} day${metrics.codingStreakDays === 1 ? "" : "s"}`,
        description: `${coding.activeDaysLast120 || 0} active day${coding.activeDaysLast120 === 1 ? "" : "s"} in the last 120 days.`,
        tone: "amber"
      },
      {
        label: "Leaderboard",
        value: ranking.rank ? `#${ranking.rank}` : "Unranked",
        description: ranking.cohortSize ? `${ranking.cohortSize} candidates in scored cohort.` : "Submit an assessment to enter ranking.",
        tone: "sky"
      }
    ],
    [coding.activeDaysLast120, metrics, ranking]
  );

  if (loading) return <LoadingDashboard />;

  return (
    <section className="space-y-6">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <motion.section
        id="overview"
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-xl shadow-slate-200/70 dark:border-slate-800 dark:shadow-black/30"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(109,40,217,0.45),_transparent_40%),linear-gradient(135deg,_rgba(15,23,42,1),_rgba(30,41,59,0.96))]" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-200">AI career cockpit</p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                {profile.name ? `${profile.name}'s dashboard` : "Candidate dashboard"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                Track live assessments, coding performance, AI feedback, weak topics, ranking, and readiness signals from real activity.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950" to="/candidate/workspace/coding">
                Open coding arena
              </Link>
              <Link className="rounded-xl border border-white/30 px-4 py-2 text-sm font-semibold text-white" to="/insights/ai">
                AI coach
              </Link>
            </div>
          </div>
          <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
            {sections.map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                className="whitespace-nowrap rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-100 backdrop-blur transition hover:bg-white/20"
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </motion.section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <DashboardCard id="assessments" title="Upcoming Assessments" eyebrow="Assessments">
          <AssessmentList assessments={assessments.upcoming} />
        </DashboardCard>

        <DashboardCard title="Recent Scores" eyebrow="Score Trend">
          <ScoreTrendChart scores={assessments.scoreTrend} />
        </DashboardCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <DashboardCard id="coding-arena" title="Coding Arena" eyebrow="LeetCode-style activity">
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard label="Submissions" value={coding.totalSubmissions || 0} tone="sky" />
            <MetricCard label="Accepted" value={coding.acceptedSubmissions || 0} tone="emerald" />
            <MetricCard label="Avg score" value={formatPercent(coding.averageScore)} tone="brand" />
          </div>
          <div className="mt-5 space-y-3">
            <ProgressBar label="Acceptance rate" value={coding.acceptanceRate} tone="emerald" />
            <ProgressBar label="Best coding score" value={coding.bestScore} tone="brand" />
          </div>
        </DashboardCard>

        <DashboardCard title="Recent Coding Submissions" eyebrow="Activity">
          <CodingSubmissionList submissions={coding.recentSubmissions} />
        </DashboardCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <DashboardCard id="interviews" title="Interviews" eyebrow="AI career coach">
          {interviews.count ? (
            <div className="space-y-4">
              <ProgressBar label="Communication" value={interviews.averageCommunicationScore} tone="sky" />
              <ProgressBar label="Confidence" value={interviews.averageConfidenceScore} tone="emerald" />
              <ProgressBar label="Sentiment" value={interviews.averageSentimentScore} tone="brand" />
              {interviews.latestFeedback?.aiFeedback?.recommendation ? (
                <p className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                  {interviews.latestFeedback.aiFeedback.recommendation}
                </p>
              ) : null}
            </div>
          ) : (
            <EmptyState title="No interview feedback yet" description="AI interview feedback appears after an interview analysis is saved." />
          )}
        </DashboardCard>

        <DashboardCard id="leaderboard" title="Leaderboard" eyebrow="Ranking">
          <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-950">
            <p className="text-sm text-slate-500 dark:text-slate-400">Current rank</p>
            <p className="mt-2 text-4xl font-semibold text-slate-950 dark:text-white">{ranking.rank ? `#${ranking.rank}` : "Unranked"}</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {ranking.percentile ? `${formatPercent(ranking.percentile)} percentile` : "Complete an assessment to join the scored cohort."}
            </p>
          </div>
        </DashboardCard>

        <DashboardCard id="resume-analyzer" title="Resume Analyzer" eyebrow="ATS readiness">
          {dashboard?.resume?.hasResume ? (
            <div className="space-y-3">
              <StatusPill tone="emerald">Resume connected</StatusPill>
              <p className="text-sm text-slate-500 dark:text-slate-400">Your stored resume is available for AI coaching workflows.</p>
              <Link className="text-sm font-semibold text-brand-700 dark:text-brand-300" to="/insights/ai">
                Run analysis
              </Link>
            </div>
          ) : (
            <EmptyState
              title="No resume evidence yet"
              description="Use the AI insights workspace to analyze resume text against target roles."
              action={
                <Link className="rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white" to="/insights/ai">
                  Open resume analyzer
                </Link>
              }
            />
          )}
        </DashboardCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <DashboardCard id="ai-feedback" title="AI Feedback & Recommendations" eyebrow="Career coach">
          {dashboard?.aiFeedback?.latestReportSummary || dashboard?.aiFeedback?.latestInterviewRecommendation ? (
            <div className="mb-4 space-y-3">
              {dashboard.aiFeedback.latestReportSummary ? (
                <p className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                  {dashboard.aiFeedback.latestReportSummary}
                </p>
              ) : null}
              {dashboard.aiFeedback.latestInterviewRecommendation ? (
                <p className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                  {dashboard.aiFeedback.latestInterviewRecommendation}
                </p>
              ) : null}
            </div>
          ) : null}
          <RecommendationList recommendations={dashboard?.recommendations} />
        </DashboardCard>

        <DashboardCard id="analytics" title="Weak Topic Analysis" eyebrow="Analytics">
          {assessments.weakTopics?.length ? (
            <div id="weak-topics" className="space-y-4">
              {assessments.weakTopics.map((topic) => (
                <ProgressBar
                  key={topic.topic}
                  label={`${topic.topic} accuracy (${topic.correct}/${topic.attempted})`}
                  value={topic.accuracy}
                  tone={topic.accuracy >= 70 ? "emerald" : topic.accuracy >= 45 ? "amber" : "rose"}
                />
              ))}
            </div>
          ) : (
            <EmptyState title="No weak topics yet" description="Topic-level analytics are calculated from completed MCQ assessments." />
          )}
          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-semibold text-slate-950 dark:text-white">Difficulty breakdown</h3>
            {assessments.difficultyBreakdown?.length ? (
              assessments.difficultyBreakdown.map((item) => (
                <ProgressBar key={item.difficulty} label={item.difficulty} value={item.accuracy} tone="sky" />
              ))
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">Complete an assessment to compare easy, medium, and hard accuracy.</p>
            )}
          </div>
        </DashboardCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <DashboardCard id="notifications" title="Notifications" eyebrow={`${notifications.unreadCount || 0} unread`}>
          {notifications.latest?.length ? (
            <div className="space-y-3">
              {notifications.latest.map((notification) => (
                <article key={notification._id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-slate-950 dark:text-white">{notification.title || notification.type}</h3>
                      {notification.message ? (
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{notification.message}</p>
                      ) : null}
                    </div>
                    {!notification.isRead ? <StatusPill tone="brand">New</StatusPill> : null}
                  </div>
                  <p className="mt-2 text-xs text-slate-400">{formatDate(notification.createdAt)}</p>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="No notifications" description="Assessment updates, reminders, and feedback events will appear here." />
          )}
        </DashboardCard>

        <DashboardCard id="profile" title="Profile" eyebrow="Candidate">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Email</p>
              <p className="font-medium text-slate-950 dark:text-white">{profile.email || "Not available"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Headline</p>
              <p className="font-medium text-slate-950 dark:text-white">{profile.headline || "No headline added"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Skills</p>
              {profile.skills?.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {profile.skills.map((skill) => (
                    <StatusPill key={skill} tone="slate">
                      {skill}
                    </StatusPill>
                  ))}
                </div>
              ) : (
                <p className="font-medium text-slate-950 dark:text-white">No skills added</p>
              )}
            </div>
            <p className="text-xs text-slate-400">Member since {formatDate(profile.memberSince)}</p>
          </div>
        </DashboardCard>
      </div>
    </section>
  );
}
