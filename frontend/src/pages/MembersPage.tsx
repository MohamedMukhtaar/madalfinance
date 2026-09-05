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
  useEmployeeOrg,
} from "@/hooks/queries";
import { useSettings } from "@/context/SettingsContext";
import { DUE_STATUS_STYLES } from "@/utils/constants";
import { formatCurrency, formatDate } from "@/utils/format";
import type { EmployeeOrgRecord, Member } from "@/types";

const columnHelper = createColumnHelper<Member>();

interface MemberForm {
  fullName: string;
  phone: string;
  email: string;
  jobTitleId: string;
  defaultMonthlyDue: number;
  status: "active" | "inactive";
}

type CreateMemberPayload = {
  fullName: string;
  phone?: string;
  email?: string;
  jobTitleId?: number | null;
  defaultMonthlyDue?: number;
};

export default function MembersPage() {
  const { data: members = [], isLoading, error, refetch } = useMembers();
  const { data: titles = [] } = useEmployeeOrg("titles");
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
      columnHelper.accessor("memberCode", {
        header: "ID",
        cell: (info) => (
          <span className="font-mono text-xs text-slate-500">{info.getValue() || `MEM-${String(info.row.original.memberId).padStart(4, "0")}`}</span>
        ),
      }),
      columnHelper.display({
        id: "photo",
        header: "Photo",
        cell: ({ row }) => (
          <Avatar name={row.original.memberName} src={row.original.avatarUrl ?? undefined} size="sm" />
        ),
      }),
      columnHelper.accessor("memberName", {
        header: "Name",
        cell: (info) => (
          <span className="font-semibold text-slate-800 dark:text-slate-100">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("phone", {
        header: "Phone",
        cell: (info) => <span className="text-sm text-slate-500">{info.getValue() || "—"}</span>,
      }),
      columnHelper.accessor("position", {
        header: "Title",
        cell: (info) => <span className="text-slate-600 dark:text-slate-300">{info.getValue() || "—"}</span>,
      }),
      columnHelper.accessor("joinedDate", {
        header: "Joined date",
        cell: (info) => <span className="text-sm text-slate-500">{formatDate(info.getValue())}</span>,
      }),
      columnHelper.accessor("defaultMonthlyDue", {
        header: "Default due",
        cell: (info) => (
          <span className="font-mono font-semibold text-slate-900 dark:text-white">
            {formatCurrency(info.getValue(), currency)}
          </span>
        ),
      }),
      columnHelper.display({
        id: "lastDue",
        header: "Last due",
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
        titles={titles}
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
  titles,
  onCreate,
  onUpdate,
}: {
  open: boolean;
  onClose: () => void;
  member?: Member;
  titles: EmployeeOrgRecord[];
  onCreate: (data: CreateMemberPayload & { photo?: File | null }) => Promise<void>;
  onUpdate: (
    id: number,
    data: {
      patch: Partial<{
        fullName: string;
        phone: string;
        email: string;
        jobTitleId: number | null;
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
            phone: member.phone ?? "",
            email: member.email ?? "",
            jobTitleId: member.jobTitleId ? String(member.jobTitleId) : "",
            defaultMonthlyDue: member.defaultMonthlyDue,
            status: member.status,
          }
        : {
            fullName: "",
            phone: "",
            email: "",
            jobTitleId: "",
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
                    jobTitleId: d.jobTitleId ? Number(d.jobTitleId) : null,
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
                  jobTitleId: d.jobTitleId ? Number(d.jobTitleId) : null,
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
        <Select
          label="Title"
          options={[
            { value: "", label: "Select title" },
            ...titles
              .filter((t) => t.status !== "inactive" || t.jobTitleId === member?.jobTitleId)
              .map((t) => ({ value: String(t.jobTitleId), label: t.titleName ?? "" })),
          ]}
          {...register("jobTitleId")}
        />
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
