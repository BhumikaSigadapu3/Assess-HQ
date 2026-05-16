import crypto from "node:crypto";
import { signAccessToken, signRefreshToken } from "../utils/jwt.js";

export const createAuthTokens = (user) => {
  const payload = { sub: user._id.toString(), role: user.role };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload)
  };
};

export const generateRandomToken = () => crypto.randomBytes(32).toString("hex");
