import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { Eye, Laptop, Plus, Pencil, Shield, Trash2, Users, RefreshCw } from "lucide-react";
import { DataTable } from "@/components/tables/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Avatar,
  Badge,
  Button,
  Modal,
  ErrorState,
  Tabs,
  FileUpload,
  promptDeleteReason,
  confirmDialog,
  ActionIconButton,
  type UploadedFile,
} from "@/components/ui";
import type { DropdownItem } from "@/components/ui";
import { Input, Select } from "@/components/ui/FormField";
import {
  useCreateRole,
  useCreateUser,
  useDeleteRole,
  useDeleteUser,
  useRoles,
  useUpdateRole,
  useUpdateUser,
  useUsers,
} from "@/hooks/queries";
import { useAuth } from "@/context/AuthContext";
import { financeService } from "@/services/finance";
import { getErrorMessage } from "@/services/api";
import { formatDate, formatTime } from "@/utils/format";
import { emailRules, phoneRules } from "@/utils/validation";
import type { AppRoleRecord, User } from "@/types";

const PROTECTED_ROLES = new Set(["Super Admin", "Admin"]);

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300",
  inactive: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-300",
};

function roleDescription(name: string) {
  if (name === "Super Admin") return "Full access including Trash, Settings, and user management.";
  if (name === "Admin") return "Full app access except Trash and user management.";
  return "Custom role. Users with this role need matching permission rules to access the app.";
}

type TabValue = "users" | "roles";

interface UserForm {
  username: string;
  password: string;
  fullName: string;
  role: string;
  phone: string;
  email: string;
  status: "active" | "inactive";
}

interface RoleForm {
  roleName: string;
}

const userColumnHelper = createColumnHelper<User>();
const roleColumnHelper = createColumnHelper<AppRoleRecord>();

export default function UsersPage() {
  const outlet = useOutletContext<{ embedded?: boolean } | null>();
  const embedded = Boolean(outlet?.embedded);
  const [tab, setTab] = useState<TabValue>("users");
  const { data: usersData } = useUsers();
  const { data: roles = [] } = useRoles();

  const tabs = [
    { label: "Users", value: "users", icon: <Users className="h-4 w-4" />, count: usersData?.rows?.length },
    { label: "Roles", value: "roles", icon: <Shield className="h-4 w-4" />, count: roles.length },
  ];

  // Inside Settings hub, roles live on /settings/roles — only show the users table.
  if (embedded) {
    return (
      <div className="space-y-4">
        <UsersTab roles={roles} embedded />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users & Roles"
        subtitle="Manage login accounts and application roles."
      />

      <Tabs tabs={tabs} active={tab} onChange={(v) => setTab(v as TabValue)} />

      {tab === "users" ? <UsersTab roles={roles} /> : <RolesTab />}
    </div>
  );
}

function UsersTab({ roles, embedded = false }: { roles: AppRoleRecord[]; embedded?: boolean }) {
  const { user: currentUser, setUser } = useAuth();
  const { data, isLoading, error, refetch } = useUsers();
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();

  const users = data?.rows ?? [];
  const [modalOpen, setModalOpen] = useState(false);
  const [editFor, setEditFor] = useState<User | undefined>();
  const [viewFor, setViewFor] = useState<User | undefined>();
  const [photoFiles, setPhotoFiles] = useState<UploadedFile[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserForm>({
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      role: roles[0]?.roleName ?? "Admin",
      phone: "",
      email: "",
      status: "active",
    },
  });

  const openCreate = () => {
    setEditFor(undefined);
    setPhotoFiles([]);
    reset({
      username: "",
      password: "",
      fullName: "",
      role: roles[0]?.roleName ?? "Admin",
      phone: "",
      email: "",
      status: "active",
    });
    setModalOpen(true);
  };

  const openEdit = (user: User) => {
    setEditFor(user);
    setPhotoFiles([]);
    reset({
      username: user.username,
      password: "",
      fullName: user.fullName,
      role: user.role,
      phone: user.phone ?? "",
      email: user.email ?? "",
      status: user.status,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditFor(undefined);
    setPhotoFiles([]);
  };

  const onSubmit = handleSubmit((values) => {
    const photo = photoFiles[0]?.file ?? null;
    const isSelf = editFor?.userId === currentUser?.userId;
    const payload: Record<string, unknown> = {
      fullName: values.fullName.trim(),
      role: values.role,
      phone: values.phone.trim() || undefined,
      email: values.email.trim() || undefined,
      status: values.status,
    };

    if (!isSelf) {
      payload.username = values.username.trim();
      if (values.password) payload.password = values.password;
    }

    if (editFor) {
      updateMutation.mutate(
        { id: editFor.userId, data: payload, photo },
        {
          onSuccess: (updated) => {
            if (updated.userId === currentUser?.userId) {
              setUser(updated);
            }
            closeModal();
          },
        }
      );
      return;
    }

    createMutation.mutate(
      {
        username: values.username.trim(),
        password: values.password,
        fullName: values.fullName.trim(),
        role: values.role,
        phone: values.phone.trim() || undefined,
        email: values.email.trim() || undefined,
        status: values.status,
        photo,
      },
      { onSuccess: closeModal }
    );
  });

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      userColumnHelper.accessor("fullName", {
        header: "User Name",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar name={row.original.fullName} src={row.original.avatarUrl ?? undefined} size="sm" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">{row.original.fullName}</p>
              <p className="truncate text-xs text-ink-muted">@{row.original.username}</p>
            </div>
          </div>
        ),
      }),
      userColumnHelper.accessor("phone", {
        header: "Phone",
        cell: (info) => <span className="text-sm text-ink-soft">{info.getValue() || "—"}</span>,
      }),
      userColumnHelper.accessor("email", {
        header: "Email",
        cell: (info) => <span className="text-sm text-ink-soft">{info.getValue() || "—"}</span>,
      }),
      userColumnHelper.accessor("role", {
        header: "Role",
        cell: (info) => <span className="text-sm font-medium text-ink">{info.getValue()}</span>,
      }),
      userColumnHelper.accessor("status", {
        header: "Status",
        cell: (info) => {
          const status = info.getValue();
          return (
            <Badge className={STATUS_STYLES[status]} dot>
              {status === "active" ? "Active" : "Inactive"}
            </Badge>
          );
        },
      }),
      userColumnHelper.display({
        id: "actions",
        header: "Action",
        enableSorting: false,
        cell: ({ row }) => {
          const user = row.original;
          const isSelf = user.userId === currentUser?.userId;
          return (
            <div className="inline-flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
              <ActionIconButton title="View" aria-label="View" onClick={() => setViewFor(user)}>
                <Eye />
              </ActionIconButton>
              <ActionIconButton title="Edit" aria-label="Edit" onClick={() => openEdit(user)}>
                <Pencil />
              </ActionIconButton>
              {!isSelf && (
                <ActionIconButton
                  title="Delete"
                  aria-label="Delete"
                  danger
                  onClick={async () => {
                    const reason = await promptDeleteReason({
                      title: `Delete ${user.username}?`,
                      text: "This user will be moved to Trash and can be restored later.",
                      confirmText: "Move to trash",
                    });
                    if (reason) deleteMutation.mutate({ id: user.userId, reason });
                  }}
                >
                  <Trash2 />
                </ActionIconButton>
              )}
            </div>
          );
        },
      }),
    ],
    [currentUser?.userId, deleteMutation]
  );

  if (error) return <ErrorState onRetry={refetch} />;

  const editingSelf = editFor?.userId === currentUser?.userId;

  return (
    <>
      {embedded ? (
        <PageHeader
          title="Users"
          subtitle="Manage your users"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                onClick={() => refetch()}
              >
                Refresh
              </Button>
              <Button size="sm" onClick={openCreate} leftIcon={<Plus className="h-4 w-4" />}>
                Add User
              </Button>
            </div>
          }
        />
      ) : (
        <div className="flex justify-end">
          <Button onClick={openCreate} leftIcon={<Plus className="h-4 w-4" />}>
            Add User
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={users}
        loading={isLoading}
        searchPlaceholder="Search"
        showColumnToggle={false}
        renderMobileCard={(row) => (
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Avatar name={row.fullName} src={row.avatarUrl ?? undefined} size="sm" />
              <div>
                <p className="font-semibold text-ink">{row.fullName}</p>
                <p className="text-xs text-ink-muted">{row.phone || row.email || `@${row.username}`}</p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  <span className="text-xs font-medium text-ink">{row.role}</span>
                  <Badge className={STATUS_STYLES[row.status]} dot>
                    {row.status === "active" ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </div>
            <ActionIconButton title="Edit" aria-label="Edit" onClick={() => openEdit(row)}>
              <Pencil />
            </ActionIconButton>
          </div>
        )}
      />

      <Modal
        open={!!viewFor}
        onClose={() => setViewFor(undefined)}
        title={viewFor?.fullName ?? "User"}
        subtitle={viewFor ? `@${viewFor.username}` : undefined}
        size="sm"
        footer={
          <Button variant="secondary" onClick={() => setViewFor(undefined)}>
            Close
          </Button>
        }
      >
        {viewFor && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <Avatar name={viewFor.fullName} src={viewFor.avatarUrl ?? undefined} size="lg" />
              <div>
                <p className="font-semibold text-ink">{viewFor.fullName}</p>
                <Badge className={STATUS_STYLES[viewFor.status]} dot>
                  {viewFor.status === "active" ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
            <p>
              <span className="text-ink-muted">Role:</span> {viewFor.role}
            </p>
            <p>
              <span className="text-ink-muted">Phone:</span> {viewFor.phone || "—"}
            </p>
            <p>
              <span className="text-ink-muted">Email:</span> {viewFor.email || "—"}
            </p>
            <p>
              <span className="text-ink-muted">Last login:</span>{" "}
              {viewFor.lastLogin ? `${formatDate(viewFor.lastLogin)} ${formatTime(viewFor.lastLogin)}` : "Never"}
            </p>
          </div>
        )}
      </Modal>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editFor ? "Edit user" : "Add user"}
        subtitle={editFor ? `Update ${editFor.username}` : "Create a new login account"}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              onClick={() => void onSubmit()}
              loading={createMutation.isPending || updateMutation.isPending}
              leftIcon={<Users className="h-4 w-4" />}
            >
              {editFor ? "Save changes" : "Create user"}
            </Button>
          </>
        }
      >
        <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={(e) => void onSubmit(e)}>
          {editingSelf && (
            <p className="sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              To change your username or password, use the profile menu (top right). You can still update your name,
              role, and contact details here.
            </p>
          )}
          <Input
            label="Username"
            required
            disabled={editingSelf}
            error={errors.username?.message}
            {...register("username", { required: "Username is required", minLength: 3 })}
          />
          <Input
            label={editFor ? "New password (optional)" : "Password"}
            type="password"
            required={!editFor}
            disabled={editingSelf}
            error={errors.password?.message}
            {...register("password", editFor ? {} : { required: "Password is required", minLength: 8 })}
          />
          <Input
            label="Full name"
            required
            className="sm:col-span-2"
            error={errors.fullName?.message}
            {...register("fullName", { required: "Full name is required" })}
          />
          <Select
            label="Role"
            required
            options={roles.map((r) => ({ value: r.roleName, label: r.roleName }))}
            error={errors.role?.message}
            {...register("role", { required: true })}
          />
          <Select
            label="Status"
            options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
            {...register("status")}
          />
          <Input label="Phone" error={errors.phone?.message} {...register("phone", phoneRules())} />
          <Input label="Email" type="email" error={errors.email?.message} {...register("email", emailRules())} />
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-xs font-semibold text-ink-soft">Profile photo</p>
            {editFor?.avatarUrl && photoFiles.length === 0 && (
              <div className="mb-3 flex items-center gap-3">
                <Avatar name={editFor.fullName} src={editFor.avatarUrl} size="lg" />
                <p className="text-xs text-slate-400">Current photo — upload a new one to replace it.</p>
              </div>
            )}
            <FileUpload
              label="Upload user photo (JPG / PNG)"
              accept="image/jpeg,image/png,image/webp"
              hint="JPG, PNG or WebP up to 10MB"
              value={photoFiles}
              onChange={setPhotoFiles}
            />
          </div>
        </form>
        {editFor && <UserDevices userId={editFor.userId} />}
      </Modal>
    </>
  );
}

/** Devices this user has confirmed with the device lock at sign-in; removing one forces re-verification there. */
function UserDevices({ userId }: { userId: number }) {
  const qc = useQueryClient();
  const { data: devices = [], isLoading } = useQuery({
    queryKey: ["users", userId, "devices"],
    queryFn: () => financeService.userDevices(userId),
  });
  const removeMutation = useMutation({
    mutationFn: (deviceId: number) => financeService.removeUserDevice(userId, deviceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users", userId, "devices"] });
      toast.success("Device removed");
    },
    onError: (err) => toast.error(getErrorMessage(err, "Failed to remove device")),
  });

  return (
    <div className="mt-6 border-t border-line pt-4">
      <p className="text-xs font-semibold text-ink-soft">Verified devices</p>
      <p className="mt-0.5 text-xs text-ink-muted">
        Devices confirmed with their PIN, fingerprint or face at sign-in. Remove a lost device — it will need the device lock
        and password again.
      </p>
      <div className="mt-3 space-y-2">
        {isLoading && <p className="text-xs text-ink-muted">Loading…</p>}
        {!isLoading && devices.length === 0 && <p className="text-xs text-ink-muted">No devices verified yet.</p>}
        {devices.map((d) => (
          <div key={d.deviceId} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 ring-1 ring-line">
            <div className="flex min-w-0 items-center gap-2.5">
              <Laptop className="h-4 w-4 shrink-0 text-ink-muted" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{d.deviceName ?? "Device"}</p>
                <p className="text-[11px] text-ink-muted">
                  Added {formatDate(d.createdAt)}
                  {d.lastUsedAt ? ` · last used ${formatDate(d.lastUsedAt)} ${formatTime(d.lastUsedAt)}` : ""}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="secondary"
              loading={removeMutation.isPending && removeMutation.variables === d.deviceId}
              onClick={async () => {
                const ok = await confirmDialog({
                  title: `Remove ${d.deviceName ?? "this device"}?`,
                  text: "Signing in on it will require the device lock and password again.",
                  confirmText: "Remove",
                });
                if (ok) removeMutation.mutate(d.deviceId);
              }}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function RolesTab() {
  const { data: roles = [], isLoading, error, refetch } = useRoles();
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();
  const deleteMutation = useDeleteRole();

  const [modalOpen, setModalOpen] = useState(false);
  const [editFor, setEditFor] = useState<AppRoleRecord | undefined>();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RoleForm>({ defaultValues: { roleName: "" } });

  const openCreate = () => {
    setEditFor(undefined);
    reset({ roleName: "" });
    setModalOpen(true);
  };

  const openEdit = (role: AppRoleRecord) => {
    setEditFor(role);
    reset({ roleName: role.roleName });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditFor(undefined);
  };

  const onSubmit = handleSubmit((values) => {
    const roleName = values.roleName.trim();
    if (editFor) {
      updateMutation.mutate({ id: editFor.roleId, data: { roleName } }, { onSuccess: closeModal });
      return;
    }
    createMutation.mutate({ roleName }, { onSuccess: closeModal });
  });

  const columns = useMemo<ColumnDef<AppRoleRecord>[]>(
    () => [
      roleColumnHelper.accessor("roleName", {
        header: "Role",
        cell: (info) => (
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-brand-500" />
            <span className="font-semibold text-slate-800 dark:text-slate-100">{info.getValue()}</span>
            {PROTECTED_ROLES.has(info.getValue()) && (
              <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-300">Built-in</Badge>
            )}
          </div>
        ),
      }),
      roleColumnHelper.display({
        id: "description",
        header: "Description",
        cell: ({ row }) => (
          <span className="text-sm text-slate-500">{roleDescription(row.original.roleName)}</span>
        ),
      }),
      roleColumnHelper.accessor("userCount", {
        header: "Users",
        cell: (info) => <span className="font-mono text-sm">{info.getValue() ?? 0}</span>,
      }),
      roleColumnHelper.display({ id: "actions", header: "", cell: () => null }),
    ],
    []
  );

  if (error) return <ErrorState onRetry={refetch} />;

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openCreate} leftIcon={<Plus className="h-4 w-4" />}>
          Add role
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={roles}
        loading={isLoading}
        searchPlaceholder="Search roles…"
        renderMobileCard={(row) => (
          <div className="space-y-1">
            <p className="font-semibold text-slate-800 dark:text-slate-100">{row.roleName}</p>
            <p className="text-xs text-slate-500">{roleDescription(row.roleName)}</p>
            <p className="text-xs text-slate-400">{row.userCount ?? 0} users</p>
          </div>
        )}
        actions={(row) => {
          const actions: DropdownItem[] = [
            { label: "Edit", icon: <Pencil className="h-4 w-4" />, onClick: () => openEdit(row) },
          ];
          const isProtected = PROTECTED_ROLES.has(row.roleName);
          const hasUsers = (row.userCount ?? 0) > 0;

          if (!isProtected && !hasUsers) {
            actions.push({ divider: true });
            actions.push({
              label: "Delete",
              icon: <Trash2 className="h-4 w-4" />,
              danger: true,
              onClick: async () => {
                const ok = await confirmDialog({
                  title: `Delete ${row.roleName}?`,
                  text: "This role will be permanently removed.",
                  confirmText: "Delete role",
                });
                if (ok) deleteMutation.mutate(row.roleId);
              },
            });
          }

          return actions;
        }}
      />

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editFor ? "Edit role" : "Add role"}
        subtitle={editFor ? `Update ${editFor.roleName}` : "Create a new application role"}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              onClick={() => void onSubmit()}
              loading={createMutation.isPending || updateMutation.isPending}
              leftIcon={<Shield className="h-4 w-4" />}
            >
              {editFor ? "Save changes" : "Create role"}
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
          <Input
            label="Role name"
            required
            disabled={!!editFor && PROTECTED_ROLES.has(editFor.roleName)}
            error={errors.roleName?.message}
            {...register("roleName", { required: "Role name is required", minLength: 2 })}
          />
          {editFor && PROTECTED_ROLES.has(editFor.roleName) && (
            <p className="text-xs text-slate-500">Built-in roles cannot be renamed.</p>
          )}
        </form>
      </Modal>
    </>
  );
}
