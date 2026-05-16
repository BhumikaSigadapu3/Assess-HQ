import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import apiClient from "../services/apiClient.js";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [status, setStatus] = useState(token ? "loading" : "error");
  const [message, setMessage] = useState(
    token ? "Verifying your email..." : "Verification token is missing. Open the link from your inbox."
  );

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    (async () => {
      try {
        const { data } = await apiClient.get(`/auth/verify-email/${encodeURIComponent(token)}`);
        if (cancelled) return;
        setStatus("success");
        setMessage(data?.message || "Email verified successfully.");
      } catch (error) {
        if (cancelled) return;
        setStatus("error");
        setMessage(error.response?.data?.message || "Verification failed. The link may be invalid or expired.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const tone =
    status === "success"
      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
      : status === "loading"
        ? "border-slate-300 bg-slate-50 text-slate-700"
        : "border-red-300 bg-red-50 text-red-700";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-screen items-center justify-center p-4"
    >
      <motion.div className="w-full max-w-md rounded-2xl bg-white p-6 shadow dark:bg-slate-800">
        <h1 className="mb-2 text-2xl font-semibold">Email verification</h1>
        <p className={`rounded border px-3 py-2 text-sm ${tone}`}>{message}</p>
        {status !== "loading" ? (
          <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-300">
            <Link className="font-medium text-brand-600 hover:underline" to="/login">
              Continue to sign in
            </Link>
          </p>
        ) : null}
      </motion.div>
    </motion.div>
  );
}
