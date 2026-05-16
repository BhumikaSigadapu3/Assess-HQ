import { Moon, Sun } from "lucide-react";
import { useTheme } from "../features/theme/ThemeContext.jsx";

export default function ThemeToggle({ compact = false, className = "" }) {
  const { isDark, toggleTheme } = useTheme();
  const Icon = isDark ? Sun : Moon;

  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/15 ${className}`}
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
    >
      <Icon size={16} />
      {compact ? null : <span>{isDark ? "Light mode" : "Dark mode"}</span>}
    </button>
  );
}
