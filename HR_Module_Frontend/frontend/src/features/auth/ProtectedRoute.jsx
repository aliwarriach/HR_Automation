import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { ROUTES } from "../../constants/routes";
import { hasPermission, isBlockedForSuperAdmin } from "../../utils/permissions";

export default function ProtectedRoute({ children, permission, blockSuperAdmin = false }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrated = useAuthStore((s) => s.hydrated);
  const role = useAuthStore((s) => s.role);
  const isTestProbe = useAuthStore((s) => s.isTestProbe);
  const permissions = useAuthStore((s) => s.permissions);

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  if (!hydrated) {
    return null;
  }

  if (blockSuperAdmin && isBlockedForSuperAdmin(role, isTestProbe)) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  if (permission && !hasPermission(permissions, permission.module, permission.action)) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return children;
}
