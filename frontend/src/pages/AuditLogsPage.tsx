import { useMemo, useState } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { ClipboardList } from "lucide-react";
import { DataTable } from "@/components/tables/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge, DateRangeFilter, type DateFilterMode, ErrorState, Select, StatCard } from "@/components/ui";
import { useAuditLogs } from "@/hooks/queries";
import { addDays, formatDate, formatTime, toDateInput } from "@/utils/format";
import type { AuditLog } from "@/types";

const columnHelper = createColumnHelper<AuditLog>();

const MODULE_STYLES: Record<string, string> = {
  Auth: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300",
  User: "bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-500/10 dark:text-brand-300",
  Role: "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300",
  Member: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-300",
  Customer: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300",
  Payment: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300",
  Invoice: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300",
  Expense: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-amber-500/10 dark:text-rose-300",
  Trash: "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-300",
  Setting: "bg-teal-50 text-teal-700 ring-teal-200 dark:bg-teal-500/10 dark:text-teal-300",
  Report: "bg-cyan-50 text-cyan-700 ring-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-300",
};

const MODULE_OPTIONS = [
  "Auth",
  "User",
  "Role",
  "Member",
  "Customer",
  "Project",
  "Contract",
  "Invoice",
  "Payment",
  "Rental",
  "Contribution",
  "Expense",
  "Income",
  "Account",
  "Setting",
  "Trash",
  "Report",
];

export default function AuditLogsPage() {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [moduleFilter, setModuleFilter] = useState("all");
  const [dateMode, setDateMode] = useState<DateFilterMode>("range");
  const [from, setFrom] = useState(toDateInput(addDays(new Date(), -30)));
  const [to, setTo] = useState(toDateInput(new Date()));
  const [date, setDate] = useState("");

  const listParams = useMemo(() => {
    const base: Record<string, string | number> = {
      page: pageIndex + 1,
      perPage: pageSize,
      sort: "created_at:desc",
    };
    if (moduleFilter !== "all") base.module = moduleFilter;
    if (dateMode === "day" && date) {
      base.fromDate = date;
      base.toDate = date;
    } else if (dateMode === "range") {
      if (from) base.fromDate = from;
      if (to) base.toDate = to;
    }
    return base;
  }, [pageIndex, pageSize, moduleFilter, dateMode, date, from, to]);

  const { data, isLoading, error, refetch } = useAuditLogs(listParams);
  const rows = data?.rows ?? [];
  const totalCount = data?.total ?? 0;

  const columns = useMemo<ColumnDef<AuditLog, any>[]>(
    () => [
      columnHelper.accessor("createdAt", {
        header: "When",
        cell: (info) => (
          <span className="text-xs text-slate-500">
            {formatDate(info.getValue())} {formatTime(info.getValue())}
          </span>
        ),
      }),
      columnHelper.display({
        id: "user",
        header: "Who",
        cell: ({ row }) => (
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
              {row.original.fullName || row.original.username || "System"}
            </p>
            {row.original.username && (
              <p className="text-xs text-slate-400">@{row.original.username}</p>
            )}
          </div>
        ),
      }),
      columnHelper.accessor("module", {
        header: "Module",
        cell: (info) => <Badge className={MODULE_STYLES[info.getValue()] ?? ""}>{info.getValue()}</Badge>,
      }),
      columnHelper.accessor("action", {
        header: "Action",
        cell: (info) => (
          <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("recordId", {
        header: "Record",
        cell: (info) => <span className="font-mono text-xs text-slate-500">{info.getValue() ?? "—"}</span>,
      }),
      columnHelper.accessor("details", {
        header: "Details",
        cell: (info) => (
          <span className="max-w-xs truncate text-xs text-slate-500" title={info.getValue() ?? undefined}>
            {info.getValue() ?? "—"}
          </span>
        ),
      }),
      columnHelper.accessor("ipAddress", {
        header: "IP",
        cell: (info) => <span className="text-xs text-slate-500">{info.getValue() ?? "—"}</span>,
      }),
    ],
    []
  );

  if (error) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        subtitle="Super Admin only — every create, update, delete, login, and export is recorded with who did it."
      />

      <StatCard
        label="Entries in range"
        value={String(totalCount)}
        icon={<ClipboardList className="h-5 w-5" />}
        loading={isLoading}
      />

      <DataTable
        columns={columns}
        data={rows}
        loading={isLoading}
        searchable={false}
        serverSide
        totalCount={totalCount}
        pageIndex={pageIndex}
        pageSize={pageSize}
        pageSizeOptions={[25, 50, 100]}
        onPageChange={setPageIndex}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPageIndex(0);
        }}
        emptyTitle="No audit entries"
        emptyDescription="Try widening the date range or clearing the module filter."
        getRowId={(row) => String(row.logId)}
        toolbar={
          <div className="flex flex-wrap items-end gap-3">
            <Select
              label="Module"
              value={moduleFilter}
              onChange={(e) => {
                setModuleFilter(e.target.value);
                setPageIndex(0);
              }}
              options={[
                { value: "all", label: "All modules" },
                ...MODULE_OPTIONS.map((m) => ({ value: m, label: m })),
              ]}
              className="w-44"
            />
            <DateRangeFilter
              mode={dateMode}
              onModeChange={(mode) => {
                setDateMode(mode);
                setPageIndex(0);
              }}
              date={date}
              onDateChange={setDate}
              from={from}
              to={to}
              onFromChange={setFrom}
              onToChange={setTo}
            />
          </div>
        }
        renderMobileCard={(row) => (
          <div className="space-y-1">
            <div className="flex flex-wrap gap-2">
              <Badge className={MODULE_STYLES[row.module] ?? ""}>{row.module}</Badge>
              <span className="font-mono text-xs font-semibold">{row.action}</span>
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {row.fullName || row.username || "System"}
            </p>
            {row.details && <p className="text-xs text-slate-500">{row.details}</p>}
            <p className="text-xs text-slate-400">
              {formatDate(row.createdAt)} {formatTime(row.createdAt)}
            </p>
          </div>
        )}
      />
    </div>
  );
}
