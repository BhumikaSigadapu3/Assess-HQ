import dotenv from "dotenv";

dotenv.config();

const parseOrigins = (value, fallback) => {
  const raw = value || fallback;
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5000,
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  apiBaseUrl: process.env.API_BASE_URL || "http://localhost:5000/api/v1",
  trustProxy: process.env.TRUST_PROXY === "true",
  mongodbUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ai_exam_platform",
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || "dev-access-secret-change-me",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-me",
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
  redisUrl: process.env.REDIS_URL || "",
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT) || 587,
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpSecure: process.env.SMTP_SECURE === "true",
  fromEmail: process.env.FROM_EMAIL || "",
  judge0BaseUrl: process.env.JUDGE0_BASE_URL || "https://ce.judge0.com",
  judge0ApiKey: process.env.JUDGE0_API_KEY || "",
  cookieSecure: process.env.COOKIE_SECURE === "true",
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
  corsOrigins: parseOrigins(process.env.CLIENT_URL, "http://localhost:5173")
};
