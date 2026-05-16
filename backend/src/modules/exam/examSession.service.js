import Exam from "../../models/Exam.js";
import Question from "../../models/Question.js";
import ExamAttempt from "../../models/ExamAttempt.js";
import ExamRegistration from "../../models/ExamRegistration.js";
import CodingSubmission from "../../models/CodingSubmission.js";
import { AppError } from "../../utils/appError.js";

const randomize = (values) => {
  const arr = [...values];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const sanitizeQuestion = (question, shuffleOptions) => {
  const normalized = {
    id: question._id,
    type: question.type,
    title: question.title,
    prompt: question.prompt,
    difficulty: question.difficulty,
    sectionKey: question.sectionKey || null,
    topics: question.topics || [],
    marks: question.marks,
    negativeMark: question.negativeMark || 0
  };

  if (question.type === "mcq") {
    const options = (question.options || []).map((option) => ({
      label: option.label,
      value: option.value
    }));
    normalized.options = shuffleOptions ? randomize(options) : options;
  }

  if (question.type === "coding") {
    normalized.supportedLanguages = question.supportedLanguages || [];
    normalized.starterCode =
      question.starterCode && typeof question.starterCode === "object"
        ? { ...question.starterCode }
        : {};
    const cases = question.testCases || [];
    normalized.publicTestCases = cases
      .filter((tc) => !tc.isHidden)
      .map((tc) => ({ input: tc.input ?? "", expectedOutput: tc.expectedOutput ?? "" }));
    normalized.hiddenTestCaseCount = cases.filter((tc) => tc.isHidden).length;
  }

  return normalized;
};

const evaluateMcqAnswer = (question, selectedOption, negativeMarkingEnabled, defaultNegativeMark) => {
  if (selectedOption === null || selectedOption === undefined || selectedOption === "") return 0;
  const correct = question.options?.find((option) => option.isCorrect);
  if (!correct) return 0;
  if (String(correct.value) === String(selectedOption)) return question.marks || 0;

  if (!negativeMarkingEnabled) return 0;
  const qNegative = question.negativeMark ?? defaultNegativeMark ?? 0;
  return -Math.max(0, qNegative);
};

const finalizeAttempt = async ({ attempt, exam, questionDocs, submitType }) => {
  if (attempt.status !== "in_progress") return attempt;

  const questionMap = new Map(questionDocs.map((question) => [String(question._id), question]));
  const answerMap = new Map(attempt.answers.map((answer) => [String(answer.questionId), answer]));

  let score = 0;
  let answeredCount = 0;
  let reviewCount = 0;

  let mcqQuestionCount = 0;
  let mcqCorrectCount = 0;
  let mcqAnsweredCount = 0;
  let codingQuestionsScored = 0;
  let codingTestCasesPassed = 0;
  let codingTestCasesTotal = 0;

  for (const qid of attempt.questionOrder) {
    const q = questionMap.get(String(qid));
    if (q?.type === "mcq") mcqQuestionCount += 1;
  }

  const topicBreakdownMap = new Map();
  const difficultyBreakdownMap = new Map();

  const ensureTopicRow = (topic) => {
    const key = topic || "general";
    if (!topicBreakdownMap.has(key)) {
      topicBreakdownMap.set(key, {
        topic: key,
        attempted: 0,
        correct: 0,
        wrong: 0,
        score: 0,
        maxMarks: 0
      });
    }
    return topicBreakdownMap.get(key);
  };

  const ensureDifficultyRow = (difficulty) => {
    const key = difficulty || "medium";
    if (!difficultyBreakdownMap.has(key)) {
      difficultyBreakdownMap.set(key, {
        difficulty: key,
        attempted: 0,
        correct: 0,
        score: 0,
        maxMarks: 0
      });
    }
    return difficultyBreakdownMap.get(key);
  };

  for (const questionId of attempt.questionOrder) {
    const question = questionMap.get(String(questionId));
    if (!question || (question.type !== "mcq" && question.type !== "coding")) continue;

    const primaryTopic = (question.topics && question.topics[0]) || "general";
    const topicRow = ensureTopicRow(primaryTopic);
    const diffRow = ensureDifficultyRow(question.difficulty);
    topicRow.maxMarks += question.marks || 0;
    diffRow.maxMarks += question.marks || 0;

    if (question.type === "mcq") {
      const answer = answerMap.get(String(questionId));
      if (!answer?.selectedOption) continue;

      answeredCount += 1;
      if (answer.isMarkedForReview) reviewCount += 1;

      const pts = evaluateMcqAnswer(
        question,
        answer.selectedOption,
        exam.settings?.negativeMarkingEnabled,
        exam.settings?.defaultNegativeMark
      );
      score += pts;

      topicRow.attempted += 1;
      diffRow.attempted += 1;
      topicRow.score += pts;
      diffRow.score += pts;

      const correctOption = question.options?.find((option) => option.isCorrect);
      const isCorrect = correctOption && String(correctOption.value) === String(answer.selectedOption);
      mcqAnsweredCount += 1;
      if (isCorrect) mcqCorrectCount += 1;
      if (isCorrect) {
        topicRow.correct += 1;
        diffRow.correct += 1;
      } else {
        topicRow.wrong += 1;
      }
    } else {
      const submission = await CodingSubmission.findOne({
        examId: exam._id,
        candidateId: attempt.candidateId,
        questionId: question._id
      })
        .sort({ updatedAt: -1 })
        .lean();
      if (!submission) continue;

      answeredCount += 1;
      codingQuestionsScored += 1;
      const tr = submission.testResults || [];
      codingTestCasesPassed += tr.filter((t) => t.passed).length;
      codingTestCasesTotal += tr.length;
      const pct = Number(submission.score || 0);
      const pts = ((question.marks || 0) * pct) / 100;
      score += pts;
      topicRow.attempted += 1;
      diffRow.attempted += 1;
      topicRow.score += pts;
      diffRow.score += pts;
      if (pct >= 99.99) {
        topicRow.correct += 1;
        diffRow.correct += 1;
      } else {
        topicRow.wrong += 1;
      }
    }
  }

  const maxScore = questionDocs
    .filter((q) => q.type === "mcq" || q.type === "coding")
    .reduce((sum, q) => sum + (q.marks || 0), 0);

  attempt.status = submitType;
  attempt.submittedAt = new Date();
  attempt.analytics = {
    answeredCount,
    reviewCount,
    score,
    maxScore,
    mcqQuestionCount,
    mcqAnsweredCount,
    mcqCorrectCount,
    codingQuestionsScored,
    codingTestCasesPassed,
    codingTestCasesTotal,
    topicBreakdown: Array.from(topicBreakdownMap.values()),
    difficultyBreakdown: Array.from(difficultyBreakdownMap.values())
  };
  await attempt.save();
  return attempt;
};

export const startOrResumeExamSession = async ({ examId, candidateId }) => {
  const exam = await Exam.findById(examId).lean();
  if (!exam) throw new AppError("Exam not found", 404);

  const now = new Date();
  if (!["scheduled", "active"].includes(exam.status)) {
    throw new AppError("Exam is not available for attempting", 400);
  }
  if (exam.startTime && now < new Date(exam.startTime)) {
    throw new AppError("Exam has not started yet", 400);
  }
  if (exam.endTime && now > new Date(exam.endTime)) {
    throw new AppError("Exam has ended", 400);
  }

  const questionIdsFromSections = (exam.sections || []).flatMap((section) => section.questionIds || []);
  const baseQuestionIds = questionIdsFromSections.length ? questionIdsFromSections : exam.questionIds || [];
  if (!baseQuestionIds.length) throw new AppError("Exam does not have questions configured", 400);

  const questionDocs = await Question.find({ _id: { $in: baseQuestionIds } }).lean();
  if (!questionDocs.length) throw new AppError("Exam questions were not found", 404);

  let attempt = await ExamAttempt.findOne({ examId, candidateId });
  if (attempt && attempt.status === "in_progress") {
    if (attempt.expiresAt < now) {
      if (exam.settings?.autoSubmit) {
        attempt = await finalizeAttempt({
          attempt,
          exam,
          questionDocs,
          submitType: "auto_submitted"
        });
        return { exam, questions: questionDocs, attempt };
      }
      throw new AppError("Exam time is over", 400);
    }
    return { exam, questions: questionDocs, attempt };
  }

  if (attempt && attempt.status !== "in_progress") {
    throw new AppError("Exam attempt already submitted", 409);
  }

  const hasRegistration = await ExamRegistration.exists({ examId, candidateId });
  if (!hasRegistration) {
    throw new AppError("Register for this assessment before starting the attempt", 403);
  }

  const sectionOrder = (exam.sections || [])
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((section) => section.key);
  const questionOrder = exam.settings?.shuffleQuestions ? randomize(baseQuestionIds) : [...baseQuestionIds];

  const durationMs = (exam.durationMinutes || 0) * 60 * 1000;
  const expiresAt = new Date(now.getTime() + durationMs);
  const sectionsProgress = sectionOrder.map((sectionKey, idx) => ({
    sectionKey,
    startedAt: idx === 0 ? now : null,
    completedAt: null,
    timeSpentSeconds: 0
  }));

  const createdAttempt = await ExamAttempt.create({
    examId,
    candidateId,
    startedAt: now,
    expiresAt,
    questionOrder,
    sectionOrder,
    currentSectionKey: sectionOrder[0] || null,
    sectionsProgress
  });

  return { exam, questions: questionDocs, attempt: createdAttempt };
};

export const upsertExamAnswer = async ({ examId, candidateId, payload }) => {
  const attempt = await ExamAttempt.findOne({ examId, candidateId });
  if (!attempt) throw new AppError("Exam attempt not found", 404);
  if (attempt.status !== "in_progress") throw new AppError("Exam already submitted", 409);
  if (new Date() > attempt.expiresAt) throw new AppError("Exam timer is over", 400);

  const { questionId, selectedOption, isMarkedForReview = false, timeSpentSeconds = 0, sectionKey } = payload;
  const normalizedSelected =
    selectedOption === null || selectedOption === undefined || selectedOption === ""
      ? null
      : String(selectedOption);
  const existingAnswer = attempt.answers.find((answer) => String(answer.questionId) === String(questionId));
  if (existingAnswer) {
    existingAnswer.selectedOption = normalizedSelected;
    existingAnswer.isMarkedForReview = isMarkedForReview;
    existingAnswer.timeSpentSeconds = Math.max(0, Number(timeSpentSeconds || 0));
    existingAnswer.lastUpdatedAt = new Date();
  } else {
    attempt.answers.push({
      questionId,
      selectedOption: normalizedSelected,
      isMarkedForReview,
      timeSpentSeconds: Math.max(0, Number(timeSpentSeconds || 0)),
      lastUpdatedAt: new Date()
    });
  }

  if (sectionKey && attempt.sectionOrder.includes(sectionKey)) {
    attempt.currentSectionKey = sectionKey;
  }

  attempt.analytics.answeredCount = attempt.answers.filter((answer) => Boolean(answer.selectedOption)).length;
  attempt.analytics.reviewCount = attempt.answers.filter((answer) => answer.isMarkedForReview).length;

  await attempt.save();
  return attempt;
};

export const submitExamAttempt = async ({ examId, candidateId }) => {
  const attempt = await ExamAttempt.findOne({ examId, candidateId });
  if (!attempt) throw new AppError("Exam attempt not found", 404);

  const exam = await Exam.findById(examId).lean();
  if (!exam) throw new AppError("Exam not found", 404);
  const questionDocs = await Question.find({ _id: { $in: attempt.questionOrder } }).lean();

  const submitType = new Date() > attempt.expiresAt ? "auto_submitted" : "submitted";

  return finalizeAttempt({
    attempt,
    exam,
    questionDocs,
    submitType
  });
};

export const getExamResultForCandidate = async ({ examId, candidateId }) => {
  const attempt = await ExamAttempt.findOne({ examId, candidateId }).lean();
  if (!attempt) throw new AppError("Exam attempt not found", 404);
  if (attempt.status === "in_progress") {
    throw new AppError("Exam is still in progress", 400);
  }
  const exam = await Exam.findById(examId).lean();
  if (!exam) throw new AppError("Exam not found", 404);
  return {
    exam: { id: exam._id, title: exam.title },
    attempt: {
      id: attempt._id,
      status: attempt.status,
      submittedAt: attempt.submittedAt,
      analytics: attempt.analytics
    }
  };
};

export const buildExamSessionResponse = ({ exam, questions, attempt }) => {
  const questionMap = new Map(questions.map((question) => [String(question._id), question]));
  const questionsOrdered = attempt.questionOrder
    .map((id) => questionMap.get(String(id)))
    .filter(Boolean)
    .map((question) => sanitizeQuestion(question, exam.settings?.shuffleOptions));

  return {
    serverTime: new Date().toISOString(),
    exam: {
      id: exam._id,
      title: exam.title,
      description: exam.description,
      durationMinutes: exam.durationMinutes,
      settings: exam.settings,
      sections: exam.sections || []
    },
    attempt: {
      id: attempt._id,
      status: attempt.status,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      expiresAt: attempt.expiresAt,
      sectionOrder: attempt.sectionOrder,
      currentSectionKey: attempt.currentSectionKey,
      answers: attempt.answers,
      analytics: attempt.analytics
    },
    questions: questionsOrdered
  };
};
