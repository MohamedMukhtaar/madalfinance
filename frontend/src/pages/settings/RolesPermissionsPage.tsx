import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Shield,
  Trash2,
  Save,
  ArrowLeft,
  Search,
  RefreshCw,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";
import {
  Badge,
  Button,
  Modal,
  ErrorState,
  confirmDialog,
  ActionIconButton,
  TableCheck,
} from "@/components/ui";
import { PageHeader } from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/FormField";
import {
  useAssignRolePermissions,
  useCreateRole,
  useDeleteRole,
  usePermissionCatalog,
  useRoles,
  useUpdateRole,
} from "@/hooks/queries";
import { usePermission } from "@/hooks/usePermission";
import type { AppRoleRecord, PermissionModule } from "@/types";
import { formatDate } from "@/utils/format";

const PROTECTED = new Set(["Super Admin", "Admin"]);
const roleColumnHelper = createColumnHelper<AppRoleRecord>();

/** DreamPOS matrix columns → our Spatie action names. */
const MATRIX_COLS = [
  { key: "read", label: "Read", actions: ["view"] },
  { key: "write", label: "Write", actions: ["edit", "manage", "restore"] },
  { key: "create", label: "Create", actions: ["create"] },
  { key: "delete", label: "Delete", actions: ["delete"] },
] as const;

interface RoleForm {
  roleName: string;
  description: string;
}

function namesForColumn(mod: PermissionModule, colActions: readonly string[]) {
  return mod.actions.filter((a) => colActions.includes(a.action)).map((a) => a.name);
}

function asPermissionNames(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw || raw === "{}" || raw === "[]") return [];
    if (raw.startsWith("{") && raw.endsWith("}")) {
      return raw
        .slice(1, -1)
        .split(",")
        .map((s) => s.replace(/^"|"$/g, "").trim())
        .filter(Boolean);
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function MatrixCheck({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <span className="inline-flex items-center justify-center">
      <TableCheck checked={checked} disabled={disabled} onChange={() => onChange()} />
    </span>
  );
}

export default function RolesPermissionsPage() {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission("create roles");
  const canEdit = hasPermission("edit roles");
  const canDelete = hasPermission("delete roles");

  const { data: roles = [], isLoading, error, refetch } = useRoles();
  const { data: catalogData } = usePermissionCatalog();
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();
  const assignMutation = useAssignRolePermissions();
  const deleteMutation = useDeleteRole();

  const [view, setView] = useState<"list" | "permissions">("list");
  const [modalOpen, setModalOpen] = useState(false);
  const [editFor, setEditFor] = useState<AppRoleRecord | undefined>();
  const [selected, setSelected] = useState<AppRoleRecord | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [permSearch, setPermSearch] = useState("");

  const catalog = catalogData?.catalog ?? [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RoleForm>({ defaultValues: { roleName: "", description: "" } });

  useEffect(() => {
    if (!selected) {
      setChecked(new Set());
      return;
    }
    setChecked(new Set(asPermissionNames(selected.permissions)));
  }, [selected]);

  // Keep selected role in sync when roles list refreshes after save
  useEffect(() => {
    if (!selected) return;
    const fresh = roles.find((r) => r.roleId === selected.roleId);
    if (!fresh || fresh === selected) return;
    const prev = asPermissionNames(selected.permissions).slice().sort().join("|");
    const next = asPermissionNames(fresh.permissions).slice().sort().join("|");
    if (
      fresh.roleName !== selected.roleName ||
      fresh.description !== selected.description ||
      prev !== next
    ) {
      setSelected(fresh);
    }
  }, [roles, selected]);

  const openCreate = () => {
    setEditFor(undefined);
    reset({ roleName: "", description: "" });
    setModalOpen(true);
  };

  const openEdit = (role: AppRoleRecord) => {
    setEditFor(role);
    reset({ roleName: role.roleName, description: role.description ?? "" });
    setModalOpen(true);
  };

  const openPermissions = (role: AppRoleRecord) => {
    setSelected(role);
    setPermSearch("");
    setView("permissions");
  };

  const backToRoles = () => {
    setView("list");
    setPermSearch("");
  };

  const onSubmit = handleSubmit((values) => {
    const roleName = values.roleName.trim();
    const description = values.description.trim() || null;
    if (editFor) {
      updateMutation.mutate(
        { id: editFor.roleId, data: { roleName, description } },
        { onSuccess: () => setModalOpen(false) }
      );
      return;
    }
    createMutation.mutate(
      { roleName, description, permissions: [] },
      { onSuccess: () => setModalOpen(false) }
    );
  });

  const locked = selected?.roleName === "Super Admin";

  const toggleNames = (names: string[], turnOn: boolean) => {
    if (!canEdit || locked || !names.length) return;
    setChecked((prev) => {
      const next = new Set(prev);
      for (const n of names) {
        if (turnOn) next.add(n);
        else next.delete(n);
      }
      return next;
    });
  };

  const filteredCatalog = useMemo(() => {
    const q = permSearch.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter((m) => m.label.toLowerCase().includes(q) || m.module.includes(q));
  }, [catalog, permSearch]);

  const columns = useMemo<ColumnDef<AppRoleRecord, any>[]>(
    () => [
      roleColumnHelper.accessor("roleName", {
        header: "Role",
        cell: (info) => (
          <span className="font-medium text-ink">{info.getValue()}</span>
        ),
      }),
      roleColumnHelper.accessor("createdAt", {
        header: "Created Date",
        cell: (info) => (
          <span className="text-sm text-ink-soft">{formatDate(info.getValue())}</span>
        ),
      }),
      roleColumnHelper.display({
        id: "status",
        header: "Status",
        cell: () => (
          <Badge
            dot
            className="bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30"
          >
            Active
          </Badge>
        ),
      }),
      roleColumnHelper.display({
        id: "actions",
        header: "Action",
        enableSorting: false,
        cell: ({ row }) => {
          const role = row.original;
          const isProtected = PROTECTED.has(role.roleName) || role.isSystem;
          const hasUsers = Number(role.userCount ?? 0) > 0;
          return (
            <div className="inline-flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
              <ActionIconButton title="Permissions" aria-label="Permissions" onClick={() => openPermissions(role)}>
                <Shield />
              </ActionIconButton>
              {canEdit && (
                <ActionIconButton title="Edit" aria-label="Edit" onClick={() => openEdit(role)}>
                  <Pencil />
                </ActionIconButton>
              )}
              {canDelete && !isProtected && !hasUsers && (
                <ActionIconButton
                  title="Delete"
                  aria-label="Delete"
                  danger
                  onClick={async () => {
                    const ok = await confirmDialog({
                      title: `Delete ${role.roleName}?`,
                      text: "This role will be permanently removed.",
                      confirmText: "Delete role",
                    });
                    if (ok) deleteMutation.mutate(role.roleId);
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
    [canEdit, canDelete, deleteMutation]
  );

  if (error) return <ErrorState onRetry={refetch} />;

  /* ---------- Permissions matrix (DreamPOS style) ---------- */
  if (view === "permissions" && selected) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Permission"
          subtitle="Manage your permissions"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {canEdit && !locked && (
                <Button
                  size="sm"
                  leftIcon={<Save className="h-4 w-4" />}
                  loading={assignMutation.isPending}
                  onClick={() =>
                    assignMutation.mutate(
                      { id: selected.roleId, permissions: [...checked] },
                      {
                        onSuccess: (role) => {
                          setSelected({
                            ...role,
                            permissions: asPermissionNames(role.permissions),
                          });
                          setChecked(new Set(asPermissionNames(role.permissions)));
                        },
                      }
                    )
                  }
                >
                  Save
                </Button>
              )}
              <Button size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={backToRoles}>
                Back to Roles
              </Button>
            </div>
          }
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[220px] max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              value={permSearch}
              onChange={(e) => setPermSearch(e.target.value)}
              placeholder="Search"
              className="h-10 w-full rounded-md border border-line bg-panel pl-10 pr-3 text-sm text-ink placeholder:text-ink-muted transition focus:outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]"
            />
          </div>
          <p className="text-sm font-semibold text-ink">
            Role: <span className="text-[var(--brand-primary)]">{selected.roleName}</span>
          </p>
        </div>

        {locked && (
          <p className="rounded-xl bg-muted px-4 py-2.5 text-xs text-ink-muted">
            Super Admin always has every permission. Changes here are not required.
          </p>
        )}

        <div className="overflow-hidden rounded-2xl bg-panel shadow-sm ring-1 ring-line">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  <th className="px-4 py-3.5">Modules</th>
                  <th className="px-3 py-3.5 text-center">Allow All</th>
                  {MATRIX_COLS.map((c) => (
                    <th key={c.key} className="px-3 py-3.5 text-center">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCatalog.map((mod) => {
                  const allNames = mod.actions.map((a) => a.name);
                  const allOn =
                    locked || (allNames.length > 0 && allNames.every((n) => checked.has(n)));
                  return (
                    <tr key={mod.module} className="border-b border-line last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3.5 font-medium text-ink">{mod.label}</td>
                      <td className="px-3 py-3.5 text-center">
                        <MatrixCheck
                          checked={allOn}
                          disabled={!canEdit || locked || !allNames.length}
                          onChange={() => toggleNames(allNames, !allOn)}
                        />
                      </td>
                      {MATRIX_COLS.map((col) => {
                        const names = namesForColumn(mod, col.actions);
                        const available = names.length > 0;
                        const on = locked || (available && names.every((n) => checked.has(n)));
                        return (
                          <td key={col.key} className="px-3 py-3.5 text-center">
                            {available ? (
                              <MatrixCheck
                                checked={on}
                                disabled={!canEdit || locked}
                                onChange={() => toggleNames(names, !on)}
                              />
                            ) : (
                              <span className="text-ink-muted">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {!filteredCatalog.length && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-muted">
                      {catalog.length === 0
                        ? "Permission modules could not be loaded. Refresh and try again."
                        : "No modules match your search."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Roles list (DreamPOS style) ---------- */
  return (
    <div className="space-y-4">
      <PageHeader
        title="Roles & Permission"
        subtitle="Manage your roles"
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
            {canCreate && (
              <Button size="sm" onClick={openCreate} leftIcon={<Plus className="h-4 w-4" />}>
                Add Role
              </Button>
            )}
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={roles}
        loading={isLoading}
        searchPlaceholder="Search"
        showColumnToggle={false}
        getRowId={(r) => String(r.roleId)}
        renderMobileCard={(row) => (
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-ink">{row.roleName}</p>
              <p className="mt-0.5 text-xs text-ink-muted">{formatDate(row.createdAt)}</p>
              <Badge
                dot
                className="mt-2 bg-emerald-50 text-emerald-700 ring-emerald-200"
              >
                Active
              </Badge>
            </div>
            <div className="inline-flex gap-2">
              <ActionIconButton title="Permissions" aria-label="Permissions" onClick={() => openPermissions(row)}>
                <Shield />
              </ActionIconButton>
              {canEdit && (
                <ActionIconButton title="Edit" aria-label="Edit" onClick={() => openEdit(row)}>
                  <Pencil />
                </ActionIconButton>
              )}
            </div>
          </div>
        )}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editFor ? "Edit role" : "Add Role"}
        subtitle="Roles group permissions for one or more users."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
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
            disabled={!!editFor && PROTECTED.has(editFor.roleName)}
            error={errors.roleName?.message}
            {...register("roleName", { required: "Role name is required", minLength: 2 })}
          />
          <Input label="Description" {...register("description")} />
        </form>
      </Modal>
    </div>
  );
}
