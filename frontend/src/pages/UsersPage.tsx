import { useMemo, useState } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { Plus, Pencil, Shield, Trash2, Users, UserCheck, UserX } from "lucide-react";
import { DataTable } from "@/components/tables/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge, Button, Modal, ErrorState, Tabs, promptDeleteReason, confirmDialog } from "@/components/ui";
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
import { formatDate, formatTime } from "@/utils/format";
import type { AppRoleRecord, User } from "@/types";

const PROTECTED_ROLES = new Set(["Super Admin", "Admin"]);

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300",
  inactive: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-300",
};

const ROLE_STYLES: Record<string, string> = {
  "Super Admin": "bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-500/10 dark:text-brand-300",
  Admin: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-300",
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
  const [tab, setTab] = useState<TabValue>("users");
  const { data: usersData } = useUsers();
  const { data: roles = [] } = useRoles();

  const tabs = [
    { label: "Users", value: "users", icon: <Users className="h-4 w-4" />, count: usersData?.rows?.length },
    { label: "Roles", value: "roles", icon: <Shield className="h-4 w-4" />, count: roles.length },
  ];

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

function UsersTab({ roles }: { roles: AppRoleRecord[] }) {
  const { user: currentUser, setUser } = useAuth();
  const { data, isLoading, error, refetch } = useUsers();
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();

  const users = data?.rows ?? [];
  const [modalOpen, setModalOpen] = useState(false);
  const [editFor, setEditFor] = useState<User | undefined>();

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
  };

  const onSubmit = handleSubmit((values) => {
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
        { id: editFor.userId, data: payload },
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
      },
      { onSuccess: closeModal }
    );
  });

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      userColumnHelper.accessor("username", {
        header: "Username",
        cell: (info) => (
          <span className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400">{info.getValue()}</span>
        ),
      }),
      userColumnHelper.accessor("fullName", {
        header: "Full name",
        cell: (info) => <span className="font-semibold text-slate-800 dark:text-slate-100">{info.getValue()}</span>,
      }),
      userColumnHelper.accessor("role", {
        header: "Role",
        cell: (info) => <Badge className={ROLE_STYLES[info.getValue()] ?? ""}>{info.getValue()}</Badge>,
      }),
      userColumnHelper.accessor("email", {
        header: "Email",
        cell: (info) => <span className="text-sm text-slate-500">{info.getValue() ?? "—"}</span>,
      }),
      userColumnHelper.accessor("status", {
        header: "Status",
        cell: (info) => (
          <Badge className={STATUS_STYLES[info.getValue()]} dot>
            {info.getValue()}
          </Badge>
        ),
      }),
      userColumnHelper.accessor("lastLogin", {
        header: "Last login",
        cell: (info) => {
          const val = info.getValue();
          return val ? (
            <span className="text-xs text-slate-500">
              {formatDate(val)} {formatTime(val)}
            </span>
          ) : (
            <span className="text-xs text-slate-400">Never</span>
          );
        },
      }),
      userColumnHelper.display({ id: "actions", header: "", cell: () => null }),
    ],
    []
  );

  if (error) return <ErrorState onRetry={refetch} />;

  const editingSelf = editFor?.userId === currentUser?.userId;

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openCreate} leftIcon={<Plus className="h-4 w-4" />}>
          Add user
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={users}
        loading={isLoading}
        searchPlaceholder="Search users…"
        renderMobileCard={(row) => (
          <div className="space-y-1">
            <p className="font-mono text-xs font-bold text-brand-600">{row.username}</p>
            <p className="font-semibold text-slate-800 dark:text-slate-100">{row.fullName}</p>
            <div className="flex flex-wrap gap-2">
              <Badge className={ROLE_STYLES[row.role] ?? ""}>{row.role}</Badge>
              <Badge className={STATUS_STYLES[row.status]} dot>
                {row.status}
              </Badge>
            </div>
          </div>
        )}
        actions={(row) => {
          const isSelf = row.userId === currentUser?.userId;
          const actions: DropdownItem[] = [
            { label: "Edit", icon: <Pencil className="h-4 w-4" />, onClick: () => openEdit(row) },
          ];

          if (!isSelf) {
            if (row.status === "active") {
              actions.push({
                label: "Deactivate",
                icon: <UserX className="h-4 w-4" />,
                onClick: async () => {
                  const ok = await confirmDialog({
                    title: `Deactivate ${row.username}?`,
                    text: "They will no longer be able to sign in until reactivated.",
                    confirmText: "Deactivate",
                  });
                  if (ok) updateMutation.mutate({ id: row.userId, data: { status: "inactive" } });
                },
              });
            } else {
              actions.push({
                label: "Activate",
                icon: <UserCheck className="h-4 w-4" />,
                onClick: () => updateMutation.mutate({ id: row.userId, data: { status: "active" } }),
              });
            }

            actions.push({ divider: true });
            actions.push({
              label: "Delete",
              icon: <Trash2 className="h-4 w-4" />,
              danger: true,
              onClick: async () => {
                const reason = await promptDeleteReason({
                  title: `Delete ${row.username}?`,
                  text: "This user will be moved to Trash and can be restored later.",
                  confirmText: "Move to trash",
                });
                if (reason) deleteMutation.mutate({ id: row.userId, reason });
              },
            });
          }

          return actions;
        }}
      />

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
          <Input label="Phone" {...register("phone")} />
          <Input label="Email" type="email" {...register("email")} />
        </form>
      </Modal>
    </>
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
