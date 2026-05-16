import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Activity, CalendarClock, ClipboardList } from "lucide-react";
import { getRecruiterDashboardAnalytics } from "../../features/recruiter/recruiterDashboardApi.js";

function StatCard({ label, value, sub, icon: Icon, delay }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="relative overflow-hidden rounded-3xl border border-[color:var(--recruiter-border)] bg-[color:var(--recruiter-surface)] p-5 shadow-sm dark:shadow-black/30"
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-cyan-500/10 blur-2xl" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--recruiter-muted)]">{label}</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
          {sub ? <p className="mt-1 text-xs text-[color:var(--recruiter-muted)]">{sub}</p> : null}
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-600 dark:text-cyan-200">
          <Icon size={20} />
        </div>
      </div>
    </motion.article>
  );
}

export default function RecruiterHomePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getRecruiterDashboardAnalytics({ limit: 10 })
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((e) => {
        if (alive) setError(e.response?.data?.message || "Failed to load dashboard");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const metrics = data?.metrics || {};
  const activity = useMemo(() => {
    const attempts = (data?.recentAttempts || []).slice(0, 8).map((a) => ({
      id: a.id,
      title: `${a.candidate?.name || "Candidate"} — ${a.exam?.title || "Assessment"}`,
      detail: a.scorePercent != null ? `${Number(a.scorePercent).toFixed(1)}%` : a.status || "",
      at: a.submittedAt
    }));
    const notes = (data?.notifications?.latest || []).slice(0, 5).map((n) => ({
      id: n._id,
      title: n.title || n.type,
      detail: "",
      at: n.createdAt
    }));
    return [...attempts, ...notes]
      .filter((x) => x.at)
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 12);
  }, [data]);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 animate-pulse rounded-xl bg-slate-200 dark:bg-white/10" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-3xl bg-slate-200 dark:bg-white/10" />
          ))}
        </div>
      </div>
    );
  }

  const activeAssessments = (metrics.scheduledAssessments || 0) + (metrics.activeAssessments || 0);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--recruiter-muted)]">Home</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Overview</h1>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--recruiter-muted)]">
          Key hiring signals synced with candidate registrations, attempts, and interviews.
        </p>
      </header>

      {error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-100">{error}</div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Active assessments"
          value={activeAssessments}
          sub="Scheduled + live"
          icon={ClipboardList}
          delay={0}
        />
        <StatCard
          label="Upcoming interviews"
          value={metrics.interviewsScheduled ?? 0}
          sub="Scheduled rounds"
          icon={CalendarClock}
          delay={0.05}
        />
        <StatCard
          label="Recent activity"
          value={activity.length}
          sub="Signals in feed below"
          icon={Activity}
          delay={0.1}
        />
      </section>

      <section className="rounded-3xl border border-[color:var(--recruiter-border)] bg-[color:var(--recruiter-surface)] p-5 dark:bg-slate-950/50">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Recent activity</h2>
        <p className="mt-1 text-xs text-[color:var(--recruiter-muted)]">Latest submissions and platform notifications</p>
        <ul className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1 text-sm">
          {activity.length ? (
            activity.map((row) => (
              <li key={row.id} className="rounded-2xl border border-[color:var(--recruiter-border)] bg-white/50 px-3 py-2 dark:bg-white/[0.04]">
                <p className="font-medium text-slate-800 dark:text-slate-100">{row.title}</p>
                <div className="mt-1 flex justify-between text-xs text-[color:var(--recruiter-muted)]">
                  <span>{row.detail || "—"}</span>
                  <span>{row.at ? new Date(row.at).toLocaleString() : ""}</span>
                </div>
              </li>
            ))
          ) : (
            <li className="text-sm text-[color:var(--recruiter-muted)]">No recent activity.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
