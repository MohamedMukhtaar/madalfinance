import { authApi as http, api, type ApiEnvelope } from "../api";
import type { User, AuditLog, Member } from "@/types";
import { unwrap, asPaged, toQuery, toSnakeCase, withUserAvatar, withMemberAvatar, uploadFile, type ListParams, type Paged, type UserDevice } from "./helpers";

export const usersApi = {
  /* ------------------------------ USERS / MEMBERS ------------------------------ */
  async users(params?: ListParams): Promise<Paged<User>> {
    const res = await http.get<User[]>("/users", toQuery(params));
    const paged = asPaged(res);
    return { ...paged, rows: paged.rows.map(withUserAvatar) };
  },

  async roles(): Promise<import("@/types").AppRoleRecord[]> {
    const res = await http.get<import("@/types").AppRoleRecord[]>("/users/roles");
    return unwrap(res);
  },

  async permissionCatalog(): Promise<import("@/types").PermissionCatalog> {
    const res = await http.get<import("@/types").PermissionCatalog>("/users/roles/permissions");
    return unwrap(res);
  },

  async createRole(data: {
    roleName: string;
    description?: string | null;
    permissions?: string[];
  }): Promise<import("@/types").AppRoleRecord> {
    const res = await http.post<import("@/types").AppRoleRecord>("/users/roles", toSnakeCase(data));
    return unwrap(res);
  },

  async updateRole(
    id: number,
    data: { roleName?: string; description?: string | null; permissions?: string[] }
  ): Promise<import("@/types").AppRoleRecord> {
    const res = await http.put<import("@/types").AppRoleRecord>(`/users/roles/${id}`, toSnakeCase(data));
    return unwrap(res);
  },

  async assignRolePermissions(id: number, permissions: string[]): Promise<import("@/types").AppRoleRecord> {
    const res = await http.post<import("@/types").AppRoleRecord>(`/users/roles/${id}/permissions`, {
      permissions,
    });
    return unwrap(res);
  },

  async deleteRole(id: number): Promise<void> {
    await http.delete(`/users/roles/${id}`);
  },

  /* ------------------------------ ORGANIZATION ------------------------------ */
  async organization(): Promise<import("@/types").Organization> {
    const res = await http.get<import("@/types").Organization>("/organizations");
    return unwrap(res);
  },

  async updateOrganization(
    data: Partial<import("@/types").Organization>
  ): Promise<import("@/types").Organization> {
    const res = await http.put<import("@/types").Organization>("/organizations", toSnakeCase(data));
    return unwrap(res);
  },

  async updateOrganizationColors(data: {
    primaryColor: string;
    secondaryColor: string;
    sidebarBg: string;
    sidebarText: string;
    sidebarActiveBg: string;
    sidebarActiveText: string;
  }): Promise<import("@/types").Organization> {
    const res = await http.put<import("@/types").Organization>(
      "/organizations/colors",
      toSnakeCase(data)
    );
    return unwrap(res);
  },

  async uploadOrganizationImage(
    kind: "light" | "dark" | "icon" | "signature",
    file: File,
    onProgress?: (p: number) => void
  ): Promise<import("@/types").Organization> {
    return uploadFile<import("@/types").Organization>(
      `/organizations/images/${kind}`,
      file,
      onProgress
    );
  },

  async removeOrganizationImage(
    kind: "light" | "dark" | "icon" | "signature"
  ): Promise<import("@/types").Organization> {
    const res = await http.delete<import("@/types").Organization>(`/organizations/images/${kind}`);
    return unwrap(res);
  },

  async createUser(data: {
    username: string;
    password: string;
    fullName: string;
    role: string;
    phone?: string;
    email?: string;
    status?: "active" | "inactive";
  }): Promise<User> {
    const res = await http.post<User>("/users", toSnakeCase(data));
    return unwrap(res);
  },

  async updateUser(
    id: number,
    data: {
      username?: string;
      password?: string;
      fullName?: string;
      role?: string;
      phone?: string;
      email?: string;
      status?: "active" | "inactive";
    }
  ): Promise<User> {
    const res = await http.put<User>(`/users/${id}`, toSnakeCase(data));
    return withUserAvatar(unwrap(res));
  },

  async userDevices(id: number): Promise<UserDevice[]> {
    const res = await http.get<UserDevice[]>(`/users/${id}/devices`);
    return unwrap(res);
  },

  async removeUserDevice(id: number, deviceId: number): Promise<void> {
    await http.delete(`/users/${id}/devices/${deviceId}`);
  },

  async uploadUserAvatar(id: number, file: File, onProgress?: (p: number) => void): Promise<User> {
    const user = await uploadFile<User>(`/users/${id}/avatar`, file, onProgress);
    return withUserAvatar(user);
  },

  async deleteUser(id: number, reason: string): Promise<void> {
    await http.delete(`/users/${id}`, { data: { reason } });
  },

  async auditLogs(params?: ListParams): Promise<Paged<AuditLog>> {
    const res = await api.get<ApiEnvelope<AuditLog[]>>("/users/audit-logs", {
      params: toQuery(params),
      timeout: 45000,
    });
    return asPaged(res.data);
  },

  async members(): Promise<Member[]> {
    const res = await http.get<Member[]>("/contributions/members");
    return unwrap(res).map(withMemberAvatar);
  },

  async listMembers(params?: ListParams): Promise<Paged<Member>> {
    const res = await http.get<Member[]>("/users/members", toQuery(params));
    const paged = asPaged(res);
    return { ...paged, rows: paged.rows.map(withMemberAvatar) };
  },

  async createMember(data: {
    fullName: string;
    phone?: string;
    email?: string;
    position?: string;
    jobTitleId?: number | null;
    defaultMonthlyDue?: number;
    joinedDate?: string;
  }): Promise<Member> {
    const res = await http.post<Member>("/users/members", toSnakeCase(data));
    return withMemberAvatar(unwrap(res));
  },

  async updateMember(
    id: number,
    patch: Partial<{
      fullName: string;
      phone: string;
      email: string;
      position: string;
      jobTitleId: number | null;
      defaultMonthlyDue: number;
      status: string;
    }>
  ): Promise<Member> {
    const res = await http.put<Member>(`/users/members/${id}`, toSnakeCase(patch));
    return withMemberAvatar(unwrap(res));
  },

  async uploadMemberAvatar(id: number, file: File, onProgress?: (p: number) => void): Promise<Member> {
    const member = await uploadFile<Member>(`/users/members/${id}/avatar`, file, onProgress);
    return withMemberAvatar(member);
  },

  async deactivateMember(id: number, reason: string): Promise<void> {
    await http.delete(`/users/members/${id}`, { reason });
  },

};
