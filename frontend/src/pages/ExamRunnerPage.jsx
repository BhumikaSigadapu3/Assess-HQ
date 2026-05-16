import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import apiClient from "../services/apiClient.js";
import { CodingWorkspaceInner } from "./CodingWorkspaceInner.jsx";

const formatMs = (ms) => {
  const safe = Math.max(0, ms);
  const totalSeconds = Math.floor(safe / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

export default function ExamRunnerPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [persistError, setPersistError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [session, setSession] = useState(null);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [timeLabel, setTimeLabel] = useState("00:00");
  const [savePending, setSavePending] = useState(false);
  const [activeSection, setActiveSection] = useState("all");

  const clockRef = useRef(null);

  const answerMap = useMemo(() => {
    const entries = session?.attempt?.answers || [];
    return new Map(entries.map((answer) => [String(answer.questionId), answer]));
  }, [session]);

  const filteredQuestionIndexes = useMemo(() => {
    if (!session?.questions) return [];
    if (activeSection === "all") return session.questions.map((_, i) => i);
    return session.questions
      .map((q, i) => ({ q, i }))
      .filter(({ q }) => (q.sectionKey || "general") === activeSection)
      .map(({ i }) => i);
  }, [session, activeSection]);

  const activeQuestion = session?.questions?.[activeQuestionIndex];

  const computeLabel = useCallback(() => {
    if (!clockRef.current) return "00:00";
    const { receivedAt, serverTimeMs, expiresAtMs } = clockRef.current;
    const approxServerNow = serverTimeMs + (Date.now() - receivedAt);
    return formatMs(expiresAtMs - approxServerNow);
  }, []);

  const handleSubmit = useCallback(
    async (auto = false) => {
      if (!auto) {
        const ok = window.confirm(
          "Finish and submit this exam now? You will leave the exam screen and cannot change your answers."
        );
        if (!ok) return;
      }
      setSubmitError(null);
      try {
        const { data } = await apiClient.post(`/candidate/exams/${examId}/submit`);
        setSession((prev) =>
          prev
            ? {
                ...prev,
                attempt: {
                  ...prev.attempt,
                  status: data.status,
                  submittedAt: data.submittedAt,
                  analytics: data.analytics
                }
              }
            : prev
        );
        navigate("/candidate/assessments");
      } catch (err) {
        setSubmitError(err.response?.data?.message || "Failed to submit exam");
      }
    },
    [examId, navigate]
  );

  useEffect(() => {
    const fetchSession = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { data } = await apiClient.get(`/candidate/exams/${examId}/session`);
        setSession(data);
        if (data.serverTime && data.attempt?.expiresAt) {
          clockRef.current = {
            receivedAt: Date.now(),
            serverTimeMs: new Date(data.serverTime).getTime(),
            expiresAtMs: new Date(data.attempt.expiresAt).getTime()
          };
        }
        setTimeLabel(computeLabel());
      } catch (err) {
        const details = err.response?.data?.details;
        const firstDetail = Array.isArray(details) && details[0]?.msg ? details[0].msg : null;
        setLoadError(firstDetail || err.response?.data?.message || "Failed to load exam session");
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [examId, computeLabel]);

  useEffect(() => {
    if (!session?.attempt?.expiresAt || session?.attempt?.status !== "in_progress") return undefined;

    const interval = setInterval(() => {
      const label = computeLabel();
      setTimeLabel(label);
      if (label === "00:00") {
        handleSubmit(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session, computeLabel, handleSubmit]);

  const persistAnswer = async (payload) => {
    setSavePending(true);
    setPersistError(null);
    try {
      const body = {
        questionId: String(payload.questionId),
        selectedOption: payload.selectedOption
      };
      if (typeof payload.sectionKey === "string" && payload.sectionKey.length > 0) {
        body.sectionKey = payload.sectionKey;
      }
      await apiClient.post(`/candidate/exams/${examId}/answers`, body);
      setSession((prev) => {
        if (!prev) return prev;
        const prevAnswers = prev.attempt.answers || [];
        const idx = prevAnswers.findIndex((ans) => String(ans.questionId) === String(payload.questionId));
        const nextAnswer = {
          questionId: payload.questionId,
          selectedOption:
            payload.selectedOption === undefined || payload.selectedOption === null
              ? null
              : String(payload.selectedOption),
          isMarkedForReview: Boolean(payload.isMarkedForReview),
          timeSpentSeconds: payload.timeSpentSeconds || 0
        };
        const answers = [...prevAnswers];
        if (idx >= 0) answers[idx] = { ...answers[idx], ...nextAnswer };
        else answers.push(nextAnswer);
        return {
          ...prev,
          attempt: {
            ...prev.attempt,
            answers
          }
        };
      });
    } catch (err) {
      const details = err.response?.data?.details;
      const firstDetail = Array.isArray(details) && details[0]?.msg ? details[0].msg : null;
      setPersistError(firstDetail || err.response?.data?.message || err.message || "Failed to save answer");
    } finally {
      setSavePending(false);
    }
  };

  if (loading) return <p>Loading exam session...</p>;
  if (loadError) return <p className="rounded bg-red-50 p-3 text-red-700">{loadError}</p>;
  if (!session) return null;

  const totalQuestions = session.questions.length;
  const answeredCount = session.questions.filter((q) => answerMap.get(String(q.id))?.selectedOption).length;
  const progress = totalQuestions ? Math.round((answeredCount / totalQuestions) * 100) : 0;
  const canGoNextQuestion = activeQuestionIndex < totalQuestions - 1;
  const goNextQuestion = () => {
    if (!canGoNextQuestion) return;
    setActiveQuestionIndex((i) => i + 1);
  };

  return (
    <section className="mx-auto flex h-[100dvh] max-h-[100dvh] w-full max-w-[96rem] flex-col gap-3 overflow-hidden px-4 py-3">
      {persistError ? (
        <div className="shrink-0 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {persistError}
        </div>
      ) : null}
      {submitError ? (
        <div className="shrink-0 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {submitError}
        </div>
      ) : null}

      <div className="shrink-0 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-100">
        Exam in progress: use only this screen until you finish. The main sidebar is hidden so you are not interrupted. When time reaches zero, your attempt is submitted automatically if auto-submit is enabled.
      </div>

      <div className="flex shrink-0 flex-col gap-3 rounded-xl border bg-slate-50 p-3 dark:bg-slate-900 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">{session.exam.title}</h1>
          <p className="text-sm text-slate-500">{session.exam.description}</p>
          <div className="mt-3 h-2 w-full max-w-md rounded-full bg-slate-200 dark:bg-slate-800">
            <div className="h-2 rounded-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {answeredCount}/{totalQuestions} answered ({progress}%)
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-slate-500">Time Left (server-synced)</p>
          <p className={`text-2xl font-semibold ${timeLabel === "00:00" ? "text-red-600" : ""}`}>{timeLabel}</p>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap gap-2">
        <button
          type="button"
          className={`rounded border px-3 py-1 text-xs ${activeSection === "all" ? "bg-brand-600 text-white" : "bg-white dark:bg-slate-800"}`}
          onClick={() => {
            setActiveSection("all");
            setActiveQuestionIndex(0);
          }}
        >
          All sections
        </button>
        {(session.exam.sections || []).map((section) => (
          <button
            key={section.key}
            type="button"
            className={`rounded border px-3 py-1 text-xs ${
              activeSection === section.key ? "bg-brand-600 text-white" : "bg-white dark:bg-slate-800"
            }`}
            onClick={() => {
              setActiveSection(section.key);
              const firstIdx = session.questions.findIndex((q) => (q.sectionKey || "general") === section.key);
              setActiveQuestionIndex(firstIdx >= 0 ? firstIdx : 0);
            }}
          >
            {section.title}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-0">
        <PanelGroup
          direction="horizontal"
          autoSaveId={`exam-runner-${examId}`}
          className="flex min-h-0 min-w-0 flex-1 gap-0"
        >
          <Panel defaultSize={18} minSize={12} maxSize={36} className="min-w-0">
            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-700/80 bg-slate-900/60 p-3 dark:bg-slate-900/40">
              <p className="mb-2 shrink-0 text-xs font-medium uppercase tracking-wide text-slate-500">Questions</p>
              <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1">
                {filteredQuestionIndexes.map((idx) => {
                  const question = session.questions[idx];
                  const answered = answerMap.get(String(question.id))?.selectedOption;
                  return (
                    <button
                      key={String(question.id)}
                      type="button"
                      className={`shrink-0 rounded border px-3 py-2 text-left text-sm ${
                        idx === activeQuestionIndex ? "bg-brand-600 text-white" : "bg-white dark:bg-slate-800"
                      } ${answered ? "border-emerald-400" : ""}`}
                      onClick={() => setActiveQuestionIndex(idx)}
                    >
                      Q{idx + 1}
                      {question.type === "coding" ? (
                        <span className="ml-1 text-[10px] uppercase opacity-80">code</span>
                      ) : null}
                    </button>
                  );
                })}
              </nav>
            </div>
          </Panel>

          <PanelResizeHandle className="mx-1 w-1.5 shrink-0 cursor-col-resize rounded-full bg-slate-600 transition-colors hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500" />

          <Panel defaultSize={38} minSize={22} className="min-w-0">
            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-700/80 bg-slate-50 dark:bg-slate-900/30">
              {activeQuestion ? (
                <article className="min-h-0 flex-1 overflow-y-auto p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    {activeQuestion.sectionKey || "General"} - {activeQuestion.difficulty}
                    {activeQuestion.topics?.length ? ` - topics: ${activeQuestion.topics.join(", ")}` : ""}
                  </p>
                  <h2 className="mt-2 text-lg font-medium">{activeQuestion.title}</h2>
                  <p className="mt-2 whitespace-pre-wrap text-slate-700 dark:text-slate-200">{activeQuestion.prompt}</p>
                </article>
              ) : (
                <p className="p-4 text-sm text-slate-500">No question selected.</p>
              )}
            </div>
          </Panel>

          <PanelResizeHandle className="mx-1 w-1.5 shrink-0 cursor-col-resize rounded-full bg-slate-600 transition-colors hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500" />

          <Panel defaultSize={44} minSize={26} className="min-w-0">
            <div className="flex h-full min-h-0 flex-col gap-1 overflow-hidden">
              {activeQuestion && canGoNextQuestion ? (
                <div className="flex shrink-0 justify-end rounded-lg border border-slate-700/60 bg-slate-900/30 px-3 py-2 dark:bg-slate-900/50">
                  <button
                    type="button"
                    className="rounded border border-slate-500 bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-100 hover:bg-slate-700"
                    onClick={goNextQuestion}
                  >
                    Next question
                  </button>
                </div>
              ) : null}
              {activeQuestion?.type === "mcq" ? (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-700/80 bg-slate-50 p-4 dark:bg-slate-900/30">
                  <p className="mb-2 shrink-0 text-xs font-medium uppercase tracking-wide text-slate-500">Options</p>
                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                    {activeQuestion.options?.map((option, oi) => {
                      const stored = answerMap.get(String(activeQuestion.id))?.selectedOption;
                      const checked = String(stored ?? "") === String(option.value ?? "");
                      return (
                        <label
                          key={`${String(activeQuestion.id)}-${oi}-${String(option.label ?? "")}`}
                          className="flex cursor-pointer items-center gap-2 rounded border p-2 hover:bg-slate-100 dark:hover:bg-slate-800/80"
                        >
                          <input
                            type="radio"
                            name={`question-${activeQuestion.id}`}
                            checked={checked}
                            onChange={() =>
                              persistAnswer({
                                questionId: activeQuestion.id,
                                selectedOption: option.value,
                                sectionKey: activeQuestion.sectionKey
                              })
                            }
                          />
                          <span>{option.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : activeQuestion?.type === "coding" ? (
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                  <CodingWorkspaceInner
                    key={String(activeQuestion.id)}
                    examId={examId}
                    questionId={String(activeQuestion.id)}
                    embedded
                    fillHeight
                  />
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-slate-600 p-6 text-sm text-slate-500">
                  Select a question
                </div>
              )}
            </div>
          </Panel>
        </PanelGroup>
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-slate-800/60 pt-3">
        <p className="text-sm text-slate-500">{savePending ? "Saving..." : "All changes saved"}</p>
        <button
          type="button"
          className="rounded bg-red-600 px-4 py-2 font-medium text-white"
          onClick={() => handleSubmit(false)}
        >
          Finish exam
        </button>
      </div>
    </section>
  );
}
