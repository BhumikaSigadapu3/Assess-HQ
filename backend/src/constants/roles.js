export const ROLES = Object.freeze({
  ADMIN: "admin",
  RECRUITER: "recruiter",
  CANDIDATE: "candidate"
});

export const ACCOUNT_STATUS = Object.freeze({
  ACTIVE: "active",
  PENDING_APPROVAL: "pending_approval",
  REJECTED: "rejected",
  SUSPENDED: "suspended"
});

/** Roles that may be assigned via self-service signup API */
export const PUBLIC_SIGNUP_ROLES = Object.freeze([ROLES.CANDIDATE, ROLES.RECRUITER]);
