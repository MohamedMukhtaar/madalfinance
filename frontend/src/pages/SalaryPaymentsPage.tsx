import { useMemo } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { Banknote, Receipt } from "lucide-react";
import { DataTable } from "@/components/tables/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge, StatCard } from "@/components/ui";
import { useSalaryPayments } from "@/hooks/queries";
import { useSettings } from "@/context/SettingsContext";
import { PAYMENT_STATUS_STYLES } from "@/utils/constants";
import { formatCurrency, formatDate } from "@/utils/format";
import type { SalaryPayment } from "@/types";

const columnHelper = createColumnHelper<SalaryPayment>();

export default function SalaryPaymentsPage() {
  const { data, isLoading, error, refetch } = useSalaryPayments();
  const payments = data?.rows ?? [];
  const { currency } = useSettings();

  const total = useMemo(() => payments.reduce((s, p) => s + Number(p.amount), 0), [payments]);

  const columns = useMemo<ColumnDef<SalaryPayment>[]>(
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
      <PageHeader title="Salary payments" subtitle="Cash outflows posted against salary charges." />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Payments" value={String(payments.length)} icon={<Receipt className="h-5 w-5" />} loading={isLoading} />
        <StatCard label="Total paid" value={formatCurrency(total, currency)} icon={<Banknote className="h-5 w-5" />} loading={isLoading} />
      </div>

      <DataTable
        columns={columns}
        data={payments}
        loading={isLoading}
        error={error ? String(error) : undefined}
        onRetry={() => refetch()}
        searchPlaceholder="Search salary payments…"
        emptyTitle="No salary payments yet"
        emptyDescription="Pay a salary charge to see it here and on the ledger."
        getRowId={(row) => String(row.salaryPaymentId)}
      />
    </div>
  );
}
