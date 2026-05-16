/** Canonical RBAC values (aligned with backend `ROLES`). */
export const ROLE = Object.freeze({
  ADMIN: "admin",
  RECRUITER: "recruiter",
  CANDIDATE: "candidate"
});

const LEGACY_ROLE_TO_CANONICAL = Object.freeze({
  student: ROLE.CANDIDATE,
  teacher: ROLE.RECRUITER,
  candidate: ROLE.CANDIDATE,
  recruiter: ROLE.RECRUITER,
  admin: ROLE.ADMIN
});

export const toCanonicalRole = (role) => LEGACY_ROLE_TO_CANONICAL[role] ?? role;

export const ALL_PRODUCT_ROLES = [ROLE.ADMIN, ROLE.RECRUITER, ROLE.CANDIDATE];
