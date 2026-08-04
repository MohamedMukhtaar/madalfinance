import { useMemo, useState } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { RotateCcw, Trash2 } from "lucide-react";
import { DataTable } from "@/components/tables/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge, Select, StatCard, confirmDialog } from "@/components/ui";
import { useRestoreTrash, useTrash } from "@/hooks/queries";
import { formatDate, formatTime } from "@/utils/format";
import type { TrashItem } from "@/services/finance";

const columnHelper = createColumnHelper<TrashItem>();

const TYPE_LABELS: Record<string, string> = {
  customer: "Customer",
  project: "Project",
  contract: "Contract",
  invoice: "Invoice",
  payment: "Payment",
  expense: "Expense",
  income: "Income",
  member: "Member",
};

const TYPE_STYLES: Record<string, string> = {
  customer: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30",
  project: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/30",
  contract: "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/30",
  invoice: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30",
  payment: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
  expense: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30",
  income: "bg-teal-50 text-teal-700 ring-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-500/30",
  member: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-500/30",
};

export default function TrashPage() {
  const [typeFilter, setTypeFilter] = useState("all");
  const { data, isLoading, error, refetch } = useTrash({
    perPage: 100,
    entityType: typeFilter === "all" ? undefined : typeFilter,
  });
  const restoreMutation = useRestoreTrash();
  const rows = data?.rows ?? [];

  const columns = useMemo<ColumnDef<TrashItem, any>[]>(
    () => [
      columnHelper.accessor("entityType", {
        header: "Type",
        cell: (info) => {
          const type = info.getValue();
          return (
            <Badge className={TYPE_STYLES[type] ?? TYPE_STYLES.member}>
              {TYPE_LABELS[type] ?? type}
            </Badge>
          );
        },
      }),
      columnHelper.accessor("entityLabel", {
        header: "Item",
        cell: (info) => (
          <span className="font-semibold text-slate-800 dark:text-slate-100">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("deleteReason", {
        header: "Reason",
        cell: (info) => (
          <span className="max-w-xs truncate text-sm text-slate-500 dark:text-slate-400" title={info.getValue()}>
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("deletedByName", {
        header: "Deleted by",
        cell: (info) => (
          <span className="text-sm text-slate-500 dark:text-slate-400">{info.getValue() || "—"}</span>
        ),
      }),
      columnHelper.accessor("deletedAt", {
        header: "Deleted",
        cell: (info) => (
          <div className="text-xs text-slate-400">
            <p>{formatDate(info.getValue())}</p>
            <p>{formatTime(info.getValue())}</p>
          </div>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: () => null,
      }),
    ],
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trash"
        subtitle="Soft-deleted records. Restore anything that was removed by mistake."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Items in trash"
          value={String(data?.total ?? rows.length)}
          icon={<Trash2 className="h-5 w-5" />}
          loading={isLoading}
        />
        <StatCard
          label="Types"
          value={String(new Set(rows.map((r) => r.entityType)).size)}
          icon={<RotateCcw className="h-5 w-5" />}
          loading={isLoading}
        />
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={isLoading}
        error={error ? String(error) : undefined}
        onRetry={() => refetch()}
        searchPlaceholder="Search trash…"
        emptyTitle="Trash is empty"
        emptyDescription="Deleted customers, members, invoices and more will appear here."
        getRowId={(row) => String(row.trashId)}
        toolbar={
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={[
              { value: "all", label: "All types" },
              ...Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label })),
            ]}
            className="w-44"
          />
        }
        actions={(row) => [
          {
            label: "Restore",
            icon: <RotateCcw className="h-4 w-4" />,
            onClick: async () => {
              const ok = await confirmDialog({
                title: "Restore this item?",
                text: `${row.entityLabel} will be restored and removed from trash.`,
                confirmText: "Restore",
                icon: "question",
              });
              if (ok) restoreMutation.mutate(row.trashId);
            },
          },
        ]}
      />
    </div>
  );
}
