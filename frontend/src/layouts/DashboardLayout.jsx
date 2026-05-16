import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import ThemeToggle from "../components/ThemeToggle.jsx";
import { ROLE, toCanonicalRole } from "../constants/roles.js";
import { logoutThunk } from "../features/auth/authSlice.js";

export default function DashboardLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth?.user);
  const role = toCanonicalRole(user?.role);

  const handleLogout = async () => {
    await dispatch(logoutThunk());
    navigate("/login", { replace: true });
  };

  const navClass = ({ isActive }) =>
    `block rounded-xl px-3 py-2 transition ${
      isActive
        ? "bg-brand-600 text-white shadow-sm shadow-brand-600/30"
        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
    }`;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 p-4 md:grid-cols-[260px_1fr]">
        <aside className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/90">
          <h2 className="mb-1 text-lg font-semibold tracking-tight">Assess HQ</h2>
          <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
            Technical hiring, live coding & AI-assisted evaluation
          </p>
          <div className="mb-4 rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-900">
            <p className="font-medium">{user?.name || "Signed in"}</p>
            <p className="truncate text-slate-500">{user?.email}</p>
            <p className="mt-1 uppercase tracking-wide text-slate-400">{role}</p>
          </div>
          <nav className="space-y-1 text-sm font-medium">
            {role === ROLE.ADMIN ? (
              <NavLink to="/admin" className={navClass}>
                Platform admin
              </NavLink>
            ) : null}
            {(role === ROLE.RECRUITER || role === ROLE.ADMIN) && (
              <NavLink
                to="/recruiter/home"
                className={navClass}
              >
                Recruiter workspace
              </NavLink>
            )}
            {(role === ROLE.CANDIDATE || role === ROLE.ADMIN) && (
              <NavLink
                to="/candidate/home"
                className={navClass}
              >
                Candidate home
              </NavLink>
            )}
            {role === ROLE.CANDIDATE && (
              <>
                <NavLink to="/candidate/workspace/coding" className={navClass}>
                  Coding workspace
                </NavLink>
                <NavLink to="/insights/ai" className={navClass}>
                  AI insights
                </NavLink>
              </>
            )}
            {(role === ROLE.RECRUITER || role === ROLE.ADMIN) && (
              <>
                <NavLink to="/recruiter/coding-arena" className={navClass}>
                  Coding arena
                </NavLink>
                <NavLink to="/insights/ai" className={navClass}>
                  AI insights
                </NavLink>
              </>
            )}
          </nav>
          <ThemeToggle className="mt-4 w-full" />
          <button
            type="button"
            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            onClick={handleLogout}
          >
            Logout
          </button>
        </aside>
        <main className="overflow-hidden rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
