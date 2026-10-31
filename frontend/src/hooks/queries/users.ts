import {
  useMutation,
  useQuery,
  useQueryClient,
  financeService,
  qk,
  toastErr,
  toast,
  getErrorMessage,
  splitQuery,
  patchRentalStatus,
  type QueryOpts,
  type ListParams,
} from "./shared";

/* ------------------------------ USERS (SUPER ADMIN) ------------------------------ */
export function useUsers(params?: QueryOpts) {
  const { enabled, params: query } = splitQuery(params);
  return useQuery({
    queryKey: qk.users(query),
    queryFn: () => financeService.users(query ?? { perPage: 50 }),
    enabled,
  });
}

export function useRoles(enabled = true) {
  return useQuery({
    queryKey: qk.roles,
    queryFn: () => financeService.roles(),
    enabled,
  });
}

export function usePermissionCatalog(enabled = true) {
  return useQuery({
    queryKey: qk.permissionCatalog,
    queryFn: () => financeService.permissionCatalog(),
    enabled,
    staleTime: 60_000,
  });
}

export function useOrganization(enabled = true) {
  return useQuery({
    queryKey: qk.organization,
    queryFn: () => financeService.organization(),
    enabled,
  });
}

export function useUpdateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof financeService.updateOrganization>[0]) =>
      financeService.updateOrganization(data),
    onSuccess: (org) => {
      qc.setQueryData(qk.organization, org);
      qc.invalidateQueries({ queryKey: qk.settings });
      toast.success("Organization saved");
    },
    onError: (err) => toastErr(err, "Failed to save organization"),
  });
}

export function useUpdateOrganizationColors() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof financeService.updateOrganizationColors>[0]) =>
      financeService.updateOrganizationColors(data),
    onSuccess: (org) => {
      qc.setQueryData(qk.organization, org);
      toast.success("Brand colors saved");
    },
    onError: (err) => toastErr(err, "Failed to save colors"),
  });
}

export function useUploadOrganizationImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      kind,
      file,
    }: {
      kind: "light" | "dark" | "icon" | "signature";
      file: File;
    }) => financeService.uploadOrganizationImage(kind, file),
    onSuccess: (org) => {
      qc.setQueryData(qk.organization, org);
      qc.invalidateQueries({ queryKey: qk.settings });
      toast.success("Image uploaded");
    },
    onError: (err) => toastErr(err, "Failed to upload image"),
  });
}

export function useRemoveOrganizationImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (kind: "light" | "dark" | "icon" | "signature") =>
      financeService.removeOrganizationImage(kind),
    onSuccess: (org) => {
      qc.setQueryData(qk.organization, org);
      qc.invalidateQueries({ queryKey: qk.settings });
      toast.success("Image removed");
    },
    onError: (err) => toastErr(err, "Failed to remove image"),
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof financeService.createRole>[0]) => financeService.createRole(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.roles });
      toast.success("Role created");
    },
    onError: (err) => toastErr(err, "Failed to create role"),
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof financeService.updateRole>[1] }) =>
      financeService.updateRole(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.roles });
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("Role updated");
    },
    onError: (err) => toastErr(err, "Failed to update role"),
  });
}

export function useAssignRolePermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, permissions }: { id: number; permissions: string[] }) =>
      financeService.assignRolePermissions(id, permissions),
    onSuccess: (role) => {
      qc.setQueryData(qk.roles, (prev: unknown) => {
        if (!Array.isArray(prev)) return prev;
        return prev.map((r: { roleId?: number }) => (r?.roleId === role.roleId ? role : r));
      });
      qc.invalidateQueries({ queryKey: qk.roles });
      toast.success("Permissions saved");
    },
    onError: (err) => toastErr(err, "Failed to save permissions"),
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => financeService.deleteRole(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.roles });
      toast.success("Role deleted");
    },
    onError: (err) => toastErr(err, "Failed to delete role"),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      photo,
      ...data
    }: Parameters<typeof financeService.createUser>[0] & { photo?: File | null }) => {
      const user = await financeService.createUser(data);
      if (photo) {
        return financeService.uploadUserAvatar(user.userId, photo);
      }
      return user;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("User created");
    },
    onError: (err) => toastErr(err, "Failed to create user"),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
      photo,
    }: {
      id: number;
      data: Parameters<typeof financeService.updateUser>[1];
      photo?: File | null;
    }) => {
      const user = await financeService.updateUser(id, data);
      if (photo) {
        return financeService.uploadUserAvatar(id, photo);
      }
      return user;
    },
    onSuccess: (user) => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("User updated");
      return user;
    },
    onError: (err) => toastErr(err, "Failed to update user"),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => financeService.deleteUser(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["trash"] });
      toast.success("User moved to trash");
    },
    onError: (err) => toastErr(err, "Failed to delete user"),
  });
}

export function useAuditLogs(params?: QueryOpts) {
  const { enabled, params: query } = splitQuery(params);
  return useQuery({
    queryKey: qk.auditLogs(query),
    queryFn: () => financeService.auditLogs(query ?? { perPage: 25, sort: "created_at:desc" }),
    enabled,
    staleTime: 30_000,
  });
}

