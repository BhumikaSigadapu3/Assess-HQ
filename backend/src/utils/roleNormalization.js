import { ROLES } from "../constants/roles.js";

const LEGACY_TO_CANONICAL = Object.freeze({
  student: ROLES.CANDIDATE,
  teacher: ROLES.RECRUITER,
  candidate: ROLES.CANDIDATE,
  recruiter: ROLES.RECRUITER,
  admin: ROLES.ADMIN
});

/**
 * Converts legacy persisted roles (e.g. "student") to canonical SaaS roles ("candidate").
 * Unknown values are returned unchanged.
 */
export const toCanonicalRole = (role) => LEGACY_TO_CANONICAL[role] ?? role;

export const isPublicSignupRole = (role) =>
  role === ROLES.CANDIDATE || role === ROLES.RECRUITER;

/** Persists legacy roles (student/teacher) once, then aligns the in-memory user document. */
export async function persistCanonicalUserRole(UserModel, userDoc) {
  const canonical = toCanonicalRole(userDoc.role);
  if (canonical === userDoc.role) return canonical;

  await UserModel.findByIdAndUpdate(userDoc._id, { $set: { role: canonical } });
  Object.assign(userDoc, { role: canonical });
  return canonical;
}
