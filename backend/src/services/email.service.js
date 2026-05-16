import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

const transporter = nodemailer.createTransport({
  host: env.smtpHost,
  port: env.smtpPort,
  secure: env.smtpSecure,
  auth: {
    user: env.smtpUser,
    pass: env.smtpPass
  }
});

const assertEmailConfig = () => {
  const requiredValues = [env.smtpHost, env.smtpUser, env.smtpPass, env.fromEmail];
  if (requiredValues.some((value) => !value)) {
    throw new Error("SMTP is not configured. Please set SMTP_HOST, SMTP_USER, SMTP_PASS, and FROM_EMAIL.");
  }
};

export const sendVerificationEmail = async ({ to, name, verifyUrl }) => {
  assertEmailConfig();

  await transporter.sendMail({
    from: env.fromEmail,
    to,
    subject: "Verify your email - AI Exam Platform",
    text: `Hi ${name},\n\nPlease verify your email by opening this link:\n${verifyUrl}\n\nIf you did not create this account, you can ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Verify your email</h2>
        <p>Hi ${name},</p>
        <p>Please click the button below to verify your account:</p>
        <p>
          <a href="${verifyUrl}" style="display:inline-block;padding:10px 16px;background:#5b21b6;color:#fff;text-decoration:none;border-radius:6px;">
            Verify Email
          </a>
        </p>
        <p>Or open this URL directly:</p>
        <p><a href="${verifyUrl}">${verifyUrl}</a></p>
        <p>If you did not create this account, you can ignore this email.</p>
      </div>
    `
  });

  logger.info(`Verification email sent to ${to}`);
};

export const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  assertEmailConfig();

  await transporter.sendMail({
    from: env.fromEmail,
    to,
    subject: "Reset your password - AI Exam Platform",
    text: `Hi ${name},\n\nReset your password by opening this link:\n${resetUrl}\n\nThis link expires in 1 hour. If you did not request this, you can ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Reset your password</h2>
        <p>Hi ${name},</p>
        <p>Please click the button below to create a new password. This link expires in 1 hour.</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;padding:10px 16px;background:#5b21b6;color:#fff;text-decoration:none;border-radius:6px;">
            Reset Password
          </a>
        </p>
        <p>Or open this URL directly:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>If you did not request this, you can ignore this email.</p>
      </div>
    `
  });

  logger.info(`Password reset email sent to ${to}`);
};

const sendOptionalMail = async (fn) => {
  try {
    assertEmailConfig();
    await fn();
  } catch (err) {
    if (err.message?.includes("SMTP is not configured")) {
      logger.warn("Email skipped: SMTP is not configured");
      return;
    }
    throw err;
  }
};

export const sendShortlistedEmail = async ({ to, name, examTitle, recruiterName }) => {
  await sendOptionalMail(async () => {
    await transporter.sendMail({
      from: env.fromEmail,
      to,
      subject: `You were selected — ${examTitle}`,
      text: `Hi ${name},\n\nCongratulations — you were selected for "${examTitle}" with ${recruiterName}.\n\nPrepare for further interview rounds. Your recruiter will share scheduling details when the next steps are ready. Please keep notifications on in the platform.\n\nBest of luck,\nThe Assess HQ team\n`,
      html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>You were selected</h2>
        <p>Hi ${name},</p>
        <p>Congratulations — you were selected for <strong>${examTitle}</strong> with ${recruiterName}.</p>
        <p>Prepare for further interview rounds. Your recruiter will share scheduling details when the next steps are ready.</p>
        <p>Please monitor your email and in-app notifications.</p>
        <p>Best regards,<br/>The Assess HQ team</p>
      </div>
    `
    });
    logger.info(`Shortlist email sent to ${to}`);
  });
};

export const sendInterviewRoundShortlistedEmail = async ({
  to,
  name,
  examTitle,
  recruiterName,
  roundNumber,
  roundMax,
  isLastConfiguredRound
}) => {
  const hasRoundIndex = roundNumber != null && roundMax != null;
  const roundLine = hasRoundIndex
    ? `You were shortlisted in <strong>round ${roundNumber} of ${roundMax}</strong> for <strong>${examTitle}</strong>.`
    : `You were shortlisted in <strong>this interview round</strong> for <strong>${examTitle}</strong>.`;

  const closingText = isLastConfiguredRound
    ? "This was the final interview round for this assessment. The recruiter will contact you with joining details."
    : "You were shortlisted — all the best for further rounds. Your recruiter will reach out when the next round is scheduled.";

  const closingPlain = isLastConfiguredRound
    ? "This was the final interview round for this assessment. The recruiter will contact you with joining details."
    : "You were shortlisted — all the best for further rounds. Your recruiter will reach out when the next round is scheduled.";

  await sendOptionalMail(async () => {
    await transporter.sendMail({
      from: env.fromEmail,
      to,
      subject: isLastConfiguredRound
        ? `Shortlisted — final interview round (${examTitle})`
        : `Shortlisted — interview round (${examTitle})`,
      text: `Hi ${name},\n\nCongratulations — ${hasRoundIndex ? `you were shortlisted in round ${roundNumber} of ${roundMax} for "${examTitle}"` : `you were shortlisted in this interview round for "${examTitle}"`} with ${recruiterName}.\n\n${closingPlain}\n\nBest regards,\nThe Assess HQ team\n`,
      html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Congratulations — shortlisted</h2>
        <p>Hi ${name},</p>
        <p>${roundLine}</p>
        <p>Message from <strong>${recruiterName || "The hiring team"}</strong>.</p>
        <p>${closingText}</p>
        <p>Best regards,<br/>The Assess HQ team</p>
      </div>
    `
    });
    logger.info(`Interview round shortlist email sent to ${to}`);
  });
};

export const sendInterviewScheduledEmail = async ({
  to,
  name,
  assessmentName,
  scheduledAt,
  meetingUrl,
  roundType,
  durationMinutes,
  isUpdate = false
}) => {
  const dt = new Date(scheduledAt);
  const when = dt.toLocaleString();
  const headline = isUpdate ? "Interview details updated" : "Interview round scheduled";
  const subject = isUpdate ? `Interview updated — ${assessmentName}` : `Interview scheduled — ${assessmentName}`;
  await sendOptionalMail(async () => {
    await transporter.sendMail({
      from: env.fromEmail,
      to,
      subject,
      text: `Hi ${name},\n\n${isUpdate ? "Your interview details were updated." : `You have been selected for the interview round for "${assessmentName}".`}\n\nWhen: ${when}\nDuration: ${durationMinutes} minutes\nRound: ${roundType}\n${meetingUrl ? `Google Meet / link: ${meetingUrl}\n` : ""}\n`,
      html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>${headline}</h2>
        <p>Hi ${name},</p>
        <p>${isUpdate ? `Your interview for <strong>${assessmentName}</strong> was updated by the recruiting team.` : `You have been selected for the interview round for <strong>${assessmentName}</strong>.`}</p>
        <ul>
          <li><strong>When:</strong> ${when}</li>
          <li><strong>Duration:</strong> ${durationMinutes} minutes</li>
          <li><strong>Round type:</strong> ${roundType}</li>
        </ul>
        ${meetingUrl ? `<p><a href="${meetingUrl}">Join meeting</a></p>` : ""}
      </div>
    `
    });
    logger.info(`Interview scheduled email sent to ${to}`);
  });
};
