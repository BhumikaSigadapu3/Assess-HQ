import User from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/appError.js";
import { createAuthTokens } from "../services/token.service.js";
import { verifyRefreshToken } from "../utils/jwt.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "../services/email.service.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { randomBytes } from "node:crypto";
import { ACCOUNT_STATUS, ROLES, PUBLIC_SIGNUP_ROLES } from "../constants/roles.js";
import { persistCanonicalUserRole } from "../utils/roleNormalization.js";
import { clearCsrfCookie } from "../middlewares/csrf.middleware.js";
import {
  deleteTokenValue,
  getTokenValue,
  parseDurationToSeconds,
  setTokenValue
} from "../modules/auth/tokenStore.service.js";

const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const REFRESH_TOKEN_TTL_SECONDS = parseDurationToSeconds(env.jwtRefreshExpiresIn, 7 * 24 * 60 * 60);
const PASSWORD_RESET_TTL_SECONDS = 60 * 60;
const TOKEN_NAMESPACE = Object.freeze({
  refresh: "auth:refresh",
  passwordReset: "auth:password-reset"
});

const createEmailVerificationToken = () => randomBytes(32).toString("hex");

const setRefreshCookie = (res, refreshToken) => {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSecure ? "none" : "lax",
    domain: env.cookieDomain,
    maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000
  });
};

export const signup = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const exists = await User.findOne({ email });
  if (exists) throw new AppError("Email already in use", 409);

  const resolvedRole = role ?? ROLES.CANDIDATE;
  if (!PUBLIC_SIGNUP_ROLES.includes(resolvedRole)) {
    throw new AppError("Invalid role for self-service signup", 400);
  }

  const verifyToken = createEmailVerificationToken();
  const isRecruiterSignup = resolvedRole === ROLES.RECRUITER;
  const user = await User.create({
    name,
    email,
    password,
    role: resolvedRole,
    accountStatus: isRecruiterSignup
      ? ACCOUNT_STATUS.PENDING_APPROVAL
      : ACCOUNT_STATUS.ACTIVE,
    recruiterApproval: isRecruiterSignup
      ? { requestedAt: new Date() }
      : undefined,
    emailVerificationToken: verifyToken,
    emailVerificationExpiresAt: new Date(Date.now() + EMAIL_VERIFY_TTL_MS)
  });

  const verifyUrl = `${env.clientUrl}/verify-email?token=${encodeURIComponent(verifyToken)}`;
  try {
    await sendVerificationEmail({ to: user.email, name: user.name, verifyUrl });
  } catch (error) {
    await User.findByIdAndDelete(user._id);
    logger.error("Signup failed while sending verification email", error);
    throw new AppError(
      "Failed to send verification email. Please check SMTP settings and try again.",
      500
    );
  }

  res.status(201).json({
    message: isRecruiterSignup
      ? "Recruiter account created. Please verify your email; admin approval is required before sign in."
      : "Account created. Please verify your email from your inbox."
  });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;
  if (!token?.trim()) throw new AppError("Invalid or expired verification token", 400);

  const now = new Date();

  // First successful verification (atomic). Keep the token on the document so a
  // duplicate GET (React Strict Mode, link prefetchers, double tab) still finds
  // this user and hits the idempotent branch below instead of failing.
  const newlyVerified = await User.findOneAndUpdate(
    {
      emailVerificationToken: token,
      emailVerificationExpiresAt: { $gt: now },
      isEmailVerified: false
    },
    { $set: { isEmailVerified: true } },
    { new: true }
  );

  if (newlyVerified) {
    return res.json({ message: "Email verified successfully" });
  }

  const alreadyVerified = await User.findOne({
    emailVerificationToken: token,
    isEmailVerified: true
  });

  if (alreadyVerified) {
    return res.json({
      message: "Email already verified. You can sign in."
    });
  }

  const stale = await User.findOne({ emailVerificationToken: token });
  if (stale && !stale.isEmailVerified) {
    throw new AppError("Invalid or expired verification token", 400);
  }

  throw new AppError("Invalid or expired verification token", 400);
});

export const resendVerificationEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  // Keep response generic to avoid email enumeration.
  if (!user || user.isEmailVerified) {
    return res.json({ message: "If the account exists and is unverified, verification email was sent." });
  }

  const verifyToken = createEmailVerificationToken();
  user.emailVerificationToken = verifyToken;
  user.emailVerificationExpiresAt = new Date(Date.now() + EMAIL_VERIFY_TTL_MS);
  await user.save();

  const verifyUrl = `${env.clientUrl}/verify-email?token=${encodeURIComponent(verifyToken)}`;
  await sendVerificationEmail({ to: user.email, name: user.name, verifyUrl });

  res.json({ message: "If the account exists and is unverified, verification email was sent." });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError("Invalid credentials", 401);
  }
  if (!user.isEmailVerified) {
    throw new AppError("Please verify your email before logging in", 403);
  }

  await persistCanonicalUserRole(User, user);

  if ((user.accountStatus ?? ACCOUNT_STATUS.ACTIVE) !== ACCOUNT_STATUS.ACTIVE) {
    const messages = {
      [ACCOUNT_STATUS.PENDING_APPROVAL]: "Recruiter account is pending admin approval",
      [ACCOUNT_STATUS.REJECTED]: "Recruiter account approval was rejected",
      [ACCOUNT_STATUS.SUSPENDED]: "Account is suspended"
    };
    throw new AppError(
      messages[user.accountStatus] || "Account is not active",
      403
    );
  }

  await User.findByIdAndUpdate(user._id, {
    $set: {
      emailVerificationToken: null,
      emailVerificationExpiresAt: null
    }
  });

  const { accessToken, refreshToken } = createAuthTokens(user);
  await setTokenValue({
    namespace: TOKEN_NAMESPACE.refresh,
    key: user._id.toString(),
    value: refreshToken,
    ttlSeconds: REFRESH_TOKEN_TTL_SECONDS
  });
  setRefreshCookie(res, refreshToken);

  res.json({
    accessToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) throw new AppError("Missing refresh token", 401);

  const payload = verifyRefreshToken(token);
  const storedToken = await getTokenValue({
    namespace: TOKEN_NAMESPACE.refresh,
    key: payload.sub
  });
  if (storedToken !== token) throw new AppError("Invalid refresh token", 401);

  const user = await User.findById(payload.sub);
  if (!user) throw new AppError("User not found", 404);

  await persistCanonicalUserRole(User, user);
  if ((user.accountStatus ?? ACCOUNT_STATUS.ACTIVE) !== ACCOUNT_STATUS.ACTIVE) {
    await deleteTokenValue({
      namespace: TOKEN_NAMESPACE.refresh,
      key: payload.sub
    });
    throw new AppError("Account is not active", 403);
  }

  const tokens = createAuthTokens(user);
  await setTokenValue({
    namespace: TOKEN_NAMESPACE.refresh,
    key: user._id.toString(),
    value: tokens.refreshToken,
    ttlSeconds: REFRESH_TOKEN_TTL_SECONDS
  });
  setRefreshCookie(res, tokens.refreshToken);

  res.json({ accessToken: tokens.accessToken });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.json({ message: "If account exists, reset mail will be sent." });

  const token = randomBytes(32).toString("hex");
  await setTokenValue({
    namespace: TOKEN_NAMESPACE.passwordReset,
    key: token,
    value: user._id.toString(),
    ttlSeconds: PASSWORD_RESET_TTL_SECONDS
  });

  const resetUrl = `${env.clientUrl}/reset-password?token=${encodeURIComponent(token)}`;
  try {
    await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl });
  } catch (error) {
    await deleteTokenValue({
      namespace: TOKEN_NAMESPACE.passwordReset,
      key: token
    });
    logger.error("Failed to send password reset email", error);
    throw new AppError(
      "Failed to send password reset email. Please check SMTP settings and try again.",
      500
    );
  }

  res.json({
    message: "If account exists, reset mail will be sent."
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const userId = await getTokenValue({
    namespace: TOKEN_NAMESPACE.passwordReset,
    key: token
  });
  if (!userId) throw new AppError("Invalid reset token", 400);

  const user = await User.findById(userId).select("+password");
  user.password = password;
  await user.save();

  await Promise.all([
    deleteTokenValue({
      namespace: TOKEN_NAMESPACE.passwordReset,
      key: token
    }),
    deleteTokenValue({
      namespace: TOKEN_NAMESPACE.refresh,
      key: userId
    })
  ]);
  res.json({ message: "Password reset successful" });
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;
  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      await deleteTokenValue({
        namespace: TOKEN_NAMESPACE.refresh,
        key: payload.sub
      });
    } catch {}
  }
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSecure ? "none" : "lax",
    domain: env.cookieDomain
  });
  clearCsrfCookie(res);
  res.json({ message: "Logged out" });
});
