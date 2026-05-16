import { useEffect, useMemo, useState } from "react";
import { composeRecruiterExam, getRecruiterExamDraft, putRecruiterExamDraftQuestions } from "../../features/recruiter/recruiterDashboardApi.js";

const defaultInputClass =
  "w-full rounded-2xl border border-[color:var(--recruiter-border)] bg-white/80 px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500/50 dark:bg-white/[0.06] dark:text-slate-100 dark:placeholder:text-slate-500";

function mapServerMcqToSlot(q) {
  return {
    title: q.title || "",
    prompt: q.prompt || "",
    difficulty: q.difficulty || "medium",
    marks: q.marks ?? 1,
    negativeMark: q.negativeMark ?? 0,
    topics: Array.isArray(q.topics) ? q.topics.join(", ") : String(q.topics || ""),
    options: (q.options || []).map((o, i) => ({
      label: o.label || String.fromCharCode(65 + i),
      value: String(o.value ?? ""),
      isCorrect: Boolean(o.isCorrect)
    }))
  };
}

function mapServerCodingToSlot(q) {
  const cases = q.testCases || [];
  const pub = cases.find((c) => !c.isHidden) || {};
  const hidden = cases.filter((c) => c.isHidden).map((c) => ({ input: c.input ?? "", output: c.expectedOutput ?? "" }));
  const starter = q.starterCode && typeof q.starterCode === "object" ? q.starterCode : {};
  const firstLang = Object.keys(starter)[0] || "python";
  return {
    title: q.title || "",
    prompt: q.prompt || "",
    difficulty: q.difficulty || "medium",
    marks: q.marks ?? 1,
    negativeMark: q.negativeMark ?? 0,
    topics: Array.isArray(q.topics) ? q.topics.join(", ") : String(q.topics || ""),
    starterLanguage: firstLang,
    starterCodeText: String(starter[firstLang] || ""),
    sampleInput: String(pub.input ?? ""),
    sampleOutput: String(pub.expectedOutput ?? ""),
    hiddenCases: hidden.length ? hidden : [{ input: "", output: "" }]
  };
}

function defaultMcq() {
  return {
    title: "",
    prompt: "",
    difficulty: "medium",
    marks: 1,
    negativeMark: 0,
    topics: "",
    options: [
      { label: "A", value: "", isCorrect: true },
      { label: "B", value: "", isCorrect: false },
      { label: "C", value: "", isCorrect: false },
      { label: "D", value: "", isCorrect: false }
    ]
  };
}

function defaultHiddenCase() {
  return { input: "", output: "" };
}

function defaultCoding() {
  return {
    title: "",
    prompt: "",
    difficulty: "medium",
    marks: 5,
    negativeMark: 0,
    topics: "",
    starterLanguage: "python",
    starterCodeText: "",
    sampleInput: "",
    sampleOutput: "",
    hiddenCases: [defaultHiddenCase()]
  };
}

function resizeSlots(prev, size, factory) {
  const next = prev.slice(0, size);
  while (next.length < size) next.push(factory());
  return next;
}

export default function AssessmentBuildForm({
  inputClass: ic = defaultInputClass,
  onCreated,
  draftExamId,
  questionsOnly,
  onDraftQuestionsSaved
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [mcqCount, setMcqCount] = useState(2);
  const [codingCount, setCodingCount] = useState(1);

  const [meta, setMeta] = useState({
    title: "",
    description: "",
    durationMinutes: 60,
    startTime: "",
    endTime: "",
    registrationDeadline: "",
    maxInterviewRounds: 3,
    shuffleQuestions: true,
    shuffleOptions: false,
    allowTabSwitch: false,
    autoSubmit: true,
    resumeEnabled: true,
    negativeMarkingEnabled: false,
    defaultNegativeMark: 0
  });

  const [mcqSlots, setMcqSlots] = useState(() => [defaultMcq(), defaultMcq()]);
  const [codingSlots, setCodingSlots] = useState(() => [defaultCoding()]);

  useEffect(() => {
    setMcqSlots((prev) => resizeSlots(prev, Math.max(0, mcqCount), defaultMcq));
  }, [mcqCount]);

  useEffect(() => {
    setCodingSlots((prev) => resizeSlots(prev, Math.max(0, codingCount), defaultCoding));
  }, [codingCount]);

  useEffect(() => {
    if (!draftExamId) return;
    let cancelled = false;
    (async () => {
      setError(null);
      try {
        const { questions } = await getRecruiterExamDraft(draftExamId);
        if (cancelled) return;
        const mcqs = questions.filter((q) => q.type === "mcq").map(mapServerMcqToSlot);
        const codes = questions.filter((q) => q.type === "coding").map(mapServerCodingToSlot);
        setMcqCount(mcqs.length);
        setCodingCount(codes.length);
        setMcqSlots(mcqs.length ? mcqs : [defaultMcq()]);
        setCodingSlots(codes.length ? codes : []);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || "Failed to load draft questions");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [draftExamId]);

  const totalPlanned = useMemo(() => mcqCount + codingCount, [mcqCount, codingCount]);

  const updateMcq = (index, patch) => {
    setMcqSlots((rows) => {
      const next = [...rows];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const setMcqCorrect = (qIndex, optIndex) => {
    setMcqSlots((rows) => {
      const row = { ...rows[qIndex] };
      row.options = row.options.map((o, i) => ({ ...o, isCorrect: i === optIndex }));
      const next = [...rows];
      next[qIndex] = row;
      return next;
    });
  };

  const updateMcqOptionValue = (qIndex, optIndex, value) => {
    setMcqSlots((rows) => {
      const next = [...rows];
      const opts = [...next[qIndex].options];
      opts[optIndex] = { ...opts[optIndex], value };
      next[qIndex] = { ...next[qIndex], options: opts };
      return next;
    });
  };

  const updateCoding = (index, patch) => {
    setCodingSlots((rows) => {
      const next = [...rows];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (totalPlanned < 1) {
      setError("Set at least one MCQ or coding question.");
      return;
    }

    if (!questionsOnly) {
      const nowMs = Date.now();
      if (meta.registrationDeadline) {
        const rd = new Date(meta.registrationDeadline).getTime();
        if (Number.isFinite(rd) && rd < nowMs) {
          setError("Registration deadline must be on or after the current date and time.");
          return;
        }
      }
      if (meta.startTime && meta.endTime) {
        const st = new Date(meta.startTime).getTime();
        const et = new Date(meta.endTime).getTime();
        const durMin = Number(meta.durationMinutes) || 0;
        if (Number.isFinite(st) && Number.isFinite(et)) {
          if (et <= st) {
            setError("Assessment end time must be after start time.");
            return;
          }
          if (durMin > 0) {
            const expectedEnd = st + durMin * 60_000;
            if (Math.abs(et - expectedEnd) > 3 * 60_000) {
              setError(`End time should match start time plus duration (${durMin} minutes). Adjust start or end.`);
              return;
            }
          }
        }
      }
      if (meta.registrationDeadline && meta.startTime) {
        const rd = new Date(meta.registrationDeadline).getTime();
        const st = new Date(meta.startTime).getTime();
        if (Number.isFinite(rd) && Number.isFinite(st) && st < rd) {
          setError("Assessment start should be on or after the registration deadline.");
          return;
        }
      }
    }

    const questions = [];

    for (const slot of mcqSlots) {
      questions.push({
        type: "mcq",
        title: slot.title.trim(),
        prompt: slot.prompt.trim(),
        difficulty: slot.difficulty,
        marks: Number(slot.marks) || 1,
        negativeMark: Number(slot.negativeMark) || 0,
        topics: slot.topics,
        options: slot.options.map((o) => ({
          label: o.label,
          value: o.value.trim(),
          isCorrect: Boolean(o.isCorrect)
        }))
      });
    }

    for (const slot of codingSlots) {
      const hidden = Array.isArray(slot.hiddenCases) ? slot.hiddenCases : [];
      const testCases = [
        {
          input: String(slot.sampleInput ?? ""),
          expectedOutput: String(slot.sampleOutput ?? ""),
          isHidden: false,
          weight: 1
        },
        ...hidden.map((hc) => ({
          input: String(hc?.input ?? ""),
          expectedOutput: String(hc?.output ?? ""),
          isHidden: true,
          weight: 1
        }))
      ];
      questions.push({
        type: "coding",
        title: slot.title.trim(),
        prompt: slot.prompt.trim(),
        difficulty: slot.difficulty,
        marks: Number(slot.marks) || 1,
        negativeMark: Number(slot.negativeMark) || 0,
        topics: slot.topics,
        starterLanguage: slot.starterLanguage || "python",
        starterCodeText: slot.starterCodeText || "",
        testCases
      });
    }

    setBusy(true);
    try {
      if (draftExamId) {
        await putRecruiterExamDraftQuestions(draftExamId, {
          questionCounts: { mcq: mcqCount, coding: codingCount },
          questions
        });
        onDraftQuestionsSaved?.();
      } else {
        await composeRecruiterExam({
          title: meta.title.trim(),
          description: meta.description.trim(),
          durationMinutes: Number(meta.durationMinutes),
          startTime: meta.startTime ? new Date(meta.startTime).toISOString() : undefined,
          endTime: meta.endTime ? new Date(meta.endTime).toISOString() : undefined,
          registrationDeadline: meta.registrationDeadline ? new Date(meta.registrationDeadline).toISOString() : undefined,
          status: "draft",
          maxInterviewRounds: Number(meta.maxInterviewRounds) || 3,
          questionCounts: { mcq: mcqCount, coding: codingCount },
          questions,
          settings: {
            shuffleQuestions: meta.shuffleQuestions,
            shuffleOptions: meta.shuffleOptions,
            allowTabSwitch: meta.allowTabSwitch,
            autoSubmit: meta.autoSubmit,
            resumeEnabled: meta.resumeEnabled,
            negativeMarkingEnabled: meta.negativeMarkingEnabled,
            defaultNegativeMark: Number(meta.defaultNegativeMark || 0)
          }
        });
        onCreated?.();
        setMeta((m) => ({
          ...m,
          title: "",
          description: "",
          durationMinutes: 60,
          startTime: "",
          endTime: "",
          registrationDeadline: "",
          maxInterviewRounds: 3
        }));
        setMcqSlots(resizeSlots([], mcqCount, defaultMcq));
        setCodingSlots(resizeSlots([], codingCount, defaultCoding));
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || (draftExamId ? "Failed to save questions" : "Failed to create assessment"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="space-y-8" onSubmit={handleSubmit}>
      {error ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-100">{error}</div> : null}

      {!questionsOnly ? (
      <section className="rounded-3xl border border-[color:var(--recruiter-border)] bg-[color:var(--recruiter-surface)] p-6 dark:bg-slate-950/50">
        <h2 className="text-lg font-semibold">Assessment details</h2>
        <p className="mt-1 text-sm text-[color:var(--recruiter-muted)]">
          New assessments are saved as <span className="font-medium text-slate-800 dark:text-slate-100">draft</span> until you publish from the assessments list. Set registration window times for status labels after publish.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input className={ic} placeholder="Assessment title" required value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
          <input className={ic} type="number" min={1} max={480} value={meta.durationMinutes} onChange={(e) => setMeta({ ...meta, durationMinutes: e.target.value })} />
          <textarea className={`${ic} md:col-span-2`} rows={2} placeholder="Description" value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} />
          <input className={ic} type="datetime-local" value={meta.startTime} onChange={(e) => setMeta({ ...meta, startTime: e.target.value })} />
          <input className={ic} type="datetime-local" value={meta.endTime} onChange={(e) => setMeta({ ...meta, endTime: e.target.value })} />
          <label className="text-sm md:col-span-2">
            <span className="mb-1 block font-medium text-[color:var(--recruiter-muted)]">Registration deadline (required for candidate registration window)</span>
            <input
              className={ic + " max-w-md"}
              type="datetime-local"
              value={meta.registrationDeadline}
              onChange={(e) => setMeta({ ...meta, registrationDeadline: e.target.value })}
            />
          </label>
          <label className="text-sm md:col-span-2">
            <span className="mb-1 block font-medium text-[color:var(--recruiter-muted)]">Max interview rounds (per candidate, this assessment)</span>
            <input
              className={ic + " max-w-xs"}
              type="number"
              min={1}
              max={20}
              value={meta.maxInterviewRounds}
              onChange={(e) => setMeta({ ...meta, maxInterviewRounds: e.target.value })}
            />
          </label>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["shuffleQuestions", "Shuffle question order"],
            ["shuffleOptions", "Shuffle MCQ options"],
            ["allowTabSwitch", "Allow tab switch"],
            ["autoSubmit", "Auto-submit on timer"],
            ["resumeEnabled", "Resume attempt"],
            ["negativeMarkingEnabled", "Negative marking"]
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 rounded-2xl border border-[color:var(--recruiter-border)] bg-white/60 px-3 py-2 text-xs font-medium dark:bg-white/[0.04]">
              <input type="checkbox" checked={Boolean(meta[key])} onChange={(e) => setMeta({ ...meta, [key]: e.target.checked })} />
              {label}
            </label>
          ))}
        </div>
        {meta.negativeMarkingEnabled ? (
          <input
            className={`${ic} mt-3 max-w-xs`}
            type="number"
            min={0}
            step={0.25}
            value={meta.defaultNegativeMark}
            onChange={(e) => setMeta({ ...meta, defaultNegativeMark: e.target.value })}
            placeholder="Default negative mark"
          />
        ) : null}
      </section>
      ) : null}

      <section className="rounded-3xl border border-[color:var(--recruiter-border)] bg-[color:var(--recruiter-surface)] p-6 dark:bg-slate-950/50">
        <h2 className="text-lg font-semibold">{questionsOnly ? "Questions & options" : "Question mix"}</h2>
        <p className="mt-1 text-sm text-[color:var(--recruiter-muted)]">Set how many MCQs and how many coding problems to include. Fields appear below for each slot.</p>
        <div className="mt-4 flex flex-wrap gap-4">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-[color:var(--recruiter-muted)]">MCQ count</span>
            <input className={ic + " w-32"} type="number" min={0} max={80} value={mcqCount} onChange={(e) => setMcqCount(Math.min(80, Math.max(0, Number(e.target.value) || 0)))} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-[color:var(--recruiter-muted)]">Coding count</span>
            <input
              className={ic + " w-32"}
              type="number"
              min={0}
              max={80}
              value={codingCount}
              onChange={(e) => setCodingCount(Math.min(80, Math.max(0, Number(e.target.value) || 0)))}
            />
          </label>
          <div className="flex items-end text-sm text-[color:var(--recruiter-muted)]">
            Total questions: <span className="ml-2 font-semibold text-slate-900 dark:text-white">{totalPlanned}</span>
          </div>
        </div>
      </section>

      {mcqSlots.map((slot, qi) => (
        <section key={`mcq-${qi}`} className="rounded-3xl border border-cyan-500/20 bg-cyan-500/[0.04] p-6 dark:bg-cyan-500/[0.06]">
          <h3 className="text-base font-semibold text-cyan-900 dark:text-cyan-100">MCQ {qi + 1}</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input className={ic} placeholder="Question title" value={slot.title} onChange={(e) => updateMcq(qi, { title: e.target.value })} />
            <select className={ic} value={slot.difficulty} onChange={(e) => updateMcq(qi, { difficulty: e.target.value })}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            <textarea className={`${ic} md:col-span-2`} rows={3} placeholder="Question prompt / stem" value={slot.prompt} onChange={(e) => updateMcq(qi, { prompt: e.target.value })} />
            <input className={ic} type="number" min={0} value={slot.marks} onChange={(e) => updateMcq(qi, { marks: e.target.value })} placeholder="Marks" />
            <input className={ic} placeholder="Topics (comma-separated)" value={slot.topics} onChange={(e) => updateMcq(qi, { topics: e.target.value })} />
          </div>
          <p className="mt-4 text-sm font-medium text-slate-800 dark:text-slate-100">Correct answer (required)</p>
          <p className="mt-1 text-xs text-[color:var(--recruiter-muted)]">
            Automated scoring compares each candidate&apos;s choice to the option you mark here. Use the radio beside each row — exactly one must be correct.
          </p>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-[color:var(--recruiter-border)]">
            <table className="w-full min-w-[320px] text-left text-sm">
              <thead>
                <tr className="border-b border-[color:var(--recruiter-border)] bg-white/50 text-xs uppercase tracking-wide text-[color:var(--recruiter-muted)] dark:bg-white/[0.06]">
                  <th className="w-28 px-3 py-2">Correct?</th>
                  <th className="w-12 px-3 py-2">#</th>
                  <th className="px-3 py-2">Option text (what candidates see)</th>
                </tr>
              </thead>
              <tbody>
                {slot.options.map((opt, oi) => (
                  <tr
                    key={`mcq-${qi}-opt-${oi}`}
                    className={`border-b border-[color:var(--recruiter-border)] last:border-0 ${opt.isCorrect ? "bg-cyan-500/15 dark:bg-cyan-500/10" : ""}`}
                  >
                    <td className="px-3 py-2 align-middle">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name={`mcq-${qi}-correct`}
                          checked={Boolean(opt.isCorrect)}
                          onChange={() => setMcqCorrect(qi, oi)}
                          className="h-4 w-4"
                          aria-label={`Mark option ${opt.label} as the correct answer for MCQ ${qi + 1}`}
                        />
                        {opt.isCorrect ? <span className="text-xs font-semibold text-cyan-800 dark:text-cyan-200">Correct</span> : null}
                      </label>
                    </td>
                    <td className="px-3 py-2 align-middle font-semibold text-slate-600 dark:text-slate-300">{opt.label}</td>
                    <td className="px-3 py-2 align-middle">
                      <input
                        className={ic + " w-full"}
                        placeholder={`Answer choice ${opt.label}`}
                        value={opt.value}
                        onChange={(e) => updateMcqOptionValue(qi, oi, e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {codingSlots.map((slot, ci) => (
        <section key={`code-${ci}`} className="rounded-3xl border border-violet-500/25 bg-violet-500/[0.05] p-6 dark:bg-violet-500/[0.08]">
          <h3 className="text-base font-semibold text-violet-900 dark:text-violet-100">Coding {ci + 1}</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input className={ic} placeholder="Problem title" value={slot.title} onChange={(e) => updateCoding(ci, { title: e.target.value })} />
            <select className={ic} value={slot.difficulty} onChange={(e) => updateCoding(ci, { difficulty: e.target.value })}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            <textarea className={`${ic} md:col-span-2`} rows={4} placeholder="Problem statement / requirements" value={slot.prompt} onChange={(e) => updateCoding(ci, { prompt: e.target.value })} />
            <input className={ic} type="number" min={0} value={slot.marks} onChange={(e) => updateCoding(ci, { marks: e.target.value })} placeholder="Marks" />
            <input className={ic} placeholder="Topics (comma-separated)" value={slot.topics} onChange={(e) => updateCoding(ci, { topics: e.target.value })} />
            <select className={ic} value={slot.starterLanguage} onChange={(e) => updateCoding(ci, { starterLanguage: e.target.value })}>
              <option value="python">Starter: Python</option>
              <option value="javascript">Starter: JavaScript</option>
              <option value="java">Starter: Java</option>
              <option value="cpp">Starter: C++</option>
            </select>
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[color:var(--recruiter-muted)]">Starter code ({slot.starterLanguage})</p>
          <textarea className={`${ic} mt-2 font-mono text-xs`} rows={6} value={slot.starterCodeText} onChange={(e) => updateCoding(ci, { starterCodeText: e.target.value })} placeholder="# Optional starter code" />
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[color:var(--recruiter-muted)]">Sample test case (visible to candidates)</p>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <textarea className={`${ic} font-mono text-xs`} rows={2} placeholder="Input" value={slot.sampleInput} onChange={(e) => updateCoding(ci, { sampleInput: e.target.value })} />
            <textarea className={`${ic} font-mono text-xs`} rows={2} placeholder="Expected output" value={slot.sampleOutput} onChange={(e) => updateCoding(ci, { sampleOutput: e.target.value })} />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--recruiter-muted)]">Hidden test cases (not shown to candidates)</p>
            <button
              type="button"
              className="rounded-xl border border-[color:var(--recruiter-border)] px-3 py-1.5 text-xs font-semibold hover:bg-black/[0.04] dark:hover:bg-white/10"
              onClick={() =>
                updateCoding(ci, {
                  hiddenCases: [...(slot.hiddenCases || []), defaultHiddenCase()]
                })
              }
            >
              Add hidden case
            </button>
          </div>
          <div className="mt-2 space-y-3">
            {(slot.hiddenCases || []).map((hc, hi) => (
              <div key={`h-${ci}-${hi}`} className="rounded-2xl border border-[color:var(--recruiter-border)] bg-white/40 p-3 dark:bg-white/[0.04]">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-violet-800 dark:text-violet-200">Hidden {hi + 1}</span>
                  {(slot.hiddenCases || []).length > 1 ? (
                    <button
                      type="button"
                      className="text-xs text-rose-600 hover:underline dark:text-rose-300"
                      onClick={() =>
                        updateCoding(ci, {
                          hiddenCases: (slot.hiddenCases || []).filter((_, j) => j !== hi)
                        })
                      }
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <textarea
                    className={`${ic} font-mono text-xs`}
                    rows={2}
                    placeholder="Input"
                    value={hc.input}
                    onChange={(e) => {
                      const next = [...(slot.hiddenCases || [])];
                      next[hi] = { ...next[hi], input: e.target.value };
                      updateCoding(ci, { hiddenCases: next });
                    }}
                  />
                  <textarea
                    className={`${ic} font-mono text-xs`}
                    rows={2}
                    placeholder="Expected output"
                    value={hc.output}
                    onChange={(e) => {
                      const next = [...(slot.hiddenCases || [])];
                      next[hi] = { ...next[hi], output: e.target.value };
                      updateCoding(ci, { hiddenCases: next });
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={busy || totalPlanned < 1}
          className="rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-50"
        >
          {busy
            ? draftExamId
              ? "Saving questions…"
              : "Creating assessment…"
            : draftExamId
              ? "Save question changes"
              : "Create assessment with questions"}
        </button>
      </div>
    </form>
  );
}
