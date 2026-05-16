import { Outlet } from "react-router-dom";

/**
 * Full-screen shell for in-progress exams (no dashboard sidebar).
 * Proctoring (webcam, tab lock) can plug in here later.
 */
export default function ExamKioskLayout() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased">
      <Outlet />
    </div>
  );
}
