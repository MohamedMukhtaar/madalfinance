export const ROLES = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
} as const;

export type AppRole = (typeof ROLES)[keyof typeof ROLES];

export function isSuperAdmin(role?: string | null): boolean {
  return role === ROLES.SUPER_ADMIN;
}

export function canAccessTrash(role?: string | null): boolean {
  return isSuperAdmin(role);
}

export function canManage(role?: string | null): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;
}

export function canManageUsers(role?: string | null): boolean {
  return isSuperAdmin(role);
}
