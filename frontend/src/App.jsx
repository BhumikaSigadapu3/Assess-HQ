import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import CandidateDashboardLayout from "./layouts/CandidateDashboardLayout.jsx";
import ExamKioskLayout from "./layouts/ExamKioskLayout.jsx";
import DashboardLayout from "./layouts/DashboardLayout.jsx";
import RecruiterLayout from "./layouts/RecruiterLayout.jsx";
import RecruiterHomePage from "./pages/recruiter/RecruiterHomePage.jsx";
import {
  RecruiterAssessmentCreatePage,
  RecruiterAssessmentEditPage,
  RecruiterAssessmentResultsPage,
  RecruiterAssessmentsPage,
  RecruiterInterviewRoundsPage,
  RecruiterLeaderboardHubPage,
  RecruiterNotificationsPage,
  RecruiterProfilePage,
  RecruiterSettingsPage
} from "./pages/recruiter/RecruiterWorkspacePages.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import VerifyEmailPage from "./pages/VerifyEmailPage.jsx";
import Unauthorized from "./pages/Unauthorized.jsx";
import {
  CandidateAiInsightsPage,
  CandidateAnalyticsPage,
  CandidateAssessmentsPage,
  CandidateBookmarksPage,
  CandidateCodingArenaPage,
  CandidateContestsPage,
  CandidateHomePage,
  CandidateInterviewsPage,
  CandidateLeaderboardPage,
  CandidateNotificationsPage,
  CandidateOverviewPage,
  CandidatePracticePage,
  CandidateProfilePage,
  CandidateResumeAnalyzerPage,
  CandidateSettingsPage
} from "./pages/candidate/CandidateDashboardPages.jsx";
import { ROLE, toCanonicalRole } from "./constants/roles.js";

const AdminDashboard = lazy(() => import("./pages/AdminDashboard.jsx"));
const ExamRunnerPage = lazy(() => import("./pages/ExamRunnerPage.jsx"));
const CodingWorkspacePage = lazy(() => import("./pages/CodingWorkspacePage.jsx"));
const AIInsightsPage = lazy(() => import("./pages/AIInsightsPage.jsx"));

const PageFallback = () => (
  <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">Loading module…</div>
);

function LegacyCandidateExamRedirect() {
  const { examId } = useParams();
  return <Navigate to={`/candidate/exams/${examId}`} replace />;
}

/** Old shared URL: send candidates to candidate-shell coding, others to recruiter arena. */
function WorkspaceCodingLegacyRedirect() {
  const user = useSelector((s) => s.auth?.user);
  const role = toCanonicalRole(user?.role);
  if (role === ROLE.CANDIDATE) return <Navigate to="/candidate/workspace/coding" replace />;
  if (role === ROLE.RECRUITER || role === ROLE.ADMIN) return <Navigate to="/recruiter/coding-arena" replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        <Route path="/student" element={<Navigate to="/candidate" replace />} />
        <Route path="/teacher" element={<Navigate to="/recruiter" replace />} />
        <Route path="/student/exams/:examId" element={<LegacyCandidateExamRedirect />} />

        <Route
          element={
            <ProtectedRoute allowRoles={[ROLE.ADMIN, ROLE.RECRUITER, ROLE.CANDIDATE]} />
          }
        >
          <Route path="/recruiter" element={<ProtectedRoute allowRoles={[ROLE.RECRUITER, ROLE.ADMIN]} />}>
            <Route element={<RecruiterLayout />}>
              <Route index element={<Navigate to="/recruiter/home" replace />} />
              <Route path="home" element={<RecruiterHomePage />} />
              <Route path="assessments" element={<RecruiterAssessmentsPage />} />
              <Route path="assessments/new" element={<RecruiterAssessmentCreatePage />} />
              <Route path="assessments/:examId/edit" element={<RecruiterAssessmentEditPage />} />
              <Route path="assessments/:examId/results" element={<RecruiterAssessmentResultsPage />} />
              <Route path="leaderboard" element={<RecruiterLeaderboardHubPage />} />
              <Route path="coding-arena" element={<CodingWorkspacePage />} />
              <Route path="resume-analyzer" element={<CandidateResumeAnalyzerPage />} />
              <Route path="interviews" element={<RecruiterInterviewRoundsPage />} />
              <Route path="notifications" element={<RecruiterNotificationsPage />} />
              <Route path="profile" element={<RecruiterProfilePage />} />
              <Route path="settings" element={<RecruiterSettingsPage />} />
            </Route>
          </Route>
          <Route
            element={
              <ProtectedRoute allowRoles={[ROLE.CANDIDATE, ROLE.ADMIN]}>
                <ExamKioskLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/candidate/exams/:examId" element={<ExamRunnerPage />} />
            <Route path="/candidate/exam/coding" element={<CodingWorkspacePage />} />
          </Route>
          <Route
            path="/workspace/coding"
            element={
              <ProtectedRoute allowRoles={[ROLE.CANDIDATE, ROLE.RECRUITER, ROLE.ADMIN]}>
                <WorkspaceCodingLegacyRedirect />
              </ProtectedRoute>
            }
          />
          <Route element={<DashboardLayout />}>
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowRoles={[ROLE.ADMIN]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/insights/ai"
              element={
                <ProtectedRoute allowRoles={[ROLE.CANDIDATE, ROLE.RECRUITER, ROLE.ADMIN]}>
                  <AIInsightsPage />
                </ProtectedRoute>
              }
            />
          </Route>
          <Route
            element={
              <ProtectedRoute allowRoles={[ROLE.CANDIDATE, ROLE.ADMIN]}>
                <CandidateDashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/candidate" element={<Navigate to="/candidate/home" replace />} />
            <Route path="/candidate/home" element={<CandidateHomePage />} />
            <Route path="/candidate/overview" element={<CandidateOverviewPage />} />
            <Route path="/candidate/assessments" element={<CandidateAssessmentsPage />} />
            <Route path="/candidate/coding-arena" element={<CandidateCodingArenaPage />} />
            <Route path="/candidate/contests" element={<CandidateContestsPage />} />
            <Route path="/candidate/interviews" element={<CandidateInterviewsPage />} />
            <Route path="/candidate/leaderboard" element={<CandidateLeaderboardPage />} />
            <Route path="/candidate/ai-insights" element={<CandidateAiInsightsPage />} />
            <Route path="/candidate/resume-analyzer" element={<CandidateResumeAnalyzerPage />} />
            <Route path="/candidate/workspace/coding" element={<CodingWorkspacePage />} />
            <Route path="/candidate/analytics" element={<CandidateAnalyticsPage />} />
            <Route path="/candidate/practice" element={<CandidatePracticePage />} />
            <Route path="/candidate/bookmarks" element={<CandidateBookmarksPage />} />
            <Route path="/candidate/notifications" element={<CandidateNotificationsPage />} />
            <Route path="/candidate/profile" element={<CandidateProfilePage />} />
            <Route path="/candidate/settings" element={<CandidateSettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}
