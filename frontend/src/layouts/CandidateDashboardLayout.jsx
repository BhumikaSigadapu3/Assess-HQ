import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Bell,
  Bot,
  CalendarCheck,
  CalendarClock,
  ChevronRight,
  Code2,
  FileScan,
  Home,
  LogOut,
  Medal,
  Settings,
  UserRound
} from "lucide-react";
import { logoutThunk } from "../features/auth/authSlice.js";
import { CandidateDashboardProvider } from "../features/candidate/CandidateDashboardContext.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";

const navGroups = [
  {
    label: "Workspace",
    items: [
      { label: "Home", to: "/candidate/home", icon: Home },
      { label: "Assessments", to: "/candidate/assessments", icon: CalendarCheck },
      { label: "Interviews", to: "/candidate/interviews", icon: CalendarClock },
      { label: "Leaderboard", to: "/candidate/leaderboard", icon: Medal },
      { label: "Coding Arena", to: "/candidate/workspace/coding", icon: Code2 },
      { label: "Resume Analyzer", to: "/candidate/resume-analyzer", icon: FileScan },
      { label: "Notifications", to: "/candidate/notifications", icon: Bell },
      { label: "Profile", to: "/candidate/profile", icon: UserRound },
      { label: "Settings", to: "/candidate/settings", icon: Settings }
    ]
  }
];

export default function CandidateDashboardLayout() {
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
    <CandidateDashboardProvider>
      <div className="role-theme candidate-theme min-h-screen overflow-hidden bg-[#020617] text-slate-100">
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(79,70,229,0.22),_transparent_32%),radial-gradient(circle_at_82%_18%,_rgba(34,211,238,0.12),_transparent_28%),linear-gradient(135deg,_#020617_0%,_#020617_45%,_#111827_100%)]" />
        <div className="pointer-events-none fixed left-0 top-0 h-full w-24 bg-gradient-to-r from-cyan-400/10 to-transparent" />

        <button
          type="button"
          aria-label={expanded ? "Collapse candidate sidebar" : "Expand candidate sidebar"}
          onClick={() => setExpanded((current) => !current)}
          className="fixed left-3 top-1/2 z-50 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-cyan-700/25 bg-white text-cyan-800 shadow-md shadow-slate-900/15 backdrop-blur-xl transition hover:border-cyan-600 hover:bg-cyan-50 dark:border-cyan-300/20 dark:bg-slate-950/80 dark:text-cyan-100 dark:shadow-[0_0_28px_rgba(34,211,238,0.18)] dark:hover:border-cyan-300/50 dark:hover:bg-cyan-300/10"
        >
          <ChevronRight className={`transition ${expanded ? "rotate-180" : ""}`} size={18} />
        </button>

        <div className="fixed left-0 top-0 z-40 h-full w-8" onMouseEnter={() => setExpanded(true)} />

        <motion.aside
          initial={false}
          animate={{ width: expanded ? 292 : 82 }}
          transition={{ type: "spring", stiffness: 280, damping: 32 }}
          onMouseEnter={() => setExpanded(true)}
          onMouseLeave={() => setExpanded(false)}
          className="candidate-sidebar fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200/90 bg-white/95 px-3 py-4 shadow-xl shadow-slate-900/10 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/75 dark:shadow-2xl dark:shadow-black/50"
        >
          <div className="flex items-center gap-3 px-2">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-cyan-600/25 bg-cyan-50 text-cyan-800 shadow-sm shadow-cyan-900/10 dark:border-cyan-300/30 dark:bg-cyan-300/10 dark:text-cyan-100 dark:shadow-[0_0_26px_rgba(34,211,238,0.18)]">
              <Bot size={22} />
            </div>
            <AnimatePresence>
              {expanded ? (
                <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
                  <p className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">Assess HQ</p>
                  <p className="text-xs text-slate-600 dark:text-slate-500">AI Recruitment OS</p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200/90 bg-slate-50/90 p-2 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 text-sm font-semibold text-white shadow-sm">
                {(user?.name || user?.email || "C").charAt(0).toUpperCase()}
              </div>
              <AnimatePresence>
                {expanded ? (
                  <motion.div className="min-w-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user?.name || "Candidate"}</p>
                    <p className="truncate text-xs text-slate-600 dark:text-slate-500">{user?.email}</p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>

          <nav className="scrollbar-none mt-5 flex-1 space-y-5 overflow-y-auto overflow-x-hidden pr-1">
            {navGroups.map((group) => (
              <div key={group.label}>
                {expanded ? (
                  <p className="mb-2 px-3 text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-600">{group.label}</p>
                ) : null}
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <CandidateNavItem key={item.to} item={item} expanded={expanded} />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="space-y-2 border-t border-slate-200/90 pt-3 dark:border-white/10">
            <button
              type="button"
              onClick={() => setLogoutOpen(true)}
              className="group flex w-full items-center gap-3 rounded-2xl border border-rose-700/30 bg-rose-600 px-3 py-3 text-sm font-semibold text-white shadow-md shadow-rose-900/20 transition hover:border-rose-800 hover:bg-rose-700 hover:shadow-lg dark:border-rose-400/25 dark:bg-gradient-to-r dark:from-rose-600/40 dark:to-red-600/30 dark:text-rose-50 dark:shadow-[0_0_24px_rgba(244,63,94,0.12)] dark:hover:border-rose-300/50 dark:hover:from-rose-500/50 dark:hover:to-red-500/35 dark:hover:shadow-[0_0_30px_rgba(244,63,94,0.2)]"
            >
              <LogOut className="shrink-0 text-white transition group-hover:-translate-x-0.5 dark:text-rose-50" size={18} />
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
          animate={{ marginLeft: expanded ? 292 : 82 }}
          transition={{ type: "spring", stiffness: 280, damping: 32 }}
          className="relative min-h-screen"
        >
          <header className="sticky top-0 z-30 flex items-center justify-end gap-3 border-b border-slate-200/90 bg-white/90 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70">
            <ThemeToggle compact />
          </header>
          <div className="px-4 py-5 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-[1500px]">
              <Outlet />
            </div>
          </div>
        </motion.main>
      </div>

      <AnimatePresence>
        {logoutOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal
            aria-labelledby="cand-logout-title"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 text-slate-100 shadow-2xl"
            >
              <h2 id="cand-logout-title" className="text-lg font-semibold">
                Sign out?
              </h2>
              <p className="mt-2 text-sm text-slate-400">You will need to sign in again to access your candidate workspace.</p>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
                  onClick={() => setLogoutOpen(false)}
                >
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
    </CandidateDashboardProvider>
  );
}

function CandidateNavItem({ item, expanded }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        [
          "group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition",
          isActive
            ? "bg-cyan-100 text-cyan-950 ring-1 ring-cyan-600/25 shadow-sm dark:bg-cyan-300/10 dark:text-cyan-100 dark:ring-cyan-300/35 dark:shadow-[0_0_24px_rgba(34,211,238,0.12)]"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-white"
        ].join(" ")
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={[
              "grid h-9 w-9 shrink-0 place-items-center rounded-xl border transition",
              isActive
                ? "border-cyan-600/40 bg-cyan-50 text-cyan-900 shadow-sm dark:border-cyan-300/40 dark:bg-cyan-300/10 dark:text-cyan-100 dark:shadow-[0_0_18px_rgba(34,211,238,0.18)]"
                : "border-slate-200/90 bg-slate-50 text-slate-600 group-hover:border-cyan-600/20 group-hover:bg-cyan-50/60 group-hover:text-cyan-900 dark:border-white/5 dark:bg-white/[0.03] dark:text-slate-400 dark:group-hover:border-white/15 dark:group-hover:bg-white/[0.08] dark:group-hover:text-white"
            ].join(" ")}
          >
            <Icon size={18} />
          </span>
          <AnimatePresence>
            {expanded ? (
              <motion.span
                className="truncate text-inherit"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
              >
                {item.label}
              </motion.span>
            ) : null}
          </AnimatePresence>
          {isActive ? (
            <span className="absolute right-2 h-1.5 w-1.5 rounded-full bg-cyan-600 shadow-sm shadow-cyan-600/50 dark:bg-cyan-300 dark:shadow-[0_0_16px_rgba(103,232,249,0.8)]" />
          ) : null}
        </>
      )}
    </NavLink>
  );
}
