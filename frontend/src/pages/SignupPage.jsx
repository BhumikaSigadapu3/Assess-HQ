import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { clearAuthFeedback, signupThunk } from "../features/auth/authSlice.js";
import { ROLE, toCanonicalRole } from "../constants/roles.js";

const initialForm = {
  name: "",
  email: "",
  password: "",
  role: ROLE.CANDIDATE
};

export default function SignupPage() {
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
          dispatch(signupThunk(form));
        }}
      >
        <h1 className="mb-4 text-2xl font-semibold">Create account</h1>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
          Join as a candidate taking assessments, or as a recruiter building hiring loops. Platform admin accounts are provisioned internally.
        </p>
        {error ? (
          <p className="mb-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {signupSuccess ? (
          <div className="mb-3 rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            <p>{signupSuccess}</p>
            <p className="mt-2">
              We have sent a verification link to your email. Please verify and then continue to login.
            </p>
          </div>
        ) : null}
        <input
          className="mb-3 w-full rounded border p-2 dark:bg-slate-900"
          placeholder="Full name"
          type="text"
          value={form.name}
          onChange={(e) => {
            dispatch(clearAuthFeedback());
            setForm({ ...form, name: e.target.value });
          }}
          required
        />
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
          className="mb-3 w-full rounded border p-2 dark:bg-slate-900"
          placeholder="Password (min 8 chars)"
          type="password"
          value={form.password}
          onChange={(e) => {
            dispatch(clearAuthFeedback());
            setForm({ ...form, password: e.target.value });
          }}
          minLength={8}
          required
        />
        <select
          className="mb-4 w-full rounded border p-2 dark:bg-slate-900"
          value={form.role}
          onChange={(e) => {
            dispatch(clearAuthFeedback());
            setForm({ ...form, role: e.target.value });
          }}
        >
          <option value={ROLE.CANDIDATE}>Candidate</option>
          <option value={ROLE.RECRUITER}>Recruiter</option>
        </select>
        <button
          disabled={loading}
          className="w-full rounded bg-brand-600 px-4 py-2 font-medium text-white"
          type="submit"
        >
          {loading ? "Creating account..." : "Sign Up"}
        </button>
        <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-300">
          Already have an account?{" "}
          <Link className="font-medium text-brand-600 hover:underline" to="/login">
            Sign in
          </Link>
        </p>
      </motion.form>
    </div>
  );
}
