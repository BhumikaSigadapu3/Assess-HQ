import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { toCanonicalRole } from "../constants/roles.js";

export default function ProtectedRoute({ allowRoles, children }) {
  const { user, accessToken } = useSelector((state) => state.auth);

  if (!accessToken) return <Navigate to="/login" replace />;
  const effectiveRole = toCanonicalRole(user?.role);
  if (allowRoles?.length && !allowRoles.includes(effectiveRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children || <Outlet />;
}
