const toneClasses = {
  brand: "from-brand-500/20 to-violet-500/5 text-brand-700 dark:text-brand-200",
  emerald: "from-emerald-500/20 to-teal-500/5 text-emerald-700 dark:text-emerald-200",
  amber: "from-amber-500/20 to-orange-500/5 text-amber-700 dark:text-amber-200",
  sky: "from-sky-500/20 to-cyan-500/5 text-sky-700 dark:text-sky-200",
  rose: "from-rose-500/20 to-pink-500/5 text-rose-700 dark:text-rose-200",
  slate: "from-slate-500/15 to-slate-500/5 text-slate-700 dark:text-slate-200"
};

export const DashboardCard = ({ id, title, eyebrow, action, children, className = "" }) => (
  <section
    id={id}
    className={`rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm shadow-slate-200/60 backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/80 dark:shadow-black/20 ${className}`}
  >
    {(title || eyebrow || action) && (
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{eyebrow}</p>
          ) : null}
          {title ? <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{title}</h2> : null}
        </div>
        {action}
      </div>
    )}
    {children}
  </section>
);

export const MetricCard = ({ label, value, description, tone = "brand", loading = false }) => (
  <article className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-950/60">
    <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${toneClasses[tone] || toneClasses.brand}`} />
    <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</p>
    {loading ? (
      <SkeletonBlock className="mt-4 h-8 w-24" />
    ) : (
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{value}</p>
    )}
    {description ? <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
  </article>
);

export const ProgressBar = ({ value = 0, label, tone = "brand" }) => {
  const safeValue = Math.min(100, Math.max(0, Number(value) || 0));

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span>{label}</span>
        <span>{safeValue.toFixed(1)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div className={`h-full rounded-full bg-gradient-to-r ${toneClasses[tone] || toneClasses.brand}`} style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
};

export const SkeletonBlock = ({ className = "" }) => (
  <div className={`animate-pulse rounded-xl bg-slate-200/80 dark:bg-slate-700/80 ${className}`} />
);

export const EmptyState = ({ title, description, action }) => (
  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-5 text-sm dark:border-slate-700 dark:bg-slate-950/50">
    <p className="font-medium text-slate-900 dark:text-slate-100">{title}</p>
    {description ? <p className="mt-1 text-slate-500 dark:text-slate-400">{description}</p> : null}
    {action ? <div className="mt-4">{action}</div> : null}
  </div>
);

export const StatusPill = ({ children, tone = "slate" }) => (
  <span
    className={`inline-flex items-center rounded-full border border-current/10 bg-gradient-to-r px-2.5 py-1 text-xs font-semibold ${
      toneClasses[tone] || toneClasses.slate
    }`}
  >
    {children}
  </span>
);
