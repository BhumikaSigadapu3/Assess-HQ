import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Briefcase,
  CalendarClock,
  ChevronRight,
  Code2,
  FileScan,
  Home,
  LogOut,
  Medal,
  Bell,
  Settings,
  UserRound
} from "lucide-react";
import ThemeToggle from "../components/ThemeToggle.jsx";
import { logoutThunk } from "../features/auth/authSlice.js";

const navGroups = [
  {
    label: "Workspace",
    items: [
      { label: "Home", to: "/recruiter/home", icon: Home },
      { label: "Assessments", to: "/recruiter/assessments", icon: Briefcase },
      { label: "Interviews", to: "/recruiter/interviews", icon: CalendarClock },
      { label: "Leaderboard", to: "/recruiter/leaderboard", icon: Medal },
      { label: "Coding Arena", to: "/recruiter/coding-arena", icon: Code2 },
      { label: "Resume Analyzer", to: "/recruiter/resume-analyzer", icon: FileScan },
      { label: "Notifications", to: "/recruiter/notifications", icon: Bell },
      { label: "Profile", to: "/recruiter/profile", icon: UserRound },
      { label: "Settings", to: "/recruiter/settings", icon: Settings }
    ]
  }
];

export default function RecruiterLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth?.user);
  const [expanded, setExpanded] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const confirmLogout = async () => {
    setLogoutOpen(false);
    await dispatch(logoutThunk());
    navigate("/login", { replace: true });
  };

  return (
    <div
      className="recruiter-theme role-theme min-h-screen overflow-hidden text-[color:var(--recruiter-text)] transition-colors duration-300"
      style={{ background: "var(--recruiter-bg)" }}
    >
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(79,70,229,0.18),_transparent_32%),radial-gradient(circle_at_82%_12%,_rgba(34,211,238,0.08),_transparent_26%)] opacity-60 dark:opacity-100" />
      <div className="pointer-events-none fixed left-0 top-0 h-full w-24 bg-gradient-to-r from-cyan-500/8 to-transparent dark:from-cyan-400/10" />

      <button
        type="button"
        aria-label={expanded ? "Collapse recruiter sidebar" : "Expand recruiter sidebar"}
        onClick={() => setExpanded((c) => !c)}
        className="fixed left-3 top-1/2 z-50 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-cyan-500/25 bg-[color:var(--recruiter-surface)] text-cyan-600 shadow-lg shadow-cyan-500/10 backdrop-blur-xl transition hover:border-cyan-400/50 dark:border-cyan-300/20 dark:text-cyan-100 dark:shadow-cyan-500/20"
      >
        <ChevronRight className={`transition ${expanded ? "rotate-180" : ""}`} size={18} />
      </button>

      <div className="fixed left-0 top-0 z-40 h-full w-8" onMouseEnter={() => setExpanded(true)} aria-hidden />

      <motion.aside
        initial={false}
        animate={{ width: expanded ? 288 : 80 }}
        transition={{ type: "spring", stiffness: 280, damping: 34 }}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className="fixed inset-y-0 left-0 z-40 flex flex-col border-r border-[color:var(--recruiter-border)] bg-[color:var(--recruiter-surface)] px-2.5 py-4 shadow-2xl shadow-black/20 backdrop-blur-2xl dark:bg-slate-950/80 dark:shadow-black/50"
      >
        <div className="flex items-center gap-2 px-2">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-600/30 to-cyan-500/20 text-violet-100 shadow-[0_0_22px_rgba(139,92,246,0.25)]">
            <Briefcase size={20} />
          </div>
          <AnimatePresence>
            {expanded ? (
              <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="min-w-0">
                <p className="text-sm font-semibold tracking-tight">Assess HQ</p>
                <p className="text-xs text-[color:var(--recruiter-muted)]">Recruiter OS</p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="mt-4 rounded-2xl border border-[color:var(--recruiter-border)] bg-white/40 p-2 dark:bg-white/[0.04]">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 text-xs font-bold text-white">
              {(user?.name || user?.email || "R").charAt(0).toUpperCase()}
            </div>
            <AnimatePresence>
              {expanded ? (
                <motion.div className="min-w-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <p className="truncate text-sm font-semibold">{user?.name || "Recruiter"}</p>
                  <p className="truncate text-xs text-[color:var(--recruiter-muted)]">{user?.email}</p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        <nav className="scrollbar-none mt-4 flex-1 space-y-4 overflow-y-auto overflow-x-hidden pr-1">
          {navGroups.map((group) => (
            <div key={group.label}>
              {expanded ? (
                <p className="mb-1.5 px-2 text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-600">{group.label}</p>
              ) : null}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <RecruiterNavItem key={item.to} item={item} expanded={expanded} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-2 border-t border-[color:var(--recruiter-border)] pt-3">
          <ThemeToggle compact={!expanded} className="w-full" />
          <button
            type="button"
            onClick={() => setLogoutOpen(true)}
            className="group flex w-full items-center gap-2 rounded-2xl border border-rose-500/25 bg-gradient-to-r from-rose-600/20 to-red-600/10 px-2.5 py-2.5 text-sm font-semibold text-rose-700 shadow-sm transition hover:border-rose-400/40 hover:from-rose-600/30 dark:text-rose-100"
          >
            <LogOut className="shrink-0 transition group-hover:-translate-x-0.5" size={18} />
            <AnimatePresence>
              {expanded ? (
                <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }}>
                  Logout
                </motion.span>
              ) : null}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>

      <motion.main
        initial={false}
        animate={{ marginLeft: expanded ? 288 : 80 }}
        transition={{ type: "spring", stiffness: 280, damping: 34 }}
        className="relative min-h-screen"
      >
        <header className="sticky top-0 z-30 flex items-center justify-end gap-3 border-b border-[color:var(--recruiter-border)] bg-[color:var(--recruiter-surface)]/80 px-4 py-3 backdrop-blur-xl dark:bg-slate-950/70">
          <ThemeToggle compact />
        </header>
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1500px]">
            <Outlet />
          </div>
        </div>
      </motion.main>

      <AnimatePresence>
        {logoutOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal
            aria-labelledby="logout-title"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 text-slate-100 shadow-2xl"
            >
              <h2 id="logout-title" className="text-lg font-semibold">
                Sign out?
              </h2>
              <p className="mt-2 text-sm text-slate-400">You will need to sign in again to access the recruiter workspace.</p>
              <div className="mt-6 flex justify-end gap-2">
                <button type="button" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5" onClick={() => setLogoutOpen(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-rose-900/30 hover:opacity-95"
                  onClick={confirmLogout}
                >
                  Logout
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function RecruiterNavItem({ item, expanded }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        [
          "group relative flex items-center gap-2.5 rounded-2xl px-2.5 py-2 text-sm font-medium transition",
          isActive
            ? "bg-cyan-500/15 text-cyan-700 shadow-[0_0_20px_rgba(6,182,212,0.12)] dark:bg-cyan-400/10 dark:text-cyan-100"
            : "text-slate-600 hover:bg-black/[0.04] hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-white"
        ].join(" ")
      }
    >
      {({ isActive }) => (
        <>
          {isActive ? (
            <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-gradient-to-b from-cyan-400 to-violet-500 shadow-[0_0_12px_rgba(34,211,238,0.6)]" />
          ) : null}
          <span
            className={[
              "relative grid h-9 w-9 shrink-0 place-items-center rounded-xl border transition",
              isActive
                ? "border-cyan-500/35 bg-cyan-500/10 text-cyan-700 dark:border-cyan-300/35 dark:text-cyan-100"
                : "border-transparent bg-black/[0.03] text-slate-500 group-hover:border-slate-200 dark:bg-white/[0.04] dark:text-slate-400 dark:group-hover:border-white/10"
            ].join(" ")}
          >
            <Icon size={18} />
          </span>
          <AnimatePresence>
            {expanded ? (
              <motion.span className="truncate" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
                {item.label}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </>
      )}
    </NavLink>
  );
}
