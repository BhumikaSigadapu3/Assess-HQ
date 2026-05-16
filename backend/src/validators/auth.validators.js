import { body } from "express-validator";
import { PUBLIC_SIGNUP_ROLES } from "../constants/roles.js";

export const signupValidator = [
  body("name").trim().isLength({ min: 2 }),
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 8 }),
  body("role").optional().isIn(PUBLIC_SIGNUP_ROLES)
];

export const loginValidator = [
  body("email").isEmail().normalizeEmail(),
  body("password").isString().notEmpty()
];

export const forgotPasswordValidator = [body("email").isEmail().normalizeEmail()];

export const resetPasswordValidator = [
  body("token").isString().notEmpty(),
  body("password").isLength({ min: 8 })
];
