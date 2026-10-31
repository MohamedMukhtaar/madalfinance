import { useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { ROLES } from "@/utils/roles";

/**
 * StarterKit-style permission helpers against the signed-in user's permission list.
 * Super Admin always passes.
 */
export function usePermission() {
  const { user } = useAuth();

  const owned = useMemo(() => {
    if (!user) return new Set<string>();
    if (user.role === ROLES.SUPER_ADMIN) return null; // null = all
    return new Set(user.permissions ?? []);
  }, [user]);

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!user) return false;
      if (owned === null) return true;
      return owned.has(permission);
    },
    [user, owned]
  );

  const hasAnyPermission = useCallback(
    (permissions: string[]): boolean => {
      if (!user) return false;
      if (owned === null) return true;
      if (!permissions.length) return true;
      return permissions.some((p) => owned.has(p));
    },
    [user, owned]
  );

  const hasAllPermissions = useCallback(
    (permissions: string[]): boolean => {
      if (!user) return false;
      if (owned === null) return true;
      return permissions.every((p) => owned.has(p));
    },
    [user, owned]
  );

  return { hasPermission, hasAnyPermission, hasAllPermissions, user };
}
