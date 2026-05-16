import mongoose from "mongoose";
import { env } from "../config/env.js";
import { ACCOUNT_STATUS, ROLES } from "../constants/roles.js";
import User from "../models/User.js";

const requiredAdminEnv = ["ADMIN_NAME", "ADMIN_EMAIL", "ADMIN_PASSWORD"];

const getMissingAdminEnv = () => requiredAdminEnv.filter((key) => !process.env[key]?.trim());

const seedAdmin = async () => {
  const missing = getMissingAdminEnv();
  if (missing.length) {
    throw new Error(`Missing admin seed env values: ${missing.join(", ")}`);
  }

  if (process.env.ADMIN_PASSWORD.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters long");
  }

  await mongoose.connect(env.mongodbUri);

  const email = process.env.ADMIN_EMAIL.trim().toLowerCase();
  const existing = await User.findOne({ email }).select("+password");

  if (existing) {
    existing.name = process.env.ADMIN_NAME.trim();
    existing.password = process.env.ADMIN_PASSWORD;
    existing.role = ROLES.ADMIN;
    existing.accountStatus = ACCOUNT_STATUS.ACTIVE;
    existing.isEmailVerified = true;
    existing.emailVerificationToken = null;
    existing.emailVerificationExpiresAt = null;
    await existing.save();
    return { action: "updated", email };
  }

  await User.create({
    name: process.env.ADMIN_NAME.trim(),
    email,
    password: process.env.ADMIN_PASSWORD,
    role: ROLES.ADMIN,
    accountStatus: ACCOUNT_STATUS.ACTIVE,
    isEmailVerified: true,
    emailVerificationToken: null,
    emailVerificationExpiresAt: null
  });

  return { action: "created", email };
};

try {
  const result = await seedAdmin();
  console.log(`Admin ${result.action}: ${result.email}`);
  await mongoose.disconnect();
  process.exit(0);
} catch (error) {
  console.error(`Admin seed failed: ${error.message}`);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
}
