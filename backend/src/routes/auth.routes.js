import { Router } from "express";
import {
  signup,
  login,
  refresh,
  forgotPassword,
  resetPassword,
  verifyEmail,
  logout,
  resendVerificationEmail
} from "../controllers/auth.controller.js";
import { issueCsrfToken } from "../middlewares/csrf.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { authLimiter } from "../middlewares/rateLimiters.js";
import {
  signupValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator
} from "../validators/auth.validators.js";

const router = Router();

router.get("/csrf-token", issueCsrfToken);
router.post("/signup", authLimiter, signupValidator, validate, signup);
router.post("/login", authLimiter, loginValidator, validate, login);
router.post("/refresh", refresh);
router.post("/forgot-password", authLimiter, forgotPasswordValidator, validate, forgotPassword);
router.post("/reset-password", authLimiter, resetPasswordValidator, validate, resetPassword);
router.get("/verify-email/:token", verifyEmail);
router.post("/resend-verification", authLimiter, forgotPasswordValidator, validate, resendVerificationEmail);
router.post("/logout", logout);

export default router;
