import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import mongoSanitize from "express-mongo-sanitize";
import { env } from "./config/env.js";
import { notFound } from "./middlewares/notFound.middleware.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { csrfProtection } from "./middlewares/csrf.middleware.js";
import apiRouter from "./routes/index.js";

const app = express();

if (env.trustProxy) {
  app.set("trust proxy", 1);
}

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
app.use(
  cors({
    origin: env.corsOrigins.length === 1 ? env.corsOrigins[0] : env.corsOrigins,
    credentials: true
  })
);
app.use(morgan("combined"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(mongoSanitize());
/** Do not apply global xss-clean on JSON bodies: it encodes `<` as `&lt;` and breaks coding submissions (Judge0), prompts, etc. Rely on mongoSanitize, helmet, and output-side escaping where HTML is rendered. */
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: { message: "Too many requests, please try again later." }
  })
);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/health/ready", (_req, res) => {
  if (mongoose.connection.readyState === 1) {
    return res.status(200).json({ ready: true, mongo: "connected" });
  }
  return res.status(503).json({ ready: false, mongo: "disconnected" });
});

app.use("/api/v1", csrfProtection, apiRouter);
app.use(notFound);
app.use(errorHandler);

export default app;
