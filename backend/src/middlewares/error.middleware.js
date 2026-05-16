import { env } from "../config/env.js";

export const errorHandler = (err, _req, res, _next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    message: err.message || "Internal server error",
    details: err.details || null,
    stack: env.nodeEnv === "development" ? err.stack : undefined
  });
};
