import { logger } from "../../config/logger.js";
import Notification from "../../models/Notification.js";
import User from "../../models/User.js";
import { ACCOUNT_STATUS, ROLES } from "../../constants/roles.js";
import {
  sendInterviewRoundShortlistedEmail,
  sendInterviewScheduledEmail,
  sendShortlistedEmail
} from "../../services/email.service.js";

/** After assessment — candidate is shortlisted to proceed toward interview rounds. */
export const notifyCandidateShortlisted = async ({ candidateId, examTitle, recruiterName, examId }) => {
  await Notification.create({
    userId: candidateId,
    type: "assessment_shortlist",
    title: "You were selected",
    message: `Congratulations — you were selected for "${examTitle}". Prepare for further interview rounds; your recruiter will share scheduling details when the next steps are ready.`,
    isRead: false,
    payload: { examId: String(examId), examTitle }
  });

  const candidate = await User.findById(candidateId).select("email name").lean();
  if (!candidate?.email) return;

  try {
    await sendShortlistedEmail({
      to: candidate.email,
      name: candidate.name,
      examTitle,
      recruiterName: recruiterName || "The hiring team"
    });
  } catch (err) {
    logger.warn(`Shortlist email skipped: ${err.message}`);
  }
};

/** After a completed interview round — candidate shortlisted for this round. */
export const notifyCandidateInterviewShortlisted = async ({
  candidateId,
  examTitle,
  roundNumber,
  roundMax,
  isLastConfiguredRound,
  recruiterName,
  examId,
  interviewId
}) => {
  const hasRoundIndex = roundNumber != null && roundMax != null;
  const roundPhrase = hasRoundIndex ? `round ${roundNumber} of ${roundMax}` : "this interview round";

  const closing = isLastConfiguredRound
    ? " The recruiter will contact you with joining details."
    : " You were shortlisted — all the best for further rounds.";

  const title = isLastConfiguredRound ? "Shortlisted — interview round complete" : "Shortlisted — interview round";

  const assessmentPart = examTitle ? ` for "${examTitle}"` : "";
  const message = `Congratulations — you were shortlisted in ${roundPhrase}${assessmentPart}.${closing}`;

  await Notification.create({
    userId: candidateId,
    type: "interview_round_shortlist",
    title,
    message,
    isRead: false,
    payload: {
      interviewId: String(interviewId),
      examId: examId || "",
      examTitle: examTitle || "",
      roundNumber: roundNumber ?? null,
      roundMax: roundMax ?? null,
      isLastConfiguredRound: Boolean(isLastConfiguredRound)
    }
  });

  const candidate = await User.findById(candidateId).select("email name").lean();
  if (!candidate?.email) return;

  try {
    await sendInterviewRoundShortlistedEmail({
      to: candidate.email,
      name: candidate.name,
      examTitle: examTitle || "your process",
      recruiterName: recruiterName || "The hiring team",
      roundNumber,
      roundMax,
      isLastConfiguredRound
    });
  } catch (err) {
    logger.warn(`Interview shortlist email skipped: ${err.message}`);
  }
};

export const notifyCandidatesAssessmentPublished = async ({ examId, examTitle }) => {
  const candidates = await User.find({
    role: ROLES.CANDIDATE,
    accountStatus: ACCOUNT_STATUS.ACTIVE
  })
    .select("_id")
    .limit(3000)
    .lean();
  if (!candidates.length) return;

  const docs = candidates.map((u) => ({
    userId: u._id,
    type: "assessment_created",
    title: "New assessment available",
    message: `"${examTitle}" is now open for registration.`,
    isRead: false,
    payload: { examId: String(examId), examTitle }
  }));

  try {
    await Notification.insertMany(docs, { ordered: false });
  } catch (err) {
    logger.warn(`Assessment publish notifications partially skipped: ${err.message}`);
  }
};

export const notifyCandidateInterviewScheduled = async ({
  candidateId,
  examTitle,
  scheduledAt,
  meetingUrl,
  roundType,
  durationMinutes,
  interviewId,
  isUpdate = false
}) => {
  const when = new Date(scheduledAt).toISOString();
  const whenLocal = new Date(scheduledAt).toLocaleString();
  await Notification.create({
    userId: candidateId,
    type: "interview_scheduled",
    title: isUpdate ? "Interview details updated" : "Interview round scheduled",
    message: isUpdate
      ? `Your interview${examTitle ? ` for "${examTitle}"` : ""} was updated by the recruiter. Time: ${whenLocal}.${meetingUrl ? ` Meet link: ${meetingUrl}` : ""}`
      : `You have been selected for the interview round${examTitle ? ` for "${examTitle}"` : ""}. Date: ${whenLocal}.${meetingUrl ? ` Meet link: ${meetingUrl}` : ""}`,
    isRead: false,
    payload: {
      interviewId: String(interviewId),
      examTitle: examTitle || "",
      scheduledAt: when,
      meetingUrl: meetingUrl || "",
      roundType: roundType || "technical",
      durationMinutes: durationMinutes || 45,
      isUpdate: Boolean(isUpdate)
    }
  });

  const candidate = await User.findById(candidateId).select("email name").lean();
  if (!candidate?.email) return;

  try {
    await sendInterviewScheduledEmail({
      to: candidate.email,
      name: candidate.name,
      assessmentName: examTitle || "Your assessment",
      scheduledAt,
      meetingUrl,
      roundType,
      durationMinutes,
      isUpdate: Boolean(isUpdate)
    });
  } catch (err) {
    logger.warn(`Interview email skipped: ${err.message}`);
  }
};
