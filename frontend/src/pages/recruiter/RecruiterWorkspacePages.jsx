import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarClock, Plus } from "lucide-react";
import AssessmentBuildForm from "../../components/recruiter/AssessmentBuildForm.jsx";
import {
  getExamCandidateProfile,
  getExamLeaderboard,
  getRecruiterDashboardAnalytics,
  getRecruiterExamsSummary,
  getRecruiterExamOverview,
  getRecruiterHiringShortlist,
  listRecruiterInterviews,
  patchRecruiterExam,
  patchRecruiterInterview,
  postExamShortlist,
  scheduleRecruiterInterview
} from "../../features/recruiter/recruiterDashboardApi.js";

const inputClass =
  "w-full rounded-2xl border border-[color:var(--recruiter-border)] bg-white/80 px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500/50 dark:bg-white/[0.06] dark:text-slate-100 dark:placeholder:text-slate-500";

export function mapExamUiStatus(status) {
  const map = {
    draft: "Draft",
    scheduled: "Registration open",
    active: "Ongoing",
    completed: "Completed"
  };
  return map[status] || status;
}

function displayStatusTone(displayStatus) {
  if (displayStatus === "ongoing") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200";
  if (displayStatus === "registration_open") return "bg-sky-500/15 text-sky-700 dark:text-sky-200";
  if (displayStatus === "registration_closed") return "bg-amber-500/15 text-amber-800 dark:text-amber-100";
  if (displayStatus === "completed") return "bg-slate-500/15 text-slate-700 dark:text-slate-200";
  return "bg-amber-500/15 text-amber-800 dark:text-amber-100";
}

function toDatetimeLocalValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatAttemptStatus(s) {
  const m = {
    in_progress: "In progress",
    submitted: "Submitted",
    auto_submitted: "Submitted",
    abandoned: "Abandoned",
    not_started: "Not started"
  };
  return m[s] || (s ? String(s).replace(/_/g, " ") : "—");
}

export function RecruiterAssessmentsPage() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [questionsExamId, setQuestionsExamId] = useState(null);
  const [questionsData, setQuestionsData] = useState(null);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsError, setQuestionsError] = useState(null);

  const load = () => {
    setError(null);
    return getRecruiterExamsSummary().then(setExams).catch((e) => setError(e.response?.data?.message || "Failed to load assessments"));
  };

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, []);

  const patch = async (id, body) => {
    setBusy(id + JSON.stringify(body));
    try {
      await patchRecruiterExam(id, body);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Update failed");
    } finally {
      setBusy(null);
    }
  };

  const openQuestionsModal = async (examId) => {
    setQuestionsExamId(examId);
    setQuestionsData(null);
    setQuestionsError(null);
    setQuestionsLoading(true);
    try {
      const data = await getRecruiterExamOverview(examId);
      setQuestionsData(data);
    } catch (err) {
      setQuestionsError(err.response?.data?.message || "Could not load questions");
    } finally {
      setQuestionsLoading(false);
    }
  };

  const closeQuestionsModal = () => {
    setQuestionsExamId(null);
    setQuestionsData(null);
    setQuestionsError(null);
    setQuestionsLoading(false);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--recruiter-muted)]">Assessments</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Assessment management</h1>
          <p className="mt-2 max-w-2xl text-sm text-[color:var(--recruiter-muted)]">
            Create a draft with questions, then publish when ready. After publish, timing drives the live label; editing questions and settings is only allowed while the assessment is in draft.
          </p>
        </div>
        <Link
          to="/recruiter/assessments/new"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg"
        >
          <Plus size={18} /> Create assessment
        </Link>
      </header>

      {error ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-100">{error}</div> : null}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Your assessments</h2>
        {loading ? <div className="h-40 animate-pulse rounded-3xl bg-slate-200 dark:bg-white/10" /> : null}
        {!loading && !exams.length ? (
          <p className="text-sm text-[color:var(--recruiter-muted)]">No assessments yet. Use Create assessment to add one.</p>
        ) : null}
        <div className="grid gap-4">
          {exams.map((exam) => (
            <motion.article
              key={exam._id}
              layout
              className="rounded-3xl border border-[color:var(--recruiter-border)] bg-[color:var(--recruiter-surface)] p-5 dark:bg-slate-950/50"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{exam.title}</h3>
                  <p className="mt-1 text-sm text-[color:var(--recruiter-muted)]">{exam.description || "—"}</p>
                  <p className="mt-2 text-xs text-[color:var(--recruiter-muted)]">
                    Created by {exam.createdBy?.name || "—"} · {exam.durationMinutes} min · up to {exam.maxInterviewRounds ?? 3}{" "}
                    interview rounds
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--recruiter-muted)]">
                    Registration deadline:{" "}
                    {exam.registrationDeadline ? new Date(exam.registrationDeadline).toLocaleString() : "Not set"} · Start:{" "}
                    {exam.startTime ? new Date(exam.startTime).toLocaleString() : "—"} · End:{" "}
                    {exam.endTime ? new Date(exam.endTime).toLocaleString() : "—"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${displayStatusTone(exam.displayStatus || "draft")}`}>
                    {exam.displayLabel || mapExamUiStatus(exam.status)}
                  </span>
                  {exam.saasStatus ? (
                    <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-[color:var(--recruiter-muted)]">
                      {exam.saasStatus === "COMPLETED" ? "Completed" : "Active"}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                {exam.saasStatus === "COMPLETED" ||
                exam.displayStatus === "completed" ||
                String(exam.displayLabel || "").includes("Completed") ? (
                  <>
                    <Metric label="Submitted attempts" value={exam.stats?.completedAttempts ?? 0} />
                    <Metric label="Registered" value={exam.stats?.registeredCandidates ?? 0} />
                    <Metric label="Top score" value={`${exam.stats?.topScore ?? 0}%`} />
                    <Metric label="Average score" value={`${exam.stats?.averageScore ?? 0}%`} />
                  </>
                ) : (
                  <>
                    <Metric label="Registered" value={exam.stats?.registeredCandidates ?? 0} />
                    <Metric label="In progress" value={exam.stats?.inProgress ?? 0} />
                    <Metric label="Completed attempts" value={exam.stats?.completedAttempts ?? 0} />
                    <Metric label="Average score" value={`${exam.stats?.averageScore ?? 0}%`} />
                    <Metric label="Top score" value={`${exam.stats?.topScore ?? 0}%`} />
                  </>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  to={`/recruiter/assessments/${exam._id}/results`}
                  className="rounded-xl border border-[color:var(--recruiter-border)] px-3 py-2 text-xs font-semibold hover:bg-black/[0.04] dark:hover:bg-white/10"
                >
                  Leaderboard & pipeline
                </Link>
                {exam.isEditable ? (
                  <Link
                    to={`/recruiter/assessments/${exam._id}/edit`}
                    className="rounded-xl border border-[color:var(--recruiter-border)] px-3 py-2 text-xs font-semibold hover:bg-black/[0.04] dark:hover:bg-white/10"
                  >
                    Edit draft
                  </Link>
                ) : null}
                {exam.isEditable ? (
                  <button
                    type="button"
                    className="rounded-xl bg-sky-500/15 px-3 py-2 text-xs font-semibold text-sky-800 dark:text-sky-100 disabled:opacity-60"
                    disabled={busy}
                    onClick={() => patch(exam._id, { status: "scheduled" })}
                  >
                    Publish
                  </button>
                ) : null}
                {!exam.isEditable ? (
                  <button
                    type="button"
                    className="rounded-xl border border-[color:var(--recruiter-border)] px-3 py-2 text-xs font-semibold hover:bg-black/[0.04] dark:hover:bg-white/10"
                    onClick={() => openQuestionsModal(exam._id)}
                  >
                    Questions
                  </button>
                ) : null}
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      {questionsExamId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="exam-questions-title"
        >
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[color:var(--recruiter-border)] bg-[color:var(--recruiter-surface)] shadow-2xl dark:bg-slate-950">
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[color:var(--recruiter-border)] p-4">
              <div>
                <h3 id="exam-questions-title" className="text-lg font-semibold text-slate-900 dark:text-white">
                  {questionsData?.exam?.title || "Assessment questions"}
                </h3>
                <p className="mt-1 text-xs text-[color:var(--recruiter-muted)]">Read-only view of what candidates see (including prompts).</p>
              </div>
              <button
                type="button"
                className="rounded-lg border border-[color:var(--recruiter-border)] px-3 py-1.5 text-xs font-semibold hover:bg-black/[0.04] dark:hover:bg-white/10"
                onClick={closeQuestionsModal}
              >
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {questionsLoading ? <p className="text-sm text-[color:var(--recruiter-muted)]">Loading…</p> : null}
              {questionsError ? (
                <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-100">
                  {questionsError}
                </p>
              ) : null}
              {!questionsLoading && questionsData?.questions?.length ? (
                <ol className="list-decimal space-y-4 pl-5 text-sm">
                  {questionsData.questions.map((q, idx) => (
                    <li key={String(q._id)} className="rounded-xl border border-[color:var(--recruiter-border)] bg-white/50 p-3 dark:bg-white/[0.04]">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--recruiter-muted)]">
                        Q{idx + 1} · {q.type}
                        {q.difficulty ? ` · ${q.difficulty}` : ""}
                      </p>
                      <p className="mt-1 font-medium text-slate-900 dark:text-white">{q.title}</p>
                      <p className="mt-2 whitespace-pre-wrap text-slate-700 dark:text-slate-200">{q.prompt}</p>
                      {q.type === "mcq" && Array.isArray(q.options) ? (
                        <ul className="mt-2 space-y-1 border-t border-[color:var(--recruiter-border)] pt-2 text-xs">
                          {q.options.map((o, oi) => (
                            <li key={oi}>
                              <span className="font-semibold">{o.label}.</span> {o.value}
                              {o.isCorrect ? (
                                <span className="ml-2 rounded bg-emerald-500/15 px-1.5 py-0.5 text-emerald-800 dark:text-emerald-200">
                                  correct
                                </span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ol>
              ) : null}
              {!questionsLoading && questionsData && !questionsData.questions?.length ? (
                <p className="text-sm text-[color:var(--recruiter-muted)]">No questions found for this assessment.</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-2xl border border-[color:var(--recruiter-border)] bg-white/60 px-3 py-2 dark:bg-white/[0.04]">
      <p className="text-xs text-[color:var(--recruiter-muted)]">{label}</p>
      <p className="mt-0.5 font-semibold tabular-nums text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

export function RecruiterAssessmentCreatePage() {
  const navigate = useNavigate();
  return (
    <div className="space-y-8">
      <Link
        to="/recruiter/assessments"
        className="inline-flex items-center gap-2 text-sm font-medium text-cyan-600 hover:underline dark:text-cyan-300"
      >
        <ArrowLeft size={16} /> Back to assessments
      </Link>
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--recruiter-muted)]">New assessment</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Create assessment</h1>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--recruiter-muted)]">
          Fill every block below. The assessment is stored as a draft until you publish it from the list. For each MCQ, use the &quot;Correct?&quot; column to mark exactly one correct answer (used for automated scoring). Each coding problem needs one visible sample case and at least one hidden case.
        </p>
      </header>
      <AssessmentBuildForm inputClass={inputClass} onCreated={() => navigate("/recruiter/assessments")} />
    </div>
  );
}

export function RecruiterAssessmentEditPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getRecruiterExamsSummary()
      .then((list) => {
        if (cancelled) return;
        const e = list.find((x) => String(x._id) === String(examId));
        setExam(e || null);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || "Failed to load assessment");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [examId]);

  useEffect(() => {
    if (!exam) return;
    setForm({
      title: exam.title || "",
      description: exam.description || "",
      durationMinutes: exam.durationMinutes ?? 60,
      startTime: toDatetimeLocalValue(exam.startTime),
      endTime: toDatetimeLocalValue(exam.endTime),
      registrationDeadline: toDatetimeLocalValue(exam.registrationDeadline),
      maxInterviewRounds: exam.maxInterviewRounds ?? 3,
      shuffleQuestions: exam.settings?.shuffleQuestions !== false,
      shuffleOptions: Boolean(exam.settings?.shuffleOptions),
      allowTabSwitch: Boolean(exam.settings?.allowTabSwitch),
      autoSubmit: exam.settings?.autoSubmit !== false,
      resumeEnabled: exam.settings?.resumeEnabled !== false,
      negativeMarkingEnabled: Boolean(exam.settings?.negativeMarkingEnabled),
      defaultNegativeMark: Number(exam.settings?.defaultNegativeMark ?? 0)
    });
  }, [exam]);

  const save = async (e) => {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setError(null);
    try {
      await patchRecruiterExam(examId, {
        title: form.title.trim(),
        description: form.description,
        durationMinutes: Number(form.durationMinutes),
        startTime: form.startTime ? new Date(form.startTime).toISOString() : null,
        endTime: form.endTime ? new Date(form.endTime).toISOString() : null,
        registrationDeadline: form.registrationDeadline ? new Date(form.registrationDeadline).toISOString() : null,
        maxInterviewRounds: Number(form.maxInterviewRounds) || 3,
        settings: {
          shuffleQuestions: form.shuffleQuestions,
          shuffleOptions: form.shuffleOptions,
          allowTabSwitch: form.allowTabSwitch,
          autoSubmit: form.autoSubmit,
          resumeEnabled: form.resumeEnabled,
          negativeMarkingEnabled: form.negativeMarkingEnabled,
          defaultNegativeMark: Number(form.defaultNegativeMark || 0)
        }
      });
      navigate("/recruiter/assessments");
    } catch (err) {
      setError(err.response?.data?.message || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    setBusy(true);
    setError(null);
    try {
      await patchRecruiterExam(examId, { status: "scheduled" });
      navigate("/recruiter/assessments");
    } catch (err) {
      setError(err.response?.data?.message || "Publish failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="h-48 animate-pulse rounded-3xl bg-slate-200 dark:bg-white/10" />;
  }

  if (!exam) {
    return (
      <div className="space-y-4">
        <Link to="/recruiter/assessments" className="inline-flex items-center gap-2 text-sm font-medium text-cyan-600 hover:underline dark:text-cyan-300">
          <ArrowLeft size={16} /> Back
        </Link>
        <p className="text-sm text-[color:var(--recruiter-muted)]">Assessment not found.</p>
      </div>
    );
  }

  if (!exam.isEditable) {
    return (
      <div className="space-y-4">
        <Link to="/recruiter/assessments" className="inline-flex items-center gap-2 text-sm font-medium text-cyan-600 hover:underline dark:text-cyan-300">
          <ArrowLeft size={16} /> Back
        </Link>
        <div className="rounded-3xl border border-[color:var(--recruiter-border)] bg-[color:var(--recruiter-surface)] p-6 dark:bg-slate-950/50">
          <h1 className="text-lg font-semibold">This assessment cannot be edited</h1>
          <p className="mt-2 text-sm text-[color:var(--recruiter-muted)]">
            Only drafts are editable. After publish, use the leaderboard to review candidates and shortlist.
          </p>
        </div>
      </div>
    );
  }

  if (!form) return null;

  return (
    <div className="space-y-6">
      <Link to="/recruiter/assessments" className="inline-flex items-center gap-2 text-sm font-medium text-cyan-600 hover:underline dark:text-cyan-300">
        <ArrowLeft size={16} /> Back to assessments
      </Link>
      {error ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-100">{error}</div> : null}
      <header>
        <h1 className="text-2xl font-semibold">Edit draft</h1>
        <p className="mt-1 text-sm text-[color:var(--recruiter-muted)]">{exam.title}</p>
      </header>
      <form className="space-y-6 rounded-3xl border border-[color:var(--recruiter-border)] bg-[color:var(--recruiter-surface)] p-6 dark:bg-slate-950/50" onSubmit={save}>
        <div className="grid gap-3 md:grid-cols-2">
          <input className={inputClass} required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" />
          <input className={inputClass} type="number" min={1} max={480} value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} />
          <textarea className={`${inputClass} md:col-span-2`} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" />
          <input className={inputClass} type="datetime-local" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
          <input className={inputClass} type="datetime-local" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
          <label className="text-sm md:col-span-2">
            <span className="mb-1 block font-medium text-[color:var(--recruiter-muted)]">Registration deadline</span>
            <input
              className={inputClass + " max-w-md"}
              type="datetime-local"
              value={form.registrationDeadline}
              onChange={(e) => setForm({ ...form, registrationDeadline: e.target.value })}
            />
          </label>
          <label className="text-sm md:col-span-2">
            <span className="mb-1 block font-medium text-[color:var(--recruiter-muted)]">Max interview rounds (per candidate)</span>
            <input
              className={inputClass + " max-w-xs"}
              type="number"
              min={1}
              max={20}
              value={form.maxInterviewRounds}
              onChange={(e) => setForm({ ...form, maxInterviewRounds: e.target.value })}
            />
          </label>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["shuffleQuestions", "Shuffle questions"],
            ["shuffleOptions", "Shuffle MCQ options"],
            ["allowTabSwitch", "Allow tab switch"],
            ["autoSubmit", "Auto-submit on timer"],
            ["resumeEnabled", "Resume attempt"],
            ["negativeMarkingEnabled", "Negative marking"]
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 rounded-2xl border border-[color:var(--recruiter-border)] bg-white/60 px-3 py-2 text-xs font-medium dark:bg-white/[0.04]">
              <input type="checkbox" checked={Boolean(form[key])} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} />
              {label}
            </label>
          ))}
        </div>
        {form.negativeMarkingEnabled ? (
          <input
            className={inputClass + " max-w-xs"}
            type="number"
            min={0}
            step={0.25}
            value={form.defaultNegativeMark}
            onChange={(e) => setForm({ ...form, defaultNegativeMark: e.target.value })}
          />
        ) : null}
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={busy} className="rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-6 py-3 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? "Saving…" : "Save changes"}
          </button>
          <button type="button" disabled={busy} onClick={publish} className="rounded-2xl border border-sky-500/40 bg-sky-500/15 px-6 py-3 text-sm font-semibold text-sky-900 dark:text-sky-100 disabled:opacity-50">
            Publish (registration open)
          </button>
        </div>
      </form>

      <div className="rounded-3xl border border-[color:var(--recruiter-border)] bg-[color:var(--recruiter-surface)] p-6 dark:bg-slate-950/50">
        <h2 className="text-lg font-semibold">Edit questions, options & coding tests</h2>
        <p className="mt-1 text-sm text-[color:var(--recruiter-muted)]">
          Replace the full question set for this draft. Mark exactly one correct option per MCQ. Coding items need one visible sample case and at least one hidden case. This cannot be used after any candidate has started an attempt.
        </p>
        <div className="mt-6">
          <AssessmentBuildForm
            inputClass={inputClass}
            questionsOnly
            draftExamId={examId}
            onDraftQuestionsSaved={() => navigate("/recruiter/assessments")}
          />
        </div>
      </div>
    </div>
  );
}

export function RecruiterAssessmentResultsPage() {
  const { examId } = useParams();
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sort, setSort] = useState("activity");
  const [order, setOrder] = useState("desc");
  const [selected, setSelected] = useState(() => new Set());
  const [saving, setSaving] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [scheduleFor, setScheduleFor] = useState(null);
  const [schedForm, setSchedForm] = useState({
    roundType: "technical",
    scheduledAt: "",
    durationMinutes: 45,
    meetingUrl: ""
  });
  const [schedBusy, setSchedBusy] = useState(false);
  const [schedNotice, setSchedNotice] = useState(null);

  const examMeta = payload?.exam;
  const rows = payload?.candidates ?? [];
  const maxRounds = examMeta?.maxInterviewRounds ?? 3;

  const load = () =>
    getExamLeaderboard(examId, { sort, order })
      .then(setPayload)
      .catch((e) => setError(e.response?.data?.message || "Failed to load leaderboard"));

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [examId, sort, order]);

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const shortlist = async () => {
    const ids = [...selected];
    if (!ids.length) return;
    setSaving(true);
    setError(null);
    try {
      await postExamShortlist(examId, ids);
      setSelected(new Set());
      await load();
    } catch (e) {
      setError(e.response?.data?.message || "Shortlist failed");
    } finally {
      setSaving(false);
    }
  };

  const openProfile = async (candidateId) => {
    setProfileOpen(true);
    setProfileLoading(true);
    setProfileError(null);
    setProfileData(null);
    try {
      const p = await getExamCandidateProfile(examId, candidateId);
      setProfileData(p);
    } catch (e) {
      setProfileError(e.response?.data?.message || "Failed to load profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const closeProfile = () => {
    setProfileOpen(false);
    setProfileData(null);
    setProfileError(null);
  };

  const submitSchedule = async (e) => {
    e.preventDefault();
    if (!scheduleFor || !schedForm.scheduledAt) return;
    setSchedBusy(true);
    setSchedNotice(null);
    setError(null);
    try {
      const rawId = scheduleFor?.candidateId;
      const candidateId =
        rawId && typeof rawId === "object" && rawId._id != null ? String(rawId._id) : String(rawId ?? "").trim();
      if (!candidateId) {
        setError("Missing candidate id for scheduling.");
        setSchedBusy(false);
        return;
      }
      await scheduleRecruiterInterview({
        candidateId,
        examId,
        roundType: schedForm.roundType,
        scheduledAt: new Date(schedForm.scheduledAt).toISOString(),
        durationMinutes: Number(schedForm.durationMinutes),
        meetingUrl: schedForm.meetingUrl || undefined
      });
      setSchedNotice("Interview scheduled.");
      setScheduleFor(null);
      setSchedForm({ roundType: "technical", scheduledAt: "", durationMinutes: 45, meetingUrl: "" });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Schedule failed");
    } finally {
      setSchedBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--recruiter-muted)]">Results</p>
          <h1 className="text-2xl font-semibold">Leaderboard & pipeline</h1>
          {examMeta ? (
            <p className="mt-1 text-sm text-[color:var(--recruiter-muted)]">
              {examMeta.title} · {examMeta.displayLabel || mapExamUiStatus(examMeta.status)} · up to {maxRounds} interview rounds per shortlisted candidate
            </p>
          ) : null}
        </div>
        <Link to="/recruiter/assessments" className="text-sm font-medium text-cyan-600 hover:underline dark:text-cyan-300">
          Back to assessments
        </Link>
      </header>
      {error ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-100">{error}</div> : null}
      {schedNotice ? <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-100">{schedNotice}</div> : null}

      <div className="flex flex-wrap gap-2">
        <select className={inputClass + " max-w-xs"} value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="activity">Sort by recent activity</option>
          <option value="score">Sort by best score</option>
          <option value="name">Sort by name</option>
        </select>
        <select className={inputClass + " max-w-xs"} value={order} onChange={(e) => setOrder(e.target.value)}>
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
        <button
          type="button"
          disabled={!selected.size || saving}
          onClick={shortlist}
          className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : `Shortlist selected (${selected.size})`}
        </button>
        <Link to="/recruiter/interviews" className="rounded-xl border border-[color:var(--recruiter-border)] px-4 py-2 text-sm font-semibold hover:bg-black/[0.04] dark:hover:bg-white/10">
          All interviews
        </Link>
      </div>

      {scheduleFor ? (
        <form className="space-y-3 rounded-3xl border border-amber-500/25 bg-amber-500/[0.06] p-5 dark:bg-amber-500/[0.08]" onSubmit={submitSchedule}>
          <h2 className="text-sm font-semibold text-amber-950 dark:text-amber-100">Schedule interview — {scheduleFor.candidateName}</h2>
          <p className="text-xs text-[color:var(--recruiter-muted)]">Only shortlisted candidates can be interviewed for this assessment. Rounds are capped per candidate.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <select className={inputClass} value={schedForm.roundType} onChange={(e) => setSchedForm({ ...schedForm, roundType: e.target.value })}>
              <option value="technical">Technical</option>
              <option value="system_design">System design</option>
              <option value="hr">HR</option>
              <option value="coding">Coding</option>
              <option value="culture">Culture</option>
            </select>
            <input className={inputClass} type="datetime-local" required value={schedForm.scheduledAt} onChange={(e) => setSchedForm({ ...schedForm, scheduledAt: e.target.value })} />
            <input className={inputClass} type="number" min={15} value={schedForm.durationMinutes} onChange={(e) => setSchedForm({ ...schedForm, durationMinutes: e.target.value })} />
            <input className={inputClass} placeholder="Meeting URL" value={schedForm.meetingUrl} onChange={(e) => setSchedForm({ ...schedForm, meetingUrl: e.target.value })} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={schedBusy} className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50">
              {schedBusy ? "Scheduling…" : "Confirm schedule"}
            </button>
            <button type="button" className="rounded-xl border border-[color:var(--recruiter-border)] px-4 py-2 text-sm" onClick={() => setScheduleFor(null)}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div className="overflow-x-auto rounded-3xl border border-[color:var(--recruiter-border)] bg-[color:var(--recruiter-surface)] dark:bg-slate-950/50">
        {loading ? <div className="h-48 animate-pulse bg-slate-200 dark:bg-white/10" /> : null}
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[color:var(--recruiter-border)] text-xs uppercase text-[color:var(--recruiter-muted)]">
            <tr>
              <th className="px-4 py-3">Select</th>
              <th className="px-4 py-3">Candidate</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Attempts</th>
              <th className="px-4 py-3">Best score</th>
              <th className="px-4 py-3">Shortlisted</th>
              <th className="px-4 py-3">Interviews</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.candidateId)} className="border-b border-[color:var(--recruiter-border)]">
                <td className="px-4 py-3">
                  <input type="checkbox" disabled={r.shortlisted} checked={selected.has(String(r.candidateId))} onChange={() => toggle(String(r.candidateId))} />
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="text-left font-medium text-cyan-700 hover:underline dark:text-cyan-300"
                    onClick={() => openProfile(String(r.candidateId))}
                  >
                    {r.candidateName || "Candidate"}
                  </button>
                  <p className="text-xs text-[color:var(--recruiter-muted)]">{r.candidateEmail}</p>
                </td>
                <td className="px-4 py-3 text-xs">{formatAttemptStatus(r.latestStatus)}</td>
                <td className="px-4 py-3 tabular-nums">{r.attemptCount ?? 0}</td>
                <td className="px-4 py-3 tabular-nums">{r.bestScorePercent == null ? "—" : `${Number(r.bestScorePercent).toFixed(1)}%`}</td>
                <td className="px-4 py-3">{r.shortlisted ? "Yes" : "—"}</td>
                <td className="px-4 py-3 tabular-nums text-xs">
                  {r.interviewsScheduled ?? 0} / {maxRounds}
                </td>
                <td className="px-4 py-3">
                  {r.shortlisted && (r.interviewsScheduled ?? 0) < maxRounds ? (
                    <button type="button" className="text-xs font-semibold text-amber-800 hover:underline dark:text-amber-200" onClick={() => setScheduleFor(r)}>
                      Schedule
                    </button>
                  ) : (
                    <span className="text-xs text-[color:var(--recruiter-muted)]">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && !rows.length ? (
          <p className="p-6 text-sm text-[color:var(--recruiter-muted)]">No candidates have started this assessment yet.</p>
        ) : null}
      </div>

      {profileOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeProfile();
          }}
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-[color:var(--recruiter-border)] bg-[color:var(--recruiter-surface)] p-6 shadow-xl dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold">Candidate profile</h2>
              <button type="button" className="text-sm text-[color:var(--recruiter-muted)] hover:text-slate-900 dark:hover:text-white" onClick={closeProfile}>
                Close
              </button>
            </div>
            {profileLoading ? <p className="mt-4 text-sm text-[color:var(--recruiter-muted)]">Loading…</p> : null}
            {profileError ? <p className="mt-4 text-sm text-rose-600">{profileError}</p> : null}
            {profileData ? (
              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <p className="text-xs text-[color:var(--recruiter-muted)]">Name</p>
                  <p className="font-semibold">{profileData.name}</p>
                </div>
                <div>
                  <p className="text-xs text-[color:var(--recruiter-muted)]">Email</p>
                  <p>{profileData.email}</p>
                </div>
                {profileData.headline ? (
                  <div>
                    <p className="text-xs text-[color:var(--recruiter-muted)]">Headline</p>
                    <p>{profileData.headline}</p>
                  </div>
                ) : null}
                {Array.isArray(profileData.skills) && profileData.skills.length ? (
                  <div>
                    <p className="text-xs text-[color:var(--recruiter-muted)]">Skills</p>
                    <p>{profileData.skills.join(", ")}</p>
                  </div>
                ) : null}
                <div>
                  <p className="text-xs text-[color:var(--recruiter-muted)]">Resume</p>
                  {profileData.resumeUrl ? (
                    <a href={profileData.resumeUrl} target="_blank" rel="noreferrer" className="font-medium text-cyan-600 hover:underline dark:text-cyan-300">
                      Open resume
                    </a>
                  ) : (
                    <p className="text-[color:var(--recruiter-muted)]">No resume on file</p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function RecruiterLeaderboardHubPage() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    getRecruiterExamsSummary()
      .then(setExams)
      .catch((e) => setError(e.response?.data?.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--recruiter-muted)]">Leaderboards</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Assessment leaderboards</h1>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--recruiter-muted)]">Open any assessment to view ranked scores and pipeline.</p>
      </header>
      {error ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-100">{error}</div> : null}
      {loading ? <div className="h-40 animate-pulse rounded-3xl bg-slate-200 dark:bg-white/10" /> : null}
      <div className="grid gap-3">
        {exams.map((exam) => (
          <Link
            key={exam._id}
            to={`/recruiter/assessments/${exam._id}/results`}
            className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-[color:var(--recruiter-border)] bg-[color:var(--recruiter-surface)] px-4 py-4 transition hover:border-cyan-500/30 dark:bg-slate-950/50"
          >
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">{exam.title}</p>
              <p className="mt-1 text-xs text-[color:var(--recruiter-muted)]">
                {exam.displayLabel || mapExamUiStatus(exam.status)} · {exam.stats?.completedAttempts ?? 0} completed attempts
              </p>
            </div>
            <span className="text-sm font-semibold text-cyan-600 dark:text-cyan-300">View →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

const INTERVIEW_STATUS_LABELS = {
  scheduled: "Pending",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No show"
};

const ROUND_TYPE_LABELS = {
  technical: "Technical",
  coding: "Coding",
  system_design: "System design",
  hr: "HR",
  culture: "Culture"
};

function formatInterviewWhen(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function sortInterviewsForDisplay(items) {
  return [...items].sort((a, b) => {
    const aSched = a.status === "scheduled";
    const bSched = b.status === "scheduled";
    if (aSched !== bSched) return aSched ? -1 : 1;
    const ta = new Date(a.scheduledAt).getTime();
    const tb = new Date(b.scheduledAt).getTime();
    if (aSched) return ta - tb;
    return tb - ta;
  });
}

function interviewOutcomeLabel(outcome) {
  if (outcome === "shortlisted") return "Shortlisted";
  if (outcome === "rejected") return "Not shortlisted";
  return "—";
}

export function RecruiterInterviewRoundsPage() {
  const [shortlist, setShortlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [interviews, setInterviews] = useState([]);
  const [interviewsLoading, setInterviewsLoading] = useState(true);
  const [interviewsError, setInterviewsError] = useState(null);
  const [interviewStatusFilter, setInterviewStatusFilter] = useState("");
  const [detailInterview, setDetailInterview] = useState(null);
  const [examProfile, setExamProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileNote, setProfileNote] = useState(null);
  const [detailError, setDetailError] = useState(null);
  const [patchBusy, setPatchBusy] = useState(false);
  const [form, setForm] = useState({
    candidateId: "",
    examId: "",
    roundType: "technical",
    scheduledAt: "",
    durationMinutes: 45,
    meetingUrl: ""
  });

  const reloadInterviews = useCallback(async () => {
    setInterviewsLoading(true);
    setInterviewsError(null);
    try {
      const params = { limit: 50, page: 1 };
      if (interviewStatusFilter) params.status = interviewStatusFilter;
      const res = await listRecruiterInterviews(params);
      setInterviews(sortInterviewsForDisplay(res.items || []));
    } catch (e) {
      setInterviewsError(e.response?.data?.message || "Failed to load interviews");
      setInterviews([]);
    } finally {
      setInterviewsLoading(false);
    }
  }, [interviewStatusFilter]);

  useEffect(() => {
    setLoading(true);
    getRecruiterHiringShortlist()
      .then(setShortlist)
      .catch((e) => setError(e.response?.data?.message || "Failed to load shortlist"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reloadInterviews();
  }, [reloadInterviews]);

  const closeDetail = () => {
    setDetailInterview(null);
    setExamProfile(null);
    setProfileNote(null);
    setDetailError(null);
  };

  const openCandidateDetail = async (inv) => {
    setDetailInterview(inv);
    setExamProfile(null);
    setProfileNote(null);
    setDetailError(null);
    const examId = inv.examId?._id || inv.examId;
    const candId = inv.candidateId?._id || inv.candidateId;
    if (!examId || !candId) {
      setProfileNote("No assessment linked — showing basic contact info only.");
      return;
    }
    setProfileLoading(true);
    try {
      const data = await getExamCandidateProfile(examId, candId);
      setExamProfile(data);
    } catch (e) {
      setProfileNote(e.response?.data?.message || "Could not load assessment-linked profile. Basic contact info is still shown.");
    } finally {
      setProfileLoading(false);
    }
  };

  const applyInterviewPatch = async (interviewId, payload) => {
    setPatchBusy(true);
    setDetailError(null);
    try {
      const updated = await patchRecruiterInterview(interviewId, payload);
      setInterviews((prev) =>
        sortInterviewsForDisplay(prev.map((x) => (String(x._id) === String(updated._id) ? updated : x)))
      );
      setDetailInterview((d) => (d && String(d._id) === String(updated._id) ? updated : d));
    } catch (e) {
      setDetailError(e.response?.data?.message || "Update failed");
    } finally {
      setPatchBusy(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      await scheduleRecruiterInterview({
        candidateId: form.candidateId,
        examId: form.examId || undefined,
        roundType: form.roundType,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        durationMinutes: Number(form.durationMinutes),
        meetingUrl: form.meetingUrl || undefined
      });
      setNotice({ type: "ok", text: "Interview scheduled. Candidate notified in-app and by email when SMTP is configured." });
      setForm({ candidateId: "", examId: "", roundType: "technical", scheduledAt: "", durationMinutes: 45, meetingUrl: "" });
      await reloadInterviews();
    } catch (err) {
      setError(err.response?.data?.message || "Schedule failed");
    } finally {
      setBusy(false);
    }
  };

  const options = useMemo(() => {
    return shortlist.map((row) => ({
      key: `${row._id}`,
      candidateId: row.candidateId?._id || row.candidateId,
      examId: row.examId?._id || row.examId,
      label: `${row.candidateId?.name || "Candidate"} — ${row.examId?.title || "Assessment"}`
    }));
  }, [shortlist]);

  const cand = detailInterview?.candidateId;
  const candName = typeof cand === "object" && cand ? cand.name : "Candidate";
  const candEmail = typeof cand === "object" && cand ? cand.email : "";

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--recruiter-muted)]">Interviews</p>
        <h1 className="mt-1 text-2xl font-semibold">Interview round management</h1>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--recruiter-muted)]">
          Review scheduled rounds, open a candidate to see profile and meeting details, then mark each round as completed and record shortlist outcome.
        </p>
      </header>
      {error ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm">{error}</div> : null}
      {notice?.type === "ok" ? <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm">{notice.text}</div> : null}

      <section className="rounded-3xl border border-[color:var(--recruiter-border)] bg-[color:var(--recruiter-surface)] p-6 dark:bg-slate-950/50">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <CalendarClock size={20} /> Scheduled interviews
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-medium text-[color:var(--recruiter-muted)]">Filter</label>
            <select
              className={`${inputClass} max-w-[200px]`}
              value={interviewStatusFilter}
              onChange={(e) => setInterviewStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="scheduled">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No show</option>
            </select>
          </div>
        </div>
        {interviewsError ? (
          <p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-100">{interviewsError}</p>
        ) : null}
        {interviewsLoading ? <div className="mt-4 h-40 animate-pulse rounded-2xl bg-slate-200 dark:bg-white/10" /> : null}
        {!interviewsLoading && !interviews.length ? (
          <p className="mt-4 text-sm text-[color:var(--recruiter-muted)]">No interviews match this filter yet.</p>
        ) : null}
        {!interviewsLoading && interviews.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[color:var(--recruiter-border)] text-xs uppercase tracking-wide text-[color:var(--recruiter-muted)]">
                  <th className="py-3 pr-3 font-semibold">When</th>
                  <th className="py-3 pr-3 font-semibold">Assessment</th>
                  <th className="py-3 pr-3 font-semibold">Candidate</th>
                  <th className="py-3 pr-3 font-semibold">Round type</th>
                  <th className="py-3 pr-3 font-semibold">Assessment round</th>
                  <th className="py-3 pr-3 font-semibold">Round status</th>
                  <th className="py-3 font-semibold">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {interviews.map((inv) => {
                  const exam = inv.examId;
                  const examTitle = typeof exam === "object" && exam?.title ? exam.title : "—";
                  const c = inv.candidateId;
                  const name = typeof c === "object" && c?.name ? c.name : "Candidate";
                  return (
                    <tr key={inv._id} className="border-b border-[color:var(--recruiter-border)] last:border-0">
                      <td className="py-3 pr-3 align-top text-[color:var(--recruiter-muted)]">{formatInterviewWhen(inv.scheduledAt)}</td>
                      <td className="py-3 pr-3 align-top font-medium text-slate-900 dark:text-white">{examTitle}</td>
                      <td className="py-3 pr-3 align-top">
                        <button
                          type="button"
                          className="font-semibold text-cyan-700 underline decoration-cyan-500/40 underline-offset-2 hover:text-cyan-600 dark:text-cyan-300"
                          onClick={() => openCandidateDetail(inv)}
                        >
                          {name}
                        </button>
                      </td>
                      <td className="py-3 pr-3 align-top">{ROUND_TYPE_LABELS[inv.roundType] || inv.roundType}</td>
                      <td className="py-3 pr-3 align-top font-medium tabular-nums text-slate-900 dark:text-white" title="Interview number for this candidate on this assessment, out of the max rounds allowed">
                        {inv.interviewRoundLabel ?? "—"}
                      </td>
                      <td className="py-3 pr-3 align-top">{INTERVIEW_STATUS_LABELS[inv.status] || inv.status}</td>
                      <td className="py-3 align-top text-[color:var(--recruiter-muted)]">{interviewOutcomeLabel(inv.outcome)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-[color:var(--recruiter-border)] bg-[color:var(--recruiter-surface)] p-6 dark:bg-slate-950/50">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <CalendarClock size={20} /> Shortlisted candidates
          </h2>
          {loading ? <div className="mt-4 h-32 animate-pulse rounded-2xl bg-slate-200 dark:bg-white/10" /> : null}
          <ul className="mt-4 space-y-2 text-sm">
            {shortlist.length === 0 && !loading ? (
              <li className="text-[color:var(--recruiter-muted)]">No shortlists yet. Open an assessment leaderboard, review candidates, then shortlist.</li>
            ) : null}
            {shortlist.map((row) => (
              <li key={row._id} className="rounded-2xl border border-[color:var(--recruiter-border)] px-3 py-2">
                <span className="font-medium">{row.candidateId?.name}</span>
                <span className="text-[color:var(--recruiter-muted)]"> — {row.examId?.title}</span>
              </li>
            ))}
          </ul>
        </div>

        <form className="space-y-3 rounded-3xl border border-[color:var(--recruiter-border)] bg-[color:var(--recruiter-surface)] p-6 dark:bg-slate-950/50" onSubmit={submit}>
          <h2 className="text-lg font-semibold">Schedule interview</h2>
          <label className="block text-xs font-medium text-[color:var(--recruiter-muted)]">Pick shortlisted row (sets candidate + assessment)</label>
          <select
            className={inputClass}
            value={form.candidateId && form.examId ? `${form.candidateId}|${form.examId}` : ""}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) {
                setForm((f) => ({ ...f, candidateId: "", examId: "" }));
                return;
              }
              const [candidateId, examId] = v.split("|");
              setForm((f) => ({ ...f, candidateId, examId }));
            }}
          >
            <option value="">Select…</option>
            {options.map((o) => (
              <option key={o.key} value={`${o.candidateId}|${o.examId}`}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-[color:var(--recruiter-muted)]">Or enter manually below if scheduling without assessment context.</p>
          <input className={inputClass} placeholder="Candidate ID (Mongo)" value={form.candidateId} onChange={(e) => setForm({ ...form, candidateId: e.target.value })} />
          <input className={inputClass} placeholder="Assessment ID (optional)" value={form.examId} onChange={(e) => setForm({ ...form, examId: e.target.value })} />
          <select className={inputClass} value={form.roundType} onChange={(e) => setForm({ ...form, roundType: e.target.value })}>
            <option value="technical">Technical</option>
            <option value="system_design">System design</option>
            <option value="hr">HR</option>
            <option value="coding">Coding</option>
            <option value="culture">Culture</option>
          </select>
          <input className={inputClass} type="datetime-local" required value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
          <input className={inputClass} type="number" min={15} value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} />
          <input className={inputClass} placeholder="Google Meet link" value={form.meetingUrl} onChange={(e) => setForm({ ...form, meetingUrl: e.target.value })} />
          <button type="submit" disabled={busy} className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-sm font-semibold text-slate-900 disabled:opacity-50">
            {busy ? "Submitting…" : "Submit interview schedule"}
          </button>
        </form>
      </section>

      {detailInterview ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="interview-detail-title"
        >
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[color:var(--recruiter-border)] bg-[color:var(--recruiter-surface)] shadow-2xl dark:bg-slate-950">
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[color:var(--recruiter-border)] p-4">
              <div>
                <h3 id="interview-detail-title" className="text-lg font-semibold text-slate-900 dark:text-white">
                  {candName}
                </h3>
                <p className="mt-1 text-xs text-[color:var(--recruiter-muted)]">Interview details and pipeline updates</p>
              </div>
              <button
                type="button"
                className="rounded-lg border border-[color:var(--recruiter-border)] px-3 py-1.5 text-xs font-semibold hover:bg-black/[0.04] dark:hover:bg-white/10"
                onClick={closeDetail}
              >
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 text-sm">
              {detailError ? (
                <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-rose-700 dark:text-rose-100">{detailError}</p>
              ) : null}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--recruiter-muted)]">Profile</p>
                {profileLoading ? <p className="mt-2 text-[color:var(--recruiter-muted)]">Loading profile…</p> : null}
                {profileNote ? <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">{profileNote}</p> : null}
                <dl className="mt-2 space-y-1 text-slate-800 dark:text-slate-200">
                  <div>
                    <dt className="text-xs text-[color:var(--recruiter-muted)]">Email</dt>
                    <dd>{examProfile?.email || candEmail || "—"}</dd>
                  </div>
                  {examProfile?.headline ? (
                    <div>
                      <dt className="text-xs text-[color:var(--recruiter-muted)]">Headline</dt>
                      <dd>{examProfile.headline}</dd>
                    </div>
                  ) : null}
                  {examProfile?.skills?.length ? (
                    <div>
                      <dt className="text-xs text-[color:var(--recruiter-muted)]">Skills</dt>
                      <dd>{examProfile.skills.join(", ")}</dd>
                    </div>
                  ) : null}
                  {examProfile?.resumeUrl ? (
                    <div>
                      <dt className="text-xs text-[color:var(--recruiter-muted)]">Resume</dt>
                      <dd>
                        <a
                          href={examProfile.resumeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-cyan-700 underline dark:text-cyan-300"
                        >
                          Open link
                        </a>
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </div>

              <div className="rounded-xl border border-[color:var(--recruiter-border)] bg-white/50 p-3 dark:bg-white/[0.04]">
                <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--recruiter-muted)]">This interview</p>
                <ul className="mt-2 space-y-2 text-slate-800 dark:text-slate-200">
                  <li>
                    <span className="text-[color:var(--recruiter-muted)]">Assessment: </span>
                    {typeof detailInterview.examId === "object" && detailInterview.examId?.title
                      ? detailInterview.examId.title
                      : "Not linked"}
                  </li>
                  {detailInterview.interviewRoundLabel ? (
                    <li>
                      <span className="text-[color:var(--recruiter-muted)]">Round for this assessment: </span>
                      <span className="font-semibold tabular-nums">{detailInterview.interviewRoundLabel}</span>
                      <span className="text-xs text-[color:var(--recruiter-muted)]"> (this candidate · this assessment)</span>
                    </li>
                  ) : null}
                  <li>
                    <span className="text-[color:var(--recruiter-muted)]">When: </span>
                    {formatInterviewWhen(detailInterview.scheduledAt)}
                  </li>
                  <li>
                    <span className="text-[color:var(--recruiter-muted)]">Duration: </span>
                    {detailInterview.durationMinutes ?? "—"} min
                  </li>
                  <li>
                    <span className="text-[color:var(--recruiter-muted)]">Round type: </span>
                    {ROUND_TYPE_LABELS[detailInterview.roundType] || detailInterview.roundType}
                  </li>
                  <li>
                    <span className="text-[color:var(--recruiter-muted)]">Meeting: </span>
                    {detailInterview.meetingUrl ? (
                      <a
                        href={detailInterview.meetingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="break-all font-semibold text-cyan-700 underline dark:text-cyan-300"
                      >
                        {detailInterview.meetingUrl}
                      </a>
                    ) : (
                      "—"
                    )}
                  </li>
                  {detailInterview.notes ? (
                    <li>
                      <span className="text-[color:var(--recruiter-muted)]">Notes: </span>
                      <span className="whitespace-pre-wrap">{detailInterview.notes}</span>
                    </li>
                  ) : null}
                </ul>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-medium text-[color:var(--recruiter-muted)]">Round status</label>
                <select
                  key={`st-${detailInterview._id}-${detailInterview.status}`}
                  className={inputClass}
                  disabled={patchBusy}
                  defaultValue={detailInterview.status}
                  onChange={(e) => applyInterviewPatch(detailInterview._id, { status: e.target.value })}
                >
                  <option value="scheduled">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="no_show">No show</option>
                </select>
                <label className="block text-xs font-medium text-[color:var(--recruiter-muted)]">Shortlist outcome (after completed)</label>
                <select
                  key={`oc-${detailInterview._id}-${detailInterview.status}-${detailInterview.outcome ?? "none"}`}
                  className={inputClass}
                  disabled={patchBusy || detailInterview.status !== "completed"}
                  defaultValue={detailInterview.outcome || ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    applyInterviewPatch(detailInterview._id, { outcome: v ? v : null });
                  }}
                >
                  <option value="">Not set yet</option>
                  <option value="shortlisted">Shortlisted</option>
                  <option value="rejected">Not shortlisted</option>
                </select>
                {detailInterview.status !== "completed" ? (
                  <p className="text-xs text-[color:var(--recruiter-muted)]">Mark the round as completed to enable shortlist outcome.</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function RecruiterNotificationsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    getRecruiterDashboardAnalytics({ limit: 20 })
      .then(setData)
      .catch(() => navigate("/recruiter/home"))
      .finally(() => setLoading(false));
  }, [navigate]);

  const items = data?.notifications?.latest || [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="mt-1 text-sm text-[color:var(--recruiter-muted)]">{data?.notifications?.unreadCount ?? 0} unread</p>
      </header>
      {loading ? <div className="h-40 animate-pulse rounded-3xl bg-slate-200 dark:bg-white/10" /> : null}
      <div className="space-y-3">
        {items.map((n) => (
          <article key={n._id} className="rounded-3xl border border-[color:var(--recruiter-border)] bg-[color:var(--recruiter-surface)] p-4 dark:bg-slate-950/50">
            <h3 className="font-semibold">{n.title || n.type}</h3>
            <p className="mt-1 text-sm text-[color:var(--recruiter-muted)]">{n.message}</p>
          </article>
        ))}
        {!loading && !items.length ? <p className="text-sm text-[color:var(--recruiter-muted)]">No notifications.</p> : null}
      </div>
    </div>
  );
}

export function RecruiterProfilePage() {
  const user = useSelector((s) => s.auth.user);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <div className="rounded-3xl border border-[color:var(--recruiter-border)] bg-[color:var(--recruiter-surface)] p-6 dark:bg-slate-950/50">
        <p className="text-sm text-[color:var(--recruiter-muted)]">Name</p>
        <p className="text-lg font-semibold">{user?.name}</p>
        <p className="mt-4 text-sm text-[color:var(--recruiter-muted)]">Email</p>
        <p className="font-medium">{user?.email}</p>
        <p className="mt-4 text-sm text-[color:var(--recruiter-muted)]">Role</p>
        <p className="font-medium capitalize">{user?.role}</p>
      </div>
    </div>
  );
}

export function RecruiterSettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <div className="rounded-3xl border border-[color:var(--recruiter-border)] bg-[color:var(--recruiter-surface)] p-6 text-sm text-[color:var(--recruiter-muted)] dark:bg-slate-950/50">
        Enterprise defaults for assessments, anti-cheating, and notifications are configured per assessment. Use the assessment editor and create flow to tune timers,
        randomization, and negative marking.
      </div>
    </div>
  );
}
