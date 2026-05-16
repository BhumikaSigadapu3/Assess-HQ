import { randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";
import { AppError } from "../utils/appError.js";

export const CSRF_COOKIE_NAME = "csrfToken";
export const CSRF_HEADER_NAME = "x-csrf-token";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const csrfCookieOptions = {
  httpOnly: false,
  secure: env.cookieSecure,
  sameSite: env.cookieSecure ? "none" : "lax",
  domain: env.cookieDomain,
  maxAge: 60 * 60 * 1000
};

export const clearCsrfCookie = (res) => {
  res.clearCookie(CSRF_COOKIE_NAME, {
    httpOnly: false,
    secure: env.cookieSecure,
    sameSite: env.cookieSecure ? "none" : "lax",
    domain: env.cookieDomain
  });
};

const tokensMatch = (left, right) => {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
};

export const issueCsrfToken = (_req, res) => {
  const token = randomBytes(32).toString("hex");
  res.cookie(CSRF_COOKIE_NAME, token, csrfCookieOptions);
  res.json({ csrfToken: token });
};

export const csrfProtection = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  if (req.path === "/auth/csrf-token") return next();

  // SPA uses Authorization: Bearer; double-submit CSRF relies on a cookie that may not be sent
  // cross-port (e.g. localhost:5173 → API :5000). JWT + CORS already blocks third-party misuse of Bearer.
  const authHeader = String(req.get("authorization") || "").trim();
  if (/^Bearer\s+/i.test(authHeader)) {
    return next();
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken || !tokensMatch(cookieToken, headerToken)) {
    return next(new AppError("Invalid CSRF token", 403));
  }

  next();
};
