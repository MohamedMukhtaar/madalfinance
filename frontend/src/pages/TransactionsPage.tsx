import { useMemo, useState } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { ArrowDownRight, ArrowUpRight, ArrowLeftRight } from "lucide-react";
import { DataTable } from "@/components/tables/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { DateRangeFilter, type DateFilterMode, StatCard, StatCardsGrid, MonthNavigator, Select, Badge, ErrorState } from "@/components/ui";
import { useTransactions } from "@/hooks/queries";
import { useSelectedMonth } from "@/hooks/useSelectedMonth";
import { useSettings } from "@/context/SettingsContext";
import { formatCurrency, formatDate, formatTime } from "@/utils/format";
import { matchesDateFilter } from "@/utils/dateFilter";
import { matchesMonth } from "@/utils/monthFilter";
import { cn } from "@/utils/cn";
import type { LedgerTransaction } from "@/types";

const columnHelper = createColumnHelper<LedgerTransaction>();

export default function TransactionsPage() {
  const { data, isLoading, error, refetch } = useTransactions();
  const txns = data?.rows ?? [];
  const { currency } = useSettings();
  const { month, setMonth } = useSelectedMonth();
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateMode, setDateMode] = useState<DateFilterMode>("all");
  const [day, setDay] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(
    () =>
      txns.filter((t) => {
        if (typeFilter !== "all" && t.transactionType !== typeFilter) return false;
        if (!matchesMonth(t.transactionDate, month)) return false;
        if (!matchesDateFilter(t.transactionDate, { mode: dateMode, date: day, from, to })) return false;
        return true;
      }),
    [txns, typeFilter, month, dateMode, day, from, to]
  );

  const totals = useMemo(() => {
    const base = txns.filter((t) => matchesMonth(t.transactionDate, month));
    return {
      income: base.filter((t) => t.transactionType === "Income").reduce((s, t) => s + t.income, 0),
      expense: base.filter((t) => t.transactionType === "Expense").reduce((s, t) => s + t.expense, 0),
      net: base.reduce((s, t) => s + t.income - t.expense, 0),
    };
  }, [txns, month]);

  const columns = useMemo<ColumnDef<LedgerTransaction, any>[]>(
    () => [
      columnHelper.accessor("transactionDate", {
        header: "Date",
        cell: (info) => <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{formatDate(info.getValue())}</span>,
      }),
      columnHelper.display({
        id: "time",
        header: "Time",
        cell: (info) => <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{formatTime(info.row.original.createdAt ?? info.row.original.transactionDate)}</span>,
      }),
      columnHelper.accessor("transactionType", {
        header: "Type",
        cell: (info) => {
          const type = info.getValue();
          return (
            <Badge
              className={
                type === "Income"
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30"
                  : "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30"
              }
              dot
            >
              {type}
            </Badge>
          );
        },
      }),
      columnHelper.accessor("referenceType", {
        header: "Reference",
        cell: (info) => (
          <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            #{info.getValue().replace(/\s/g, "-")} · {info.row.original.referenceId}
          </span>
        ),
      }),
      columnHelper.accessor("description", {
        header: "Description",
        cell: (info) => <span className="max-w-[18rem] truncate font-medium text-slate-700 dark:text-slate-200">{info.getValue()}</span>,
      }),
      columnHelper.accessor("income", {
        header: "Income",
        cell: (info) =>
          info.getValue() > 0 ? (
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">+{formatCurrency(info.getValue(), currency)}</span>
          ) : (
            <span className="text-slate-300 dark:text-slate-700">—</span>
          ),
      }),
      columnHelper.accessor("expense", {
        header: "Expense",
        cell: (info) =>
          info.getValue() > 0 ? (
            <span className="font-mono font-bold text-slate-700 dark:text-slate-200">−{formatCurrency(info.getValue(), currency)}</span>
          ) : (
            <span className="text-slate-300 dark:text-slate-700">—</span>
          ),
      }),
      columnHelper.accessor("balanceAfter", {
        header: "Balance",
        cell: (info) => <span className="font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(info.getValue(), currency)}</span>,
      }),
    ],
    [currency]
  );

  if (error) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        subtitle="The complete ledger — every income and expense, in order."
        actions={<MonthNavigator value={month} onChange={setMonth} />}
      />

      <StatCardsGrid className="sm:grid-cols-3 xl:grid-cols-3">
        <StatCard index={0} loading={isLoading} label="Income" value={formatCurrency(totals.income, currency)} icon={<ArrowUpRight className="h-4 w-4" />} iconClassName="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" />
        <StatCard index={1} loading={isLoading} label="Expenses" value={formatCurrency(totals.expense, currency)} icon={<ArrowDownRight className="h-4 w-4" />} iconClassName="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" />
        <StatCard index={2} loading={isLoading} label="Net" value={formatCurrency(totals.net, currency)} icon={<ArrowLeftRight className="h-4 w-4" />} iconClassName="bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400" />
      </StatCardsGrid>

      <DataTable
        columns={columns}
        data={filtered}
        loading={isLoading}
        searchPlaceholder="Search transactions…"
        pageSize={12}
        initialSorting={[{ id: "transactionDate", desc: false }]}
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              options={[
                { value: "all", label: "All types" },
                { value: "Income", label: "Income" },
                { value: "Expense", label: "Expense" },
              ]}
              className="w-36"
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
          </div>
        }
        className={cn(filtered.length > 0 && "overflow-hidden")}
      />
    </div>
  );
}
