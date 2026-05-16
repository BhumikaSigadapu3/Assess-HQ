import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { clearAuthFeedback, loginThunk, resendVerificationThunk } from "../features/auth/authSlice.js";
import { toCanonicalRole } from "../constants/roles.js";

const initialForm = {
  email: "",
  password: ""
};

export default function LoginPage() {
  const dispatch = useDispatch();
  const { user, loading, error, signupSuccess } = useSelector((state) => state.auth);
  const [form, setForm] = useState(initialForm);

  if (user?.role) return <Navigate to={`/${toCanonicalRole(user.role)}`} replace />;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow dark:bg-slate-800"
        onSubmit={(e) => {
          e.preventDefault();
          dispatch(clearAuthFeedback());
          dispatch(loginThunk(form));
        }}
      >
        <h1 className="mb-2 text-2xl font-semibold">Sign in</h1>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
          Access your candidate workspace, recruiter hiring tools, or admin console.
        </p>
        {error ? (
          <p className="mb-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}
        {signupSuccess ? (
          <p className="mb-3 rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {signupSuccess}
          </p>
        ) : null}
        <input
          className="mb-3 w-full rounded border p-2 dark:bg-slate-900"
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) => {
            dispatch(clearAuthFeedback());
            setForm({ ...form, email: e.target.value });
          }}
          required
        />
        <input
          className="mb-2 w-full rounded border p-2 dark:bg-slate-900"
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={(e) => {
            dispatch(clearAuthFeedback());
            setForm({ ...form, password: e.target.value });
          }}
          required
        />
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm">
          <Link className="font-medium text-brand-600 hover:underline" to="/forgot-password">
            Forgot password?
          </Link>
          <button
            type="button"
            disabled={loading || !form.email}
            className="font-medium text-brand-600 hover:underline disabled:opacity-50"
            onClick={() => {
              dispatch(clearAuthFeedback());
              dispatch(resendVerificationThunk({ email: form.email }));
            }}
          >
            Resend verification
          </button>
        </div>
        <button
          disabled={loading}
          className="w-full rounded bg-brand-600 px-4 py-2 font-medium text-white"
          type="submit"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
        <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-300">
          New here?{" "}
          <Link className="font-medium text-brand-600 hover:underline" to="/signup">
            Create an account
          </Link>
        </p>
      </motion.form>
    </div>
  );
}
