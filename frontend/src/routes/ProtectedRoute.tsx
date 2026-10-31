import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { userHasAnyPermission } from "@/utils/roles";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

/** Gate a route by one or more Spatie-style permission names (OR). */
export function PermissionRoute({
  children,
  permissions,
}: {
  children: ReactNode;
  permissions: string[];
}) {
  const { user } = useAuth();
  const location = useLocation();
  if (!userHasAnyPermission(user, permissions)) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

/** @deprecated Prefer PermissionRoute with explicit permissions. */
export function SuperAdminRoute({ children }: { children: ReactNode }) {
  return (
    <PermissionRoute permissions={["view users", "view roles", "view logs", "view trash items"]}>
      {children}
    </PermissionRoute>
  );
}

export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
