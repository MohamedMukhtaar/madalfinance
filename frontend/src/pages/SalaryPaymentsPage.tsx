import { useMemo, useState } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { Banknote, Receipt } from "lucide-react";
import { DataTable } from "@/components/tables/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge, DateRangeFilter, FilterBar, Select, StatCard, type DateFilterMode } from "@/components/ui";
import { HrTabs } from "@/features/hr/HrTabs";
import { useSalaryPayments } from "@/hooks/queries";
import { useSettings } from "@/context/SettingsContext";
import { PAYMENT_METHODS, PAYMENT_STATUS_STYLES } from "@/utils/constants";
import { formatCurrency, formatDate } from "@/utils/format";
import { matchesDateFilter } from "@/utils/dateFilter";
import type { SalaryPayment } from "@/types";

const columnHelper = createColumnHelper<SalaryPayment>();

export default function SalaryPaymentsPage() {
  const { data, isLoading, error, refetch } = useSalaryPayments();
  const payments = data?.rows ?? [];
  const { currency } = useSettings();
  const [methodFilter, setMethodFilter] = useState("all");
  const [dateMode, setDateMode] = useState<DateFilterMode>("all");
  const [day, setDay] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(
    () =>
      payments.filter((p) => {
        if (methodFilter !== "all" && p.paymentMethod !== methodFilter) return false;
        return matchesDateFilter(p.paymentDate, { mode: dateMode, date: day, from, to });
      }),
    [payments, methodFilter, dateMode, day, from, to]
  );

  const total = useMemo(() => filtered.reduce((s, p) => s + Number(p.amount), 0), [filtered]);

  const columns = useMemo<ColumnDef<SalaryPayment, any>[]>(
    () => [
      columnHelper.accessor("paymentNumber", {
        header: "Reference",
        cell: (info) => <span className="font-mono text-xs font-bold text-brand-600">{info.getValue()}</span>,
      }),
      columnHelper.accessor("fullName", {
        header: "Employee",
        cell: (info) => (
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-100">{info.getValue()}</p>
            <p className="text-xs text-slate-400">{info.row.original.chargeNumber}</p>
          </div>
        ),
      }),
      columnHelper.accessor("paymentDate", {
        header: "Date",
        cell: (info) => <span className="text-sm text-slate-500">{formatDate(info.getValue())}</span>,
      }),
      columnHelper.accessor("institution", {
        header: "Account",
        cell: (info) => <span className="text-sm text-slate-500">{info.getValue() || "—"}</span>,
      }),
      columnHelper.accessor("paymentMethod", {
        header: "Method",
        cell: (info) => <span className="text-sm">{info.getValue()}</span>,
      }),
      columnHelper.accessor("amount", {
        header: "Amount",
        cell: (info) => (
          <span className="font-mono font-bold text-slate-900 dark:text-white">
            {formatCurrency(info.getValue(), currency)}
          </span>
        ),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => <Badge className={PAYMENT_STATUS_STYLES[info.getValue()] ?? ""}>{info.getValue()}</Badge>,
      }),
    ],
    [currency]
  );

  return (
    <div className="space-y-6">
      <HrTabs />
      <PageHeader title="Salary payments" subtitle="Cash outflows posted against salary charges." />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Payments" value={String(filtered.length)} icon={<Receipt className="h-5 w-5" />} loading={isLoading} />
        <StatCard label="Total paid" value={formatCurrency(total, currency)} icon={<Banknote className="h-5 w-5" />} loading={isLoading} />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={isLoading}
        error={error ? String(error) : undefined}
        onRetry={() => refetch()}
        searchPlaceholder="Search salary payments…"
        emptyTitle="No salary payments yet"
        emptyDescription="Pay a salary charge to see it here and on the ledger."
        getRowId={(row) => String(row.salaryPaymentId)}
        toolbar={
          <FilterBar>
            <Select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              options={[
                { value: "all", label: "All methods" },
                ...PAYMENT_METHODS.map((m) => ({ value: m, label: m })),
              ]}
              className="w-auto min-w-[9.5rem]"
            />
            <DateRangeFilter
              mode={dateMode}
              onModeChange={setDateMode}
              date={day}
              from={from}
              to={to}
              onDateChange={setDay}
              onFromChange={setFrom}
              onToChange={setTo}
            />
          </FilterBar>
        }
      />
    </div>
  );
}
