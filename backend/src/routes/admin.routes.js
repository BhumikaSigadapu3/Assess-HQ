import { Router } from "express";
import { body, param, query } from "express-validator";
import {
  approveRecruiter,
  getAdminDashboard,
  listHiringPlacements,
  listRecruiterApprovals,
  postRecruiterHiringNudge,
  rejectRecruiter,
  suspendRecruiterAccount
} from "../controllers/admin.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import { ROLES } from "../constants/roles.js";
import { validate } from "../middlewares/validate.middleware.js";

const router = Router();

router.use(protect, authorize(ROLES.ADMIN));

router.get("/dashboard", getAdminDashboard);
router.get("/hiring/placements", listHiringPlacements);
router.get(
  "/recruiters",
  [query("status").optional().isString().trim()],
  validate,
  listRecruiterApprovals
);
router.post(
  "/recruiters/:userId/approve",
  [param("userId").isMongoId(), body("reason").optional().isString().trim().isLength({ max: 500 })],
  validate,
  approveRecruiter
);
router.post(
  "/recruiters/:userId/reject",
  [param("userId").isMongoId(), body("reason").optional().isString().trim().isLength({ max: 500 })],
  validate,
  rejectRecruiter
);
router.post(
  "/recruiters/:userId/suspend",
  [param("userId").isMongoId(), body("reason").optional().isString().trim().isLength({ max: 500 })],
  validate,
  suspendRecruiterAccount
);
router.post(
  "/recruiters/:userId/hiring-nudge",
  [param("userId").isMongoId(), body("message").optional().isString().trim().isLength({ max: 800 })],
  validate,
  postRecruiterHiringNudge
);

export default router;
