import { useEffect, useMemo, useState } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { Plus, UsersRound, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { DataTable } from "@/components/tables/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Avatar, Badge, StatCard, Modal, Button, promptDeleteReason, FileUpload, type UploadedFile } from "@/components/ui";
import { Input, Select } from "@/components/ui/FormField";
import {
  useMembers,
  useDues,
  useCreateMember,
  useUpdateMember,
  useDeactivateMember,
} from "@/hooks/queries";
import { useSettings } from "@/context/SettingsContext";
import { DUE_STATUS_STYLES } from "@/utils/constants";
import { formatCurrency, formatDate } from "@/utils/format";
import { dateTimeColumns } from "@/utils/tableHelpers";
import { cn } from "@/utils/cn";
import type { Member } from "@/types";

const columnHelper = createColumnHelper<Member>();

interface MemberForm {
  fullName: string;
  phone: string;
  email: string;
  position: string;
  defaultMonthlyDue: number;
  status: "active" | "inactive";
}

type CreateMemberPayload = {
  fullName: string;
  phone?: string;
  email?: string;
  position?: string;
  defaultMonthlyDue?: number;
};

export default function MembersPage() {
  const { data: members = [], isLoading, error, refetch } = useMembers();
  const { data: batchesData } = useDues();
  const batches = batchesData?.rows ?? [];
  const { currency } = useSettings();
  const createMutation = useCreateMember();
  const updateMutation = useUpdateMember();
  const deactivateMutation = useDeactivateMember();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Member | undefined>();

  const currentDues = useMemo(() => {
    const map = new Map<number, { status: string; balance: number; amount: number; month: string }>();
    batches.forEach((b) => {
      (b.dues ?? []).forEach((d) => {
        if (!map.has(d.memberId)) {
          map.set(d.memberId, {
            status: d.status,
            balance: d.balance ?? Math.max(0, Number(d.amount) - Number(d.paidAmount ?? 0)),
            amount: d.amount,
            month: `${new Date(b.year, b.month - 1, 1).toLocaleDateString("en-US", {
              month: "short",
            })} ${String(b.year).slice(2)}`,
          });
        }
      });
    });
    return map;
  }, [batches]);

  const columns = useMemo<ColumnDef<Member, any>[]>(
    () => [
      columnHelper.accessor("memberName", {
        header: "Member",
        cell: (info) => {
          const m = info.row.original;
          return (
            <div className="flex items-center gap-3">
              <Avatar name={m.memberName} src={m.avatarUrl ?? undefined} />
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-100">{m.memberName}</p>
                <p className="text-xs text-slate-400">{m.position || "—"}</p>
              </div>
            </div>
          );
        },
      }),
      ...dateTimeColumns<Member>("joinedDate", "Joined", (m) => m.joinedDate, (m) => m.joinedDate),
      columnHelper.accessor("defaultMonthlyDue", {
        header: "Default Due",
        cell: (info) => (
          <span className="font-mono font-semibold text-slate-900 dark:text-white">
            {formatCurrency(info.getValue(), currency)}
          </span>
        ),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => (
          <Badge
            className={cn(
              info.getValue() === "active"
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30"
                : "bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:ring-slate-500/30"
            )}
            dot
          >
            {info.getValue()}
          </Badge>
        ),
      }),
      columnHelper.display({
        id: "due",
        header: "Latest Due",
        cell: ({ row }) => {
          const due = currentDues.get(row.original.memberId);
          if (!due) return <span className="text-xs text-slate-400">No dues yet</span>;
          const style = DUE_STATUS_STYLES[due.status] ?? DUE_STATUS_STYLES.Pending;
          return (
            <div className="space-y-0.5">
              <Badge className={style}>{due.status}</Badge>
              <p className="text-[11px] text-slate-400">
                {due.month} · {formatCurrency(due.balance, currency)} left
              </p>
            </div>
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: () => null,
      }),
    ],
    [currency, currentDues]
  );

  const activeCount = members.filter((m) => m.status === "active").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Members"
        subtitle="Manage Madal ICT internal members and monthly dues."
        actions={
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setEditing(undefined);
              setModalOpen(true);
            }}
          >
            Add member
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total members"
          value={String(members.length)}
          icon={<UsersRound className="h-5 w-5" />}
          loading={isLoading}
        />
        <StatCard
          label="Active"
          value={String(activeCount)}
          icon={<UsersRound className="h-5 w-5" />}
          loading={isLoading}
        />
        <StatCard
          label="Pending dues"
          value={String([...currentDues.values()].filter((d) => d.status !== "Paid").length)}
          icon={<UsersRound className="h-5 w-5" />}
          loading={isLoading}
        />
      </div>

      <DataTable
        columns={columns}
        data={members}
        loading={isLoading}
        error={error ? String(error) : undefined}
        onRetry={() => refetch()}
        searchPlaceholder="Search members…"
        emptyTitle="No members yet"
        emptyDescription="Add your first member to start tracking contributions."
        getRowId={(row) => String(row.memberId)}
        actions={(row) => [
          {
            label: "Edit",
            icon: <Pencil className="h-4 w-4" />,
            onClick: () => {
              setEditing(row);
              setModalOpen(true);
            },
          },
          {
            label: "Delete",
            icon: <Trash2 className="h-4 w-4" />,
            danger: true,
            onClick: async () => {
              const reason = await promptDeleteReason({
                title: `Delete ${row.memberName}?`,
                text: "This member will be moved to Trash and can be restored later.",
                confirmText: "Move to trash",
              });
              if (reason) deactivateMutation.mutate({ id: row.memberId, reason });
            },
          },
        ]}
      />

      <MemberFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        member={editing}
        onCreate={async (data) => {
          await createMutation.mutateAsync(data);
          setModalOpen(false);
        }}
        onUpdate={async (id, data) => {
          await updateMutation.mutateAsync({ id, patch: data.patch, photo: data.photo });
          setModalOpen(false);
        }}
      />
    </div>
  );
}

function MemberFormModal({
  open,
  onClose,
  member,
  onCreate,
  onUpdate,
}: {
  open: boolean;
  onClose: () => void;
  member?: Member;
  onCreate: (data: CreateMemberPayload & { photo?: File | null }) => Promise<void>;
  onUpdate: (
    id: number,
    data: {
      patch: Partial<{
        fullName: string;
        phone: string;
        email: string;
        position: string;
        defaultMonthlyDue: number;
        status: string;
      }>;
      photo?: File | null;
    }
  ) => Promise<void>;
}) {
  const isEdit = !!member;
  const [photoFiles, setPhotoFiles] = useState<UploadedFile[]>([]);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MemberForm>();

  useEffect(() => {
    if (!open) return;
    setPhotoFiles([]);
    reset(
      member
        ? {
            fullName: member.memberName,
            phone: "",
            email: member.email ?? "",
            position: member.position ?? "",
            defaultMonthlyDue: member.defaultMonthlyDue,
            status: member.status,
          }
        : {
            fullName: "",
            phone: "",
            email: "",
            position: "",
            defaultMonthlyDue: 10,
            status: "active",
          }
    );
  }, [open, member, reset]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit member" : "Add member"}
      subtitle={isEdit ? "Update member profile and dues." : "Add a co-founder profile for contribution tracking."}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={isSubmitting}
            onClick={handleSubmit(async (d) => {
              const photo = photoFiles[0]?.file ?? null;
              if (isEdit && member) {
                await onUpdate(member.memberId, {
                  patch: {
                    fullName: d.fullName,
                    phone: d.phone,
                    email: d.email,
                    position: d.position,
                    defaultMonthlyDue: Number(d.defaultMonthlyDue),
                    status: d.status,
                  },
                  photo,
                });
              } else {
                await onCreate({
                  fullName: d.fullName,
                  phone: d.phone || undefined,
                  email: d.email || undefined,
                  position: d.position || undefined,
                  defaultMonthlyDue: Number(d.defaultMonthlyDue),
                  photo,
                });
              }
            })}
          >
            {isEdit ? "Save changes" : "Create member"}
          </Button>
        </>
      }
    >
      <form className="grid gap-4 sm:grid-cols-2">
        <Input label="Full name" error={errors.fullName?.message} {...register("fullName", { required: "Required" })} />
        <Input label="Position" {...register("position")} />
        <Input label="Phone" {...register("phone")} />
        <Input label="Email" type="email" {...register("email")} />
        <Input
          label="Default monthly due"
          type="number"
          step="0.01"
          {...register("defaultMonthlyDue", { valueAsNumber: true, required: true, min: 0 })}
        />
        {isEdit && (
          <Select
            label="Status"
            options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
            {...register("status")}
          />
        )}
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-xs font-semibold text-ink-soft">Profile photo</p>
          {member?.avatarUrl && photoFiles.length === 0 && (
            <div className="mb-3 flex items-center gap-3">
              <Avatar name={member.memberName} src={member.avatarUrl} size="lg" />
              <p className="text-xs text-slate-400">Current photo — upload a new one to replace it.</p>
            </div>
          )}
          <FileUpload
            label="Upload member photo (JPG / PNG)"
            accept="image/jpeg,image/png,image/webp"
            value={photoFiles}
            onChange={setPhotoFiles}
          />
        </div>
      </form>
    </Modal>
  );
}
