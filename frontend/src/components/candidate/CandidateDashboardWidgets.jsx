import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  ArrowUpRight,
  Bell,
  BrainCircuit,
  CalendarClock,
  Code2,
  Flame,
  Medal,
  Sparkles,
  Target,
  Trophy
} from "lucide-react";
import {
  formatDateTime,
  formatPercent,
  getScoreTone,
  useCandidateDashboard,
  useOptionalCandidateDashboard
} from "../../features/candidate/CandidateDashboardContext.jsx";
import { EmptyState, SkeletonBlock, StatusPill } from "../DashboardPrimitives.jsx";

const toneMap = {
  brand: "border-violet-400/30 bg-violet-500/10 text-violet-100 shadow-violet-500/10",
  emerald: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100 shadow-emerald-500/10",
  amber: "border-amber-400/30 bg-amber-500/10 text-amber-100 shadow-amber-500/10",
  rose: "border-rose-400/30 bg-rose-500/10 text-rose-100 shadow-rose-500/10",
  sky: "border-cyan-400/30 bg-cyan-500/10 text-cyan-100 shadow-cyan-500/10",
  slate: "border-white/10 bg-white/5 text-slate-100 shadow-black/20"
};

export function FuturisticCard({ children, className = "", glow = "brand" }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, scale: 1.005 }}
      transition={{ duration: 0.24 }}
      className={`relative overflow-hidden rounded-[1.75rem] border ${toneMap[glow] || toneMap.brand} p-5 shadow-2xl backdrop-blur-xl ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.16),_transparent_34%)]" />
      <div className="relative">{children}</div>
    </motion.section>
  );
}

export function PageHeader({ eyebrow, title, description, action }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-950 to-indigo-950/80 p-6 shadow-2xl shadow-indigo-950/30"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.18),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(124,58,237,0.22),_transparent_34%)]" />
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">{title}</h1>
          {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{description}</p> : null}
        </div>
        {action}
      </div>
    </motion.header>
  );
}

export function DashboardLoadingState() {
  return (
    <div className="space-y-6">
      <SkeletonBlock className="h-56 rounded-[2rem] bg-white/10" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonBlock key={index} className="h-36 rounded-[1.75rem] bg-white/10" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <SkeletonBlock className="h-80 rounded-[1.75rem] bg-white/10" />
        <SkeletonBlock className="h-80 rounded-[1.75rem] bg-white/10" />
      </div>
    </div>
  );
}

export function HeroOverview() {
  const { metrics, coding, dashboard, profile } = useCandidateDashboard();
  const stats = [
    {
      label: "AI Readiness",
      value: metrics.aiSkillScore == null ? "No data" : formatPercent(metrics.aiSkillScore),
      icon: BrainCircuit,
      tone: "brand"
    },
    {
      label: "Global Rank",
      value: metrics.ranking?.rank ? `#${metrics.ranking.rank}` : "Unranked",
      icon: Trophy,
      tone: "amber"
    },
    {
      label: "Problems Solved",
      value: coding.acceptedSubmissions || 0,
      icon: Code2,
      tone: "emerald"
    },
    {
      label: "Coding Streak",
      value: `${metrics.codingStreakDays || 0}d`,
      icon: Flame,
      tone: "rose"
    },
    {
      label: "Contest Signal",
      value: dashboard?.assessments?.recentScores?.length || 0,
      icon: Medal,
      tone: "sky"
    }
  ];

  return (
    <section className="relative overflow-hidden rounded-[2.2rem] border border-white/10 bg-[linear-gradient(135deg,#020617_0%,#080b1f_42%,#312e81_100%)] p-6 shadow-2xl shadow-indigo-950/50">
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="absolute -bottom-28 left-12 h-72 w-72 rounded-full bg-violet-500/25 blur-3xl" />
      <div className="relative">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">
              <Sparkles size={14} /> Candidate Intelligence
            </p>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white md:text-5xl">
              {profile.name ? `${profile.name}'s AI readiness cockpit` : "AI readiness cockpit"}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
              A data-rich command center for assessments, code execution, ATS readiness, interview signals, and recruiter-grade performance analytics.
            </p>
          </div>
          <Link
            to="/candidate/ai-insights"
            className="group inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur transition hover:border-cyan-300/40 hover:bg-cyan-300/10"
          >
            Open AI insights <ArrowUpRight className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" size={16} />
          </Link>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.article
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                whileHover={{ y: -5 }}
                className={`rounded-[1.5rem] border p-4 shadow-xl backdrop-blur ${toneMap[stat.tone]}`}
              >
                <div className="flex items-center justify-between">
                  <Icon size={20} />
                  <span className="h-2 w-2 rounded-full bg-current shadow-[0_0_18px_currentColor]" />
                </div>
                <p className="mt-5 text-3xl font-semibold text-white">{stat.value}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{stat.label}</p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function SkillRadarGraph() {
  const { skillRadar } = useCandidateDashboard();
  if (!skillRadar.length) {
    return (
      <FuturisticCard glow="brand">
        <WidgetTitle icon={Target} title="Skill Radar" subtitle="Complete assessments to map strengths." />
        <EmptyState title="No skill signal yet" description="Topic and difficulty analytics will power this radar after your first completed assessment." />
      </FuturisticCard>
    );
  }

  return (
    <FuturisticCard glow="brand">
      <WidgetTitle icon={Target} title="Skill Radar" subtitle="Assessment, coding, and AI readiness vectors." />
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={skillRadar}>
            <PolarGrid stroke="rgba(148,163,184,0.25)" />
            <PolarAngleAxis dataKey="skill" tick={{ fill: "#cbd5e1", fontSize: 12 }} />
            <Radar dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.35} />
            <Tooltip contentStyle={{ background: "#020617", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, color: "#fff" }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </FuturisticCard>
  );
}

export function CodingActivityHeatmap() {
  const { coding } = useCandidateDashboard();
  const activity = coding.activity || [];
  const active = new Map(activity.map((item) => [item.day, item]));
  const today = new Date();
  const cells = Array.from({ length: 84 }).map((_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (83 - index));
    const key = date.toISOString().slice(0, 10);
    const row = active.get(key);
    const intensity = Math.min(4, row ? Math.max(1, Math.ceil((row.submissions || 1) / 2)) : 0);
    return { key, intensity, submissions: row?.submissions || 0 };
  });

  return (
    <FuturisticCard glow="emerald">
      <WidgetTitle icon={Flame} title="Coding Activity" subtitle="Last 12 weeks of submission activity." />
      <div className="grid grid-cols-12 gap-1.5">
        {cells.map((cell) => (
          <div
            key={cell.key}
            title={`${cell.key}: ${cell.submissions} submissions`}
            className={[
              "aspect-square rounded-[0.35rem] border border-white/5 transition hover:scale-125",
              cell.intensity === 0 ? "bg-white/5" : "",
              cell.intensity === 1 ? "bg-emerald-900/80" : "",
              cell.intensity === 2 ? "bg-emerald-700" : "",
              cell.intensity === 3 ? "bg-emerald-500" : "",
              cell.intensity >= 4 ? "bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.45)]" : ""
            ].join(" ")}
          />
        ))}
      </div>
    </FuturisticCard>
  );
}

export function ContestRatingTrendChart() {
  const { contestTrend } = useCandidateDashboard();
  return (
    <FuturisticCard glow="sky">
      <WidgetTitle icon={Trophy} title="Contest Rating Trend" subtitle="Derived from completed competitive assessments." />
      {contestTrend.length ? (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={contestTrend}>
              <CartesianGrid stroke="rgba(148,163,184,0.14)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} width={40} />
              <Tooltip contentStyle={{ background: "#020617", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, color: "#fff" }} />
              <Line type="monotone" dataKey="rating" stroke="#22d3ee" strokeWidth={3} dot={{ r: 4, fill: "#22d3ee" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState title="No contest trend yet" description="Contest participation and completed timed rounds will populate this chart." />
      )}
    </FuturisticCard>
  );
}

export function ScoreTrendAreaChart() {
  const { assessments } = useCandidateDashboard();
  const data = assessments.scoreTrend || [];
  return (
    <FuturisticCard glow="brand">
      <WidgetTitle icon={BrainCircuit} title="Performance Analytics" subtitle="Recent assessment score distribution." />
      {data.length ? (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="scoreGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(148,163,184,0.14)" vertical={false} />
              <XAxis dataKey="examTitle" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 11 }} width={34} />
              <Tooltip contentStyle={{ background: "#020617", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, color: "#fff" }} />
              <Area type="monotone" dataKey="scorePercent" stroke="#8b5cf6" fill="url(#scoreGradient)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState title="No assessment scores yet" description="Submit assessments to unlock score trend analytics." />
      )}
    </FuturisticCard>
  );
}

export function AiInsightsPanel() {
  const { aiInsights } = useCandidateDashboard();
  return (
    <FuturisticCard glow="brand">
      <WidgetTitle icon={Sparkles} title="AI Insights Panel" subtitle="Model-guided readiness signals." />
      <div className="space-y-3">
        {aiInsights.map((insight) => (
          <article key={insight.title} className={`rounded-2xl border p-4 ${toneMap[insight.tone] || toneMap.brand}`}>
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-current shadow-[0_0_16px_currentColor]" />
              <h3 className="font-semibold text-white">{insight.title}</h3>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-300">{insight.description}</p>
          </article>
        ))}
      </div>
    </FuturisticCard>
  );
}

export function ResumeAtsScoreCard() {
  const ctx = useOptionalCandidateDashboard();
  if (!ctx) {
    return (
      <FuturisticCard glow="slate">
        <WidgetTitle
          icon={Target}
          title="Resume ATS score"
          subtitle="Personal readiness ring is available when this view is opened from a candidate account."
        />
        <EmptyState
          title="Analyze on the right"
          description="Paste resume text and an optional job description to run ATS-style feedback here. Candidate dashboards also combine assessments and coding signals into the circular score."
        />
      </FuturisticCard>
    );
  }

  const { dashboard, metrics } = ctx;
  const score = metrics.aiSkillScore ?? metrics.averageScore ?? 0;
  const circumference = 2 * Math.PI * 44;

  return (
    <FuturisticCard glow={getScoreTone(score)}>
      <WidgetTitle icon={Target} title="Resume ATS Circular Score" subtitle="Readiness proxy from available AI signals." />
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div className="relative grid place-items-center">
          <svg viewBox="0 0 112 112" className="h-36 w-36 -rotate-90">
            <circle cx="56" cy="56" r="44" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="12" />
            <circle
              cx="56"
              cy="56"
              r="44"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="12"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - Math.min(100, Number(score) || 0) / 100)}
            />
          </svg>
          <span className="absolute text-3xl font-semibold text-white">{Math.round(Number(score) || 0)}</span>
        </div>
        <div className="max-w-xs">
          <StatusPill tone={dashboard?.resume?.hasResume ? "emerald" : "amber"}>
            {dashboard?.resume?.hasResume ? "Resume connected" : "Resume analysis pending"}
          </StatusPill>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Resume and AI feedback signals are combined with assessment performance to estimate recruiter readiness.
          </p>
          <Link to="/candidate/resume-analyzer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-cyan-200">
            Improve ATS score <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    </FuturisticCard>
  );
}

export function UpcomingAssessmentsWidget() {
  const { assessments } = useCandidateDashboard();
  const upcoming = assessments.upcoming || [];
  return (
    <FuturisticCard glow="amber">
      <WidgetTitle icon={CalendarClock} title="Upcoming Assessments" subtitle="Live and scheduled hiring rounds." />
      {upcoming.length ? (
        <div className="space-y-3">
          {upcoming.map((item) => (
            <article key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-white">{item.title}</h3>
                  <p className="mt-1 text-sm text-slate-400">{item.durationMinutes} minutes</p>
                </div>
                <StatusPill tone={item.status === "in_progress" ? "amber" : "sky"}>{item.status.replace("_", " ")}</StatusPill>
              </div>
              <p className="mt-3 text-xs text-slate-400">Ends {formatDateTime(item.endTime)}</p>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No open assessments" description="Assigned assessments will appear here with start/resume actions." />
      )}
    </FuturisticCard>
  );
}

export function AiRecommendationCards() {
  const ctx = useOptionalCandidateDashboard();
  if (!ctx) {
    return (
      <FuturisticCard glow="brand">
        <WidgetTitle icon={Sparkles} title="AI recommendations" subtitle="Candidate workspace feature." />
        <EmptyState
          title="No candidate signals here"
          description="Personalized next steps are built from each candidate's assessments and coding history. Use the form above to review any resume text in this workspace."
        />
      </FuturisticCard>
    );
  }

  const { recommendations } = ctx;
  return (
    <FuturisticCard glow="brand">
      <WidgetTitle icon={Sparkles} title="AI Recommendation Cards" subtitle="Next best actions from real platform signals." />
      {recommendations.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {recommendations.map((item) => (
            <Link key={`${item.type}-${item.title}`} to={item.href} className="group rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-300/30 hover:bg-cyan-300/10">
              <div className="flex items-start justify-between gap-3">
                <StatusPill tone={item.priority === "high" ? "rose" : "amber"}>{item.priority}</StatusPill>
                <ArrowUpRight className="text-slate-400 transition group-hover:text-cyan-200" size={16} />
              </div>
              <h3 className="mt-4 font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{item.description}</p>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title="No recommendations yet" description="The AI coach will generate recommendations after candidate activity exists." />
      )}
    </FuturisticCard>
  );
}

export function RecentActivityFeed() {
  const { activityFeed } = useCandidateDashboard();
  return (
    <FuturisticCard glow="slate">
      <WidgetTitle icon={Bell} title="Recent Activity Feed" subtitle="Latest candidate actions and platform events." />
      {activityFeed.length ? (
        <div className="space-y-3">
          {activityFeed.map((item) => (
            <article key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">{item.type}</p>
                  <h3 className="mt-1 font-semibold text-white">{item.title}</h3>
                  <p className="mt-1 text-sm text-slate-400">{item.description}</p>
                </div>
                <span className="text-xs text-slate-500">{formatDateTime(item.timestamp)}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No activity yet" description="Assessment, coding, notification, and AI events will stream here." />
      )}
    </FuturisticCard>
  );
}

export function WidgetTitle({ icon: Icon, title, subtitle }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="rounded-2xl border border-white/10 bg-white/10 p-2 text-cyan-200">
        <Icon size={18} />
      </div>
      <div>
        <h2 className="font-semibold text-white">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
      </div>
    </div>
  );
}
