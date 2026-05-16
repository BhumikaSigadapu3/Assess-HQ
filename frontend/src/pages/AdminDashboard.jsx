import { useEffect, useState } from "react";
import apiClient from "../services/apiClient.js";

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [pendingRecruiters, setPendingRecruiters] = useState([]);
  const [placements, setPlacements] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);

  const loadAdminData = async () => {
    setError(null);
    try {
      const [dashboardResponse, recruitersResponse, placementsResponse] = await Promise.all([
        apiClient.get("/admin/dashboard"),
        apiClient.get("/admin/recruiters?status=pending_approval"),
        apiClient.get("/admin/hiring/placements").catch(() => ({ data: { placements: [] } }))
      ]);
      setDashboard(dashboardResponse.data);
      setPendingRecruiters(recruitersResponse.data.recruiters || []);
      setPlacements(placementsResponse.data?.placements || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to load admin data");
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const reviewRecruiter = async (recruiterId, action) => {
    setFeedback(null);
    setError(null);
    try {
      const { data } = await apiClient.post(`/admin/recruiters/${recruiterId}/${action}`, {
        reason: action === "approve" ? "Approved by platform admin" : "Rejected by platform admin"
      });
      setFeedback(data.message);
      await loadAdminData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || `Failed to ${action} recruiter`);
    }
  };

  const sendHiringNudge = async (recruiterId) => {
    setFeedback(null);
    setError(null);
    try {
      const { data } = await apiClient.post(`/admin/recruiters/${recruiterId}/hiring-nudge`, {
        message:
          "Please confirm you have contacted the shortlisted candidate and shared formal next steps / offer details."
      });
      setFeedback(data.message);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to send reminder");
    }
  };

  const suspendRecruiter = async (recruiterId) => {
    if (!window.confirm("Suspend this recruiter account? They will not be able to sign in until reinstated.")) return;
    setFeedback(null);
    setError(null);
    try {
      const { data } = await apiClient.post(`/admin/recruiters/${recruiterId}/suspend`, {
        reason: "Suspended by platform admin — hiring follow-up policy"
      });
      setFeedback(data.message);
      await loadAdminData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to suspend recruiter");
    }
  };

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Platform administration</h1>
      <p className="mt-2 max-w-3xl text-slate-500 dark:text-slate-400">
        Enterprise control plane for recruiter onboarding, moderation, abuse & security signals, AI usage metering, and
        cross-tenant observability across assessments and interviews.
      </p>

      {error ? <p className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">{error}</p> : null}
      {feedback ? (
        <p className="rounded border border-emerald-300 bg-emerald-50 p-2 text-sm text-emerald-700">{feedback}</p>
      ) : null}

      {dashboard?.stats ? (
        <div className="grid gap-3 md:grid-cols-5">
          {Object.entries(dashboard.stats).map(([label, value]) => (
            <article key={label} className="rounded-xl border p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
              <p className="text-2xl font-semibold">{value}</p>
            </article>
          ))}
        </div>
      ) : null}

      <article className="rounded-xl border p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium">Shortlist placements (verify outreach)</h2>
          <button type="button" className="rounded border px-3 py-1 text-sm" onClick={loadAdminData}>
            Refresh
          </button>
        </div>
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
          When recruiters shortlist candidates after assessments, both profiles appear here so you can follow up that formal offers and onboarding steps were communicated.
        </p>
        {placements.length ? (
          <div className="space-y-3">
            {placements.map((row) => (
              <div
                key={String(row._id)}
                className="flex flex-col gap-3 rounded-lg border bg-slate-50 p-3 dark:bg-slate-900 md:flex-row md:items-start md:justify-between"
              >
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-medium">Assessment:</span> {row.examId?.title || "—"}
                  </p>
                  <p>
                    <span className="font-medium">Recruiter:</span> {row.recruiterId?.name} ({row.recruiterId?.email})
                  </p>
                  <p>
                    <span className="font-medium">Candidate:</span> {row.candidateId?.name} ({row.candidateId?.email})
                  </p>
                  <p className="text-xs text-slate-500">Shortlisted at {new Date(row.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded border border-amber-600/50 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
                    onClick={() => sendHiringNudge(row.recruiterId?._id)}
                  >
                    Nudge recruiter
                  </button>
                  <button
                    type="button"
                    className="rounded border border-red-600/50 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-900 dark:bg-red-950/40 dark:text-red-100"
                    onClick={() => suspendRecruiter(row.recruiterId?._id)}
                  >
                    Suspend recruiter
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No shortlist rows yet.</p>
        )}
      </article>

      <article className="rounded-xl border p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium">Recruiter approvals</h2>
          <button type="button" className="rounded border px-3 py-1 text-sm" onClick={loadAdminData}>
            Refresh
          </button>
        </div>
        {pendingRecruiters.length ? (
          <div className="space-y-3">
            {pendingRecruiters.map((recruiter) => (
              <div
                key={recruiter._id}
                className="flex flex-col gap-3 rounded-lg border bg-slate-50 p-3 dark:bg-slate-900 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-medium">{recruiter.name}</p>
                  <p className="text-sm text-slate-500">{recruiter.email}</p>
                  <p className="text-xs text-slate-500">
                    Email verified: {recruiter.isEmailVerified ? "yes" : "no"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white"
                    onClick={() => reviewRecruiter(recruiter._id, "approve")}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="rounded bg-red-600 px-3 py-2 text-sm font-medium text-white"
                    onClick={() => reviewRecruiter(recruiter._id, "reject")}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No recruiters are pending approval.</p>
        )}
      </article>
    </section>
  );
}
