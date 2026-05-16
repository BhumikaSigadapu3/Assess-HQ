import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { clearAuthFeedback, resetPasswordThunk } from "../features/auth/authSlice.js";

export default function ResetPasswordPage() {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const { loading, error, signupSuccess } = useSelector((state) => state.auth);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const token = searchParams.get("token") || "";

  const canSubmit = token && password.length >= 8 && password === confirmPassword;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow dark:bg-slate-800"
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSubmit) return;
          dispatch(clearAuthFeedback());
          dispatch(resetPasswordThunk({ token, password }));
        }}
      >
        <h1 className="mb-2 text-2xl font-semibold">Reset password</h1>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
          Choose a new password with at least 8 characters.
        </p>
        {!token ? (
          <p className="mb-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            Reset token is missing. Open the link from your email.
          </p>
        ) : null}
        {error ? (
          <p className="mb-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {signupSuccess ? (
          <p className="mb-3 rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {signupSuccess}
          </p>
        ) : null}
        <input
          className="mb-3 w-full rounded border p-2 dark:bg-slate-900"
          placeholder="New password"
          type="password"
          value={password}
          onChange={(e) => {
            dispatch(clearAuthFeedback());
            setPassword(e.target.value);
          }}
          minLength={8}
          required
        />
        <input
          className="mb-2 w-full rounded border p-2 dark:bg-slate-900"
          placeholder="Confirm new password"
          type="password"
          value={confirmPassword}
          onChange={(e) => {
            dispatch(clearAuthFeedback());
            setConfirmPassword(e.target.value);
          }}
          minLength={8}
          required
        />
        {confirmPassword && password !== confirmPassword ? (
          <p className="mb-3 text-sm text-red-600">Passwords do not match.</p>
        ) : null}
        <button
          disabled={loading || !canSubmit}
          className="w-full rounded bg-brand-600 px-4 py-2 font-medium text-white disabled:opacity-60"
          type="submit"
        >
          {loading ? "Resetting..." : "Reset password"}
        </button>
        <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-300">
          Back to{" "}
          <Link className="font-medium text-brand-600 hover:underline" to="/login">
            sign in
          </Link>
        </p>
      </motion.form>
    </div>
  );
}
