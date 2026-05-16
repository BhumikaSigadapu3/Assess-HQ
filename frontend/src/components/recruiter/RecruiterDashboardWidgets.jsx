import { motion } from "framer-motion";
import { AlertTriangle, ArrowUpRight, BarChart3, BrainCircuit, CalendarClock, FileText, ShieldCheck } from "lucide-react";
import { ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, Tooltip, AreaChart, Area, CartesianGrid, XAxis, YAxis, BarChart, Bar } from "recharts";

export const formatPercent = (value, empty = "No data") => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return empty;
  return `${Number(value).toFixed(1)}%`;
};

export const formatDate = (value) => {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
};

const toneClasses = {
  cyan: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100 shadow-cyan-500/10",
  violet: "border-violet-300/25 bg-violet-400/10 text-violet-100 shadow-violet-500/10",
  emerald: "border-emerald-300/25 bg-emerald-400/10 text-emerald-100 shadow-emerald-500/10",
  amber: "border-amber-300/25 bg-amber-400/10 text-amber-100 shadow-amber-500/10",
  rose: "border-rose-300/25 bg-rose-400/10 text-rose-100 shadow-rose-500/10",
  slate: "border-white/10 bg-white/[0.04] text-slate-100 shadow-black/20"
};

export function RecruiterCard({ id, children, className = "", tone = "slate" }) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.22 }}
      className={`relative overflow-hidden rounded-[1.75rem] border p-5 shadow-2xl backdrop-blur-xl ${toneClasses[tone]} ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.12),_transparent_30%)]" />
      <div className="relative">{children}</div>
    </motion.section>
  );
}

export function RecruiterHero({ metrics = {} }) {
  const stats = [
    ["Assessments", metrics.totalAssessments || 0, "Active hiring assets"],
    ["Candidates", metrics.totalCandidates || 0, "Candidates in pipeline"],
    ["Avg Score", metrics.completedAttempts ? formatPercent(metrics.averageScore) : "No scores", "Submitted attempts"],
    ["Live Attempts", metrics.liveAttempts || 0, "Monitoring hooks"]
  ];

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,#020617_0%,#0b1024_45%,#312e81_100%)] p-6 text-white shadow-2xl shadow-indigo-950/40">
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="absolute -bottom-24 left-16 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="relative">
        <p className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">
          <BrainCircuit size={14} /> Recruiter Intelligence OS
        </p>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Enterprise hiring command center</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
              Create assessments, manage candidates, schedule interviews, monitor live attempts, and generate hiring-grade analytics from one AI-powered cockpit.
            </p>
          </div>
          <a href="#create-assessment" className="inline-flex items-center gap-2 rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950">
            Create assessment <ArrowUpRight size={16} />
          </a>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map(([label, value, description]) => (
            <article key={label} className="rounded-3xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
              <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
              <p className="mt-1 text-sm text-slate-400">{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function WidgetTitle({ icon: Icon = BarChart3, title, subtitle }) {
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

export function RecruiterEmptyState({ title, description }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-5 text-sm">
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-1 text-slate-400">{description}</p>
    </div>
  );
}

export function StatusPill({ children, tone = "slate" }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClasses[tone]}`}>{children}</span>;
}

export function ScoreTrendChart({ data = [] }) {
  return (
    <RecruiterCard tone="violet">
      <WidgetTitle icon={BarChart3} title="Performance Trend" subtitle="Assessment score movement across recent submissions." />
      {data.length ? (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="recruiterScore" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(148,163,184,0.14)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="scorePercent" stroke="#8b5cf6" fill="url(#recruiterScore)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <RecruiterEmptyState title="No score trend yet" description="Submitted candidate attempts will populate recruiter analytics." />
      )}
    </RecruiterCard>
  );
}

export function DifficultyChart({ data = [] }) {
  return (
    <RecruiterCard tone="cyan">
      <WidgetTitle icon={ShieldCheck} title="Difficulty Analytics" subtitle="Accuracy by difficulty band." />
      {data.length ? (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid stroke="rgba(148,163,184,0.14)" vertical={false} />
              <XAxis dataKey="difficulty" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="accuracy" fill="#22d3ee" radius={[12, 12, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <RecruiterEmptyState title="No difficulty data" description="Completed assessments with topic analytics will unlock this chart." />
      )}
    </RecruiterCard>
  );
}

export function TopicRadar({ data = [] }) {
  const radarData = data.map((row) => ({ topic: row.topic, accuracy: row.accuracy }));
  return (
    <RecruiterCard tone="emerald">
      <WidgetTitle icon={AlertTriangle} title="Weak Topic Radar" subtitle="Low-accuracy topics for candidate cohorts." />
      {radarData.length ? (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(148,163,184,0.25)" />
              <PolarAngleAxis dataKey="topic" tick={{ fill: "#cbd5e1", fontSize: 12 }} />
              <Radar dataKey="accuracy" stroke="#10b981" fill="#10b981" fillOpacity={0.32} />
              <Tooltip contentStyle={tooltipStyle} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <RecruiterEmptyState title="No topic analytics yet" description="Topic breakdown appears after MCQ assessments are submitted." />
      )}
    </RecruiterCard>
  );
}

export function RecentAttemptsTable({ attempts = [], onGenerateReport }) {
  return (
    <RecruiterCard tone="slate">
      <WidgetTitle icon={FileText} title="Recent Attempts" subtitle="Candidate performance and report generation." />
      {attempts.length ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="px-3 py-2">Candidate</th>
                <th className="px-3 py-2">Assessment</th>
                <th className="px-3 py-2">Score</th>
                <th className="px-3 py-2">Submitted</th>
                <th className="px-3 py-2">Report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {attempts.map((attempt) => (
                <tr key={attempt.id} className="text-slate-300">
                  <td className="px-3 py-3">
                    <p className="font-semibold text-white">{attempt.candidate?.name || "Candidate"}</p>
                    <p className="text-xs text-slate-500">{attempt.candidate?.email}</p>
                  </td>
                  <td className="px-3 py-3">{attempt.exam?.title || "Assessment"}</td>
                  <td className="px-3 py-3">{formatPercent(attempt.scorePercent)}</td>
                  <td className="px-3 py-3">{formatDate(attempt.submittedAt)}</td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100"
                      onClick={() => onGenerateReport?.(attempt)}
                    >
                      Generate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <RecruiterEmptyState title="No submitted attempts" description="Candidate submissions will appear here for monitoring and report generation." />
      )}
    </RecruiterCard>
  );
}

export function LiveMonitoringPanel({ metrics = {}, interviews = [] }) {
  return (
    <RecruiterCard tone="rose">
      <WidgetTitle icon={CalendarClock} title="Live Monitoring Hooks" subtitle="Operational signals for active assessments and interviews." />
      <div className="grid gap-3 sm:grid-cols-3">
        <Signal label="Live attempts" value={metrics.liveAttempts || 0} />
        <Signal label="Active assessments" value={metrics.activeAssessments || 0} />
        <Signal label="Scheduled interviews" value={metrics.interviewsScheduled || 0} />
      </div>
      <div className="mt-4 space-y-2">
        {interviews.slice(0, 3).map((interview) => (
          <div key={interview._id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm">
            <p className="font-semibold text-white">{interview.candidateId?.name || "Candidate"} - {interview.roundType}</p>
            <p className="text-slate-400">{formatDate(interview.scheduledAt)}</p>
          </div>
        ))}
      </div>
    </RecruiterCard>
  );
}

function Signal({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}

const tooltipStyle = {
  background: "#020617",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 16,
  color: "#fff"
};
