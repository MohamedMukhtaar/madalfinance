import { useMemo, useState } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { Paperclip, Plus, Receipt, Trash2, TrendingDown, UploadCloud } from "lucide-react";
import { DataTable } from "@/components/tables/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge, DateRangeFilter, type DateFilterMode, StatCard, Select, Modal, FileUpload, ErrorState, promptDeleteReason, type UploadedFile } from "@/components/ui";
import { DonutChart } from "@/components/charts/Charts";
import { ChartCard } from "@/components/charts/Charts";
import { ExpenseFormModal } from "@/features/expenses/ExpenseFormModal";
import { useDeleteExpense, useExpenses } from "@/hooks/queries";
import { useSettings } from "@/context/SettingsContext";
import { formatCurrency, formatDate, formatTime } from "@/utils/format";
import { matchesDateFilter } from "@/utils/dateFilter";
import { EXPENSE_CATEGORY_COLORS } from "@/utils/constants";
import { cn } from "@/utils/cn";
import type { Expense } from "@/types";
import toast from "react-hot-toast";

const columnHelper = createColumnHelper<Expense>();

const methodStyles: Record<string, string> = {
  Cash: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-500/30",
  Bank: "bg-secondary-50 text-primary ring-secondary-200 dark:bg-secondary-500/10 dark:text-secondary-300 dark:ring-secondary-500/30",
  "EVC Plus": "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
};

export default function ExpensesPage() {
  const { data, isLoading, error, refetch } = useExpenses();
  const expenses = data?.rows ?? [];
  const deleteMutation = useDeleteExpense();
  const { currency } = useSettings();
  const [modalOpen, setModalOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [receiptFor, setReceiptFor] = useState<Expense | undefined>();
  const [receipts, setReceipts] = useState<Record<number, UploadedFile[]>>({});
  const [dateMode, setDateMode] = useState<DateFilterMode>("all");
  const [day, setDay] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(
    () =>
      expenses.filter(
        (e) =>
          (categoryFilter === "all" || e.categoryName === categoryFilter) &&
          matchesDateFilter(e.expenseDate, { mode: dateMode, date: day, from, to })
      ),
    [expenses, categoryFilter, dateMode, day, from, to]
  );

  const totals = useMemo(() => {
    const now = new Date();
    const thisMonth = expenses.filter((e) => {
      const d = new Date(e.expenseDate);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    return {
      total: expenses.reduce((s, e) => s + e.amount, 0),
      thisMonth: thisMonth.reduce((s, e) => s + e.amount, 0),
      categories: new Set(expenses.map((e) => e.categoryName)).size,
      largest: expenses.length ? Math.max(...expenses.map((e) => e.amount)) : 0,
    };
  }, [expenses]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach((e) => map.set(e.categoryName, (map.get(e.categoryName) ?? 0) + e.amount));
    return [...map.entries()].map(([name, value]) => ({
      name,
      value: Math.round(value),
      color: EXPENSE_CATEGORY_COLORS[name] ?? "#64748b",
    }));
  }, [expenses]);

  const categories = useMemo(
    () => [...new Set(expenses.map((e) => e.categoryName))],
    [expenses]
  );

  const columns = useMemo<ColumnDef<Expense, any>[]>(
    () => [
      columnHelper.accessor("categoryName", {
        header: "Category",
        cell: (info) => {
          const name = info.getValue();
          return (
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: EXPENSE_CATEGORY_COLORS[name] ?? "#64748b" }} />
              <span className="font-semibold text-slate-800 dark:text-slate-100">{name}</span>
            </div>
          );
        },
      }),
      columnHelper.accessor("description", {
        header: "Description",
        cell: (info) => <span className="max-w-[14rem] truncate text-slate-500 dark:text-slate-400">{info.getValue()}</span>,
      }),
      columnHelper.accessor("amount", {
        header: "Amount",
        cell: (info) => (
          <span className="font-mono font-bold text-slate-900 dark:text-white">−{formatCurrency(info.getValue(), currency)}</span>
        ),
      }),
      columnHelper.accessor("paymentMethod", {
        header: "Method",
        cell: (info) => <Badge className={methodStyles[info.getValue()]}>{info.getValue()}</Badge>,
      }),
      columnHelper.accessor("referenceNumber", {
        header: "Reference",
        cell: (info) => <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{info.getValue()}</span>,
      }),
      columnHelper.accessor("expenseDate", {
        header: "Date",
        cell: (info) => <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(info.getValue())}</span>,
      }),
      columnHelper.display({
        id: "time",
        header: "Time",
        cell: (info) => <span className="text-xs text-slate-500 dark:text-slate-400">{formatTime(info.row.original.createdAt ?? info.row.original.expenseDate)}</span>,
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: () => null,
      }),
    ],
    [currency]
  );

  const handleUpload = (e: Expense) => {
    if ((receipts[e.expenseId] ?? []).length === 0) {
      toast.error("Please select a receipt image");
      return;
    }
    toast.success(`Receipt uploaded for ${e.description}`);
    setReceiptFor(undefined);
  };

  if (error) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        subtitle="Track every expense, category and receipt."
        actions={
          <Button onClick={() => setModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
            Add Expense
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard index={0} loading={isLoading} label="Total Expenses" value={formatCurrency(totals.total, currency)} icon={<Receipt className="h-5 w-5" />} iconClassName="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" />
        <StatCard index={1} loading={isLoading} label="This Month" value={formatCurrency(totals.thisMonth, currency)} icon={<Receipt className="h-5 w-5" />} iconClassName="bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400" />
        <StatCard index={2} loading={isLoading} label="Categories" value={String(totals.categories)} icon={<TrendingDown className="h-5 w-5" />} iconClassName="bg-secondary-50 text-primary dark:bg-secondary-500/10 dark:text-secondary-300" />
        <StatCard index={3} loading={isLoading} label="Largest Expense" value={formatCurrency(totals.largest, currency)} icon={<TrendingDown className="h-5 w-5" />} iconClassName="bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard title="Spending by Category" subtitle="Distribution across expense categories" className="xl:col-span-1">
          <DonutChart
            data={byCategory}
            centerValue={formatCurrency(byCategory.reduce((s, d) => s + d.value, 0), currency)}
            centerLabel="Total"
            height={250}
            loading={!expenses}
          />
        </ChartCard>
        <div className="xl:col-span-2">
          <DataTable
            columns={columns}
            data={filtered}
            loading={isLoading}
            searchPlaceholder="Search expenses…"
            toolbar={
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  options={[{ value: "all", label: "All categories" }, ...categories.map((c) => ({ value: c, label: c }))]}
                  className="w-44"
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
            actions={(row) => [
              {
                label: "Upload Receipt Image",
                icon: <UploadCloud className="h-4 w-4" />,
                onClick: () => {
                  setReceipts((r) => ({ ...r, [row.expenseId]: [] }));
                  setReceiptFor(row);
                },
              },
              { divider: true },
              {
                label: "Delete",
                icon: <Trash2 className="h-4 w-4" />,
                danger: true,
                onClick: async () => {
                  const reason = await promptDeleteReason({
                    title: "Delete expense?",
                    text: "This expense will be reversed on the ledger and moved to Trash.",
                  });
                  if (reason) deleteMutation.mutate({ id: row.expenseId, reason });
                },
              },
            ]}
          />
        </div>
      </div>

      <ExpenseFormModal open={modalOpen} onClose={() => setModalOpen(false)} />

      <Modal
        open={!!receiptFor}
        onClose={() => setReceiptFor(undefined)}
        title="Upload Receipt Image"
        subtitle={receiptFor ? `${receiptFor.description} · ${formatCurrency(receiptFor.amount, currency)}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setReceiptFor(undefined)}>Cancel</Button>
            <Button onClick={() => receiptFor && handleUpload(receiptFor)} leftIcon={<Paperclip className="h-4 w-4" />}>
              Upload receipt
            </Button>
          </>
        }
      >
        <FileUpload
          value={receipts[receiptFor?.expenseId ?? 0] ?? []}
          onChange={(files) => receiptFor && setReceipts((r) => ({ ...r, [receiptFor.expenseId]: files }))}
          accept="image/*,.pdf"
        />
      </Modal>
    </div>
  );
}
