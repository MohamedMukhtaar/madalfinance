export const ROLES = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
} as const;

export type AppRole = (typeof ROLES)[keyof typeof ROLES];

export function isSuperAdmin(role?: string | null): boolean {
  return role === ROLES.SUPER_ADMIN;
}

/** @deprecated Prefer usePermission().hasPermission('view trash items') */
export function canAccessTrash(role?: string | null, permissions?: string[] | null): boolean {
  if (isSuperAdmin(role)) return true;
  return (permissions ?? []).some((p) => p === "view trash items" || p === "restore trash items");
}

/** Can create/edit/delete finance records — prefer module permissions. */
export function canManage(role?: string | null, permissions?: string[] | null): boolean {
  if (role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN) return true;
  const perms = permissions ?? [];
  return perms.some((p) => p.startsWith("create ") || p.startsWith("edit ") || p.startsWith("delete "));
}

/** @deprecated Prefer usePermission().hasAnyPermission(['view users', ...]) */
export function canManageUsers(role?: string | null, permissions?: string[] | null): boolean {
  if (isSuperAdmin(role)) return true;
  return (permissions ?? []).some((p) =>
    ["view users", "create users", "edit users", "delete users"].includes(p)
  );
}

export function userHasPermission(
  user: { role?: string | null; permissions?: string[] | null } | null | undefined,
  permission: string
): boolean {
  if (!user) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;
  return (user.permissions ?? []).includes(permission);
}

export function userHasAnyPermission(
  user: { role?: string | null; permissions?: string[] | null } | null | undefined,
  permissions: string[]
): boolean {
  if (!user) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;
  if (!permissions.length) return true;
  const owned = new Set(user.permissions ?? []);
  return permissions.some((p) => owned.has(p));
}
