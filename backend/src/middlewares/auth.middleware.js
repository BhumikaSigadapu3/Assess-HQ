import User from "../models/User.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { AppError } from "../utils/appError.js";
import { toCanonicalRole } from "../utils/roleNormalization.js";
import { ACCOUNT_STATUS } from "../constants/roles.js";

export const protect = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) throw new AppError("Unauthorized", 401);

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).select("-password -refreshToken");
    if (!user) throw new AppError("User no longer exists", 401);
    if ((user.accountStatus ?? ACCOUNT_STATUS.ACTIVE) !== ACCOUNT_STATUS.ACTIVE) {
      throw new AppError("Account is not active", 403);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    next(new AppError("Invalid or expired token", 401));
  }
};

export const authorize = (...roles) => (req, _res, next) => {
  const effectiveRole = toCanonicalRole(req.user.role);
  if (!roles.includes(effectiveRole)) {
    return next(new AppError("Forbidden: insufficient permissions", 403));
  }
  next();
};
