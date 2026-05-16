import { Router } from "express";
import authRoutes from "./auth.routes.js";
import adminRoutes from "./admin.routes.js";
import teacherRoutes from "./teacher.routes.js";
import studentRoutes from "./student.routes.js";
import codingRoutes from "./coding.routes.js";
import aiRoutes from "./ai.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/recruiter", teacherRoutes);
router.use("/candidate", studentRoutes);
router.use("/coding", codingRoutes);
router.use("/ai", aiRoutes);

export default router;
