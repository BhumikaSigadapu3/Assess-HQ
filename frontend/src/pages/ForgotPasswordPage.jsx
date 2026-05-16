import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { clearAuthFeedback, forgotPasswordThunk } from "../features/auth/authSlice.js";

export default function ForgotPasswordPage() {
  const dispatch = useDispatch();
  const { loading, error, signupSuccess } = useSelector((state) => state.auth);
  const [email, setEmail] = useState("");

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow dark:bg-slate-800"
        onSubmit={(e) => {
          e.preventDefault();
          dispatch(clearAuthFeedback());
          dispatch(forgotPasswordThunk({ email }));
        }}
      >
        <h1 className="mb-2 text-2xl font-semibold">Forgot password</h1>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
          Enter your account email. If it exists, we will send a reset link.
        </p>
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
          className="mb-4 w-full rounded border p-2 dark:bg-slate-900"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => {
            dispatch(clearAuthFeedback());
            setEmail(e.target.value);
          }}
          required
        />
        <button
          disabled={loading}
          className="w-full rounded bg-brand-600 px-4 py-2 font-medium text-white"
          type="submit"
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>
        <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-300">
          Remembered it?{" "}
          <Link className="font-medium text-brand-600 hover:underline" to="/login">
            Sign in
          </Link>
        </p>
      </motion.form>
    </div>
  );
}
