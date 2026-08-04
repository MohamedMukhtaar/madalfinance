import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Download,
  FileDown,
  FileSpreadsheet,
  PieChart,
  Receipt,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DateRangeFilter, type DateFilterMode, Skeleton } from "@/components/ui";
import {
  RevenueAreaChart,
  CashFlowComposedChart,
  IncomeExpenseBarChart,
  DonutChart,
  ChartCard,
} from "@/components/charts/Charts";
import { Progress } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";
import {
  useCashFlowReport,
  useContributionReport,
  useDues,
  useExpenseByCategoryReport,
  useIncomeStatement,
  useMonthlyRevenueReport,
  useOutstandingCustomersReport,
} from "@/hooks/queries";
import { useSettings } from "@/context/SettingsContext";
import { formatCurrency, formatCompactCurrency } from "@/utils/format";
import { matchesDateFilter } from "@/utils/dateFilter";
import { cn } from "@/utils/cn";
import { financeService } from "@/services/finance";
import { api, getErrorMessage } from "@/services/api";
import { DUE_STATUS_STYLES } from "@/utils/constants";
import toast from "react-hot-toast";

const VIEWS = [
  { id: "customers", label: "Customers", path: "/reports/customers" },
  { id: "expenses", label: "Expenses", path: "/reports/expenses" },
  { id: "members", label: "Members", path: "/reports/members" },
  { id: "income-statement", label: "Income Statement", path: "/reports/income-statement" },
] as const;

type ViewId = (typeof VIEWS)[number]["id"];

const CHART_PALETTE = ["#74bcf8", "#101848", "#4aa6ef", "#10b981", "#f59e0b", "#1a255c", "#f43f5e", "#14b8a6"];

function resolveView(param?: string): ViewId {
  if (param === "customers" || param === "expenses" || param === "members" || param === "income-statement") {
    return param;
  }
  return "customers";
}

function monthLabel(ym: string) {
  if (!ym || !ym.includes("-")) return ym;
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short" });
}

function asRows<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && Array.isArray((data as { rows?: unknown[] }).rows)) {
    return (data as { rows: T[] }).rows;
  }
  return [];
}

export default function ReportsPage() {
  const { view: viewParam } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const view = resolveView(viewParam ?? searchParams.get("view") ?? undefined);
  const { currency } = useSettings();

  const [dateMode, setDateMode] = useState<DateFilterMode>("all");
  const [day, setDay] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const reportParams = useMemo(() => {
    if (dateMode === "day" && day) return { fromDate: day, toDate: day };
    if (dateMode === "range") {
      return {
        ...(from ? { fromDate: from } : {}),
        ...(to ? { toDate: to } : {}),
      };
    }
    return undefined;
  }, [dateMode, day, from, to]);

  const { data: income, isLoading: incomeLoading } = useIncomeStatement(reportParams);
  const { data: customers, isLoading: customersLoading } = useOutstandingCustomersReport(reportParams);
  const { data: expenses, isLoading: expensesLoading } = useExpenseByCategoryReport(reportParams);
  const { data: monthly, isLoading: monthlyLoading } = useMonthlyRevenueReport({ months: 12, ...reportParams });
  const { data: cashFlow, isLoading: cashFlowLoading } = useCashFlowReport(reportParams);
  const { data: duesData } = useDues();
  const batches = duesData?.rows ?? [];
  const batchId = Number(searchParams.get("batchId")) || batches[0]?.batchId;
  const { data: contribution, isLoading: contributionLoading } = useContributionReport(batchId);

  const statement = income as { totalIncome?: number; totalExpense?: number; netProfit?: number } | undefined;

  const monthlyChart = useMemo(() => {
    return asRows<{ month: string; income: number; expense: number; net?: number }>(monthly).map((row) => {
      const incomeVal = Number(row.income) || 0;
      const expenseVal = Number(row.expense) || 0;
      return {
        month: monthLabel(String(row.month)),
        income: incomeVal,
        expense: expenseVal,
        profit: Number(row.net ?? incomeVal - expenseVal),
        inflow: incomeVal,
        outflow: expenseVal,
        net: Number(row.net ?? incomeVal - expenseVal),
      };
    });
  }, [monthly]);

  const cashChart = useMemo(() => {
    return asRows<{ month: string; inflow: number; outflow: number; net?: number }>(cashFlow).map((row) => {
      const inflow = Number(row.inflow) || 0;
      const outflow = Number(row.outflow) || 0;
      return {
        month: monthLabel(String(row.month)),
        inflow,
        outflow,
        net: Number(row.net ?? inflow - outflow),
        income: inflow,
        expense: outflow,
      };
    });
  }, [cashFlow]);

  const customerRowsRaw = asRows<Record<string, unknown>>(customers);
  const expenseRows = asRows<{ categoryName: string; total: number; count: number }>(expenses);

  const customerRows = useMemo(
    () =>
      customerRowsRaw.filter((c) =>
        matchesDateFilter(String(c.asOfDate ?? c.updatedAt ?? c.createdAt ?? ""), {
          mode: dateMode,
          date: day,
          from,
          to,
        })
      ),
    [customerRowsRaw, dateMode, day, from, to]
  );

  const contributionData = contribution as {
    summary?: {
      expected?: number;
      collected?: number;
      totalDues?: number;
      pending?: number;
      partial?: number;
      paid?: number;
      month?: number;
      year?: number;
    };
    dues?: Array<{
      dueId?: number;
      memberName?: string;
      amount?: number;
      paidAmount?: number;
      status?: string;
    }>;
  } | undefined;

  const expenseChart = useMemo(
    () =>
      expenseRows
        .filter((row) => Number(row.total) > 0)
        .map((row, index) => ({
          name: row.categoryName,
          value: Number(row.total) || 0,
          count: Number(row.count) || 0,
          color: CHART_PALETTE[index % CHART_PALETTE.length],
        })),
    [expenseRows]
  );

  const totalExpenseCats = expenseChart.reduce((s, d) => s + d.value, 0);
  const expenseTxnCount = expenseChart.reduce((s, d) => s + d.count, 0);
  const topCategory = expenseChart[0];

  const customerChart = useMemo(
    () =>
      customerRows.slice(0, 8).map((c, index) => ({
        name: String(c.customerName ?? "Customer").slice(0, 18),
        value: Number(c.outstanding) || 0,
        color: CHART_PALETTE[index % CHART_PALETTE.length],
      })),
    [customerRows]
  );
  const totalOutstanding = customerRows.reduce((s, c) => s + (Number(c.outstanding) || 0), 0);

  const memberStatusChart = useMemo(() => {
    const s = contributionData?.summary;
    return [
      { name: "Paid", value: Number(s?.paid ?? 0), color: "#10b981" },
      { name: "Partial", value: Number(s?.partial ?? 0), color: "#f59e0b" },
      { name: "Pending", value: Number(s?.pending ?? 0), color: "#f43f5e" },
    ].filter((d) => d.value > 0);
  }, [contributionData]);

  const memberCollectionPct = Number(contributionData?.summary?.expected)
    ? Math.round(
        (Number(contributionData?.summary?.collected) / Number(contributionData?.summary?.expected)) * 100
      )
    : 0;

  const netProfit = Number(statement?.netProfit ?? 0);
  const totalIncome = Number(statement?.totalIncome ?? 0);
  const totalExpense = Number(statement?.totalExpense ?? 0);
  const marginPct = totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0;

  const exportReport = async (kind: string, format: "pdf" | "xlsx") => {
    try {
      const url = await financeService.exportReportUrl(kind, format, {
        ...(batchId ? { batchId } : {}),
        ...reportParams,
      });
      const response = await api.get(url.replace(/^\/api/, ""), {
        responseType: "blob",
        timeout: 60000,
      });

      const contentType = String(response.headers["content-type"] ?? "");
      if (contentType.includes("application/json")) {
        const text = await (response.data as Blob).text();
        const parsed = JSON.parse(text) as { message?: string };
        throw new Error(parsed.message || "Export failed");
      }

      const extension = format === "pdf" ? "pdf" : "xlsx";
      const blobUrl = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${kind}-${new Date().toISOString().slice(0, 10)}.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
      toast.success(`${format === "pdf" ? "PDF" : "Excel"} downloaded`);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to export report"));
    }
  };

  const exportKind =
    view === "customers"
      ? "outstandingCustomers"
      : view === "expenses"
        ? "expenseByCategory"
        : view === "members"
          ? "contributionReport"
          : "incomeStatement";

  const periodHint =
    dateMode === "day" && day
      ? day
      : dateMode === "range" && (from || to)
        ? `${from || "…"} → ${to || "…"}`
        : "All time";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Analyse finances with live charts and filtered periods."
        actions={
          <>
            <Button variant="secondary" onClick={() => exportReport(exportKind, "pdf")} leftIcon={<FileDown className="h-4 w-4" />}>
              PDF
            </Button>
            <Button variant="secondary" onClick={() => exportReport(exportKind, "xlsx")} leftIcon={<FileSpreadsheet className="h-4 w-4" />}>
              Excel
            </Button>
          </>
        }
      />

      {/* Summary strip — invoice-detail style */}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-wrap gap-2">
            {VIEWS.map((v) => (
              <Button key={v.id} size="sm" variant={view === v.id ? "primary" : "secondary"} onClick={() => navigate(v.path)}>
                {v.label}
              </Button>
            ))}
          </div>
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
        <div className="grid grid-cols-2 gap-px bg-slate-100 dark:bg-slate-800 sm:grid-cols-4">
          <SummaryCell label="Report" value={VIEWS.find((v) => v.id === view)?.label ?? "—"} />
          <SummaryCell label="Period" value={periodHint} />
          <SummaryCell
            label={view === "expenses" ? "Total spend" : view === "customers" ? "Outstanding" : view === "members" ? "Collected" : "Income"}
            value={
              view === "expenses"
                ? formatCurrency(totalExpenseCats, currency)
                : view === "customers"
                  ? formatCurrency(totalOutstanding, currency)
                  : view === "members"
                    ? formatCurrency(Number(contributionData?.summary?.collected ?? 0), currency)
                    : formatCurrency(totalIncome, currency)
            }
            valueClass="text-brand-700 dark:text-brand-400"
          />
          <SummaryCell
            label={view === "income-statement" ? "Net profit" : view === "members" ? "Collection rate" : "Records"}
            value={
              view === "income-statement"
                ? formatCurrency(netProfit, currency)
                : view === "members"
                  ? `${memberCollectionPct}%`
                  : view === "expenses"
                    ? String(expenseTxnCount)
                    : String(customerRows.length)
            }
            valueClass={
              view === "income-statement"
                ? netProfit >= 0
                  ? "text-emerald-600"
                  : "text-rose-600"
                : undefined
            }
          />
        </div>
      </Card>

      {view === "income-statement" && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ReportStat index={0} label="Total Income" value={formatCurrency(totalIncome, currency)} icon={<TrendingUp className="h-5 w-5" />} className="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" loading={incomeLoading} />
            <ReportStat index={1} label="Total Expenses" value={formatCurrency(totalExpense, currency)} icon={<TrendingDown className="h-5 w-5" />} className="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" loading={incomeLoading} />
            <ReportStat index={2} label="Net Profit" value={formatCurrency(netProfit, currency)} icon={<Wallet className="h-5 w-5" />} className="bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400" loading={incomeLoading} />
            <ReportStat index={3} label="Margin" value={`${marginPct}%`} icon={<PieChart className="h-5 w-5" />} className="bg-navy/10 text-navy dark:bg-brand-500/10 dark:text-brand-300" loading={incomeLoading} />
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <ChartCard title="Revenue trend" subtitle="Income vs expenses over recent months" className="xl:col-span-2">
              <RevenueAreaChart data={monthlyChart} currency={currency} height={300} loading={monthlyLoading} />
            </ChartCard>
            <ChartCard title="Expense mix" subtitle="Where spend goes">
              <DonutChart
                data={expenseChart.slice(0, 6)}
                centerValue={formatCompactCurrency(totalExpense || totalExpenseCats, currency)}
                centerLabel="Expenses"
                height={260}
                loading={expensesLoading}
              />
            </ChartCard>
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <ChartCard title="Cash flow" subtitle="Inflow, outflow and net" className="xl:col-span-2">
              <CashFlowComposedChart data={cashChart.length ? cashChart : monthlyChart} currency={currency} height={280} loading={cashFlowLoading} />
            </ChartCard>
            <ChartCard title="Income vs expense" subtitle="Monthly comparison">
              <IncomeExpenseBarChart data={monthlyChart} currency={currency} height={280} />
            </ChartCard>
          </div>
        </>
      )}

      {view === "expenses" && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <ReportStat index={0} label="Total Expenses" value={formatCurrency(totalExpenseCats, currency)} icon={<Receipt className="h-5 w-5" />} className="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" loading={expensesLoading} />
            <ReportStat index={1} label="Categories" value={String(expenseChart.length)} icon={<PieChart className="h-5 w-5" />} className="bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400" loading={expensesLoading} />
            <ReportStat index={2} label="Top category" value={topCategory?.name ?? "—"} icon={<TrendingUp className="h-5 w-5" />} className="bg-navy/10 text-navy dark:bg-brand-500/10 dark:text-brand-300" loading={expensesLoading} />
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <ChartCard title="Spend by category" subtitle="Share of total expenses" className="xl:col-span-1">
              <DonutChart
                data={expenseChart.slice(0, 8)}
                centerValue={formatCompactCurrency(totalExpenseCats, currency)}
                centerLabel="Total"
                height={280}
                loading={expensesLoading}
              />
            </ChartCard>
            <ChartCard title="Category ranking" subtitle="Largest spend first" className="xl:col-span-2">
              {expensesLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : expenseChart.length === 0 ? (
                <p className="py-16 text-center text-sm text-slate-400">No expenses in this period.</p>
              ) : (
                <div className="space-y-3">
                  {expenseChart.map((row) => {
                    const pct = totalExpenseCats ? Math.round((row.value / totalExpenseCats) * 100) : 0;
                    return (
                      <div key={row.name} className="rounded-xl bg-slate-50/80 px-4 py-3 dark:bg-slate-800/40">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
                            <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{row.name}</span>
                            <span className="text-xs text-slate-400">{row.count} txns</span>
                          </div>
                          <div className="flex shrink-0 items-baseline gap-2">
                            <span className="text-xs font-medium text-slate-400">{pct}%</span>
                            <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                              {formatCurrency(row.value, currency)}
                            </span>
                          </div>
                        </div>
                        <Progress value={pct} color="bg-brand-500" />
                      </div>
                    );
                  })}
                </div>
              )}
            </ChartCard>
          </div>
          <Card>
            <CardHeader
              title="Expense detail"
              subtitle="Category totals for the selected period"
              action={
                <Button size="sm" variant="secondary" onClick={() => exportReport("expenseByCategory", "xlsx")}>
                  Export
                </Button>
              }
            />
            <div className="overflow-x-auto p-3">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2 text-right">Share</th>
                    <th className="px-3 py-2 text-right">Transactions</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {expenseChart.map((expense) => (
                    <tr key={expense.name} className="text-slate-600 dark:text-slate-300">
                      <td className="px-3 py-2.5 font-medium">
                        <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: expense.color }} />
                        {expense.name}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono">
                        {totalExpenseCats ? Math.round((expense.value / totalExpenseCats) * 100) : 0}%
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono">{expense.count}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold">{formatCurrency(expense.value, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!expensesLoading && expenseChart.length === 0 && (
                <p className="px-5 py-8 text-center text-sm text-slate-400">No expense data for this period.</p>
              )}
            </div>
          </Card>
        </>
      )}

      {view === "customers" && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <ReportStat index={0} label="Customers owing" value={String(customerRows.length)} icon={<Users className="h-5 w-5" />} className="bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400" loading={customersLoading} />
            <ReportStat index={1} label="Total outstanding" value={formatCurrency(totalOutstanding, currency)} icon={<Wallet className="h-5 w-5" />} className="bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400" loading={customersLoading} />
            <ReportStat
              index={2}
              label="Largest balance"
              value={formatCurrency(Number(customerRows[0]?.outstanding ?? 0), currency)}
              icon={<TrendingUp className="h-5 w-5" />}
              className="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
              loading={customersLoading}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <ChartCard title="Outstanding mix" subtitle="Top balances by customer">
              <DonutChart
                data={customerChart}
                centerValue={formatCompactCurrency(totalOutstanding, currency)}
                centerLabel="Owed"
                height={260}
                loading={customersLoading}
              />
            </ChartCard>
            <Card className="xl:col-span-2">
              <CardHeader
                title="Outstanding customers"
                subtitle="Who owes the most"
                action={
                  <Button size="sm" variant="secondary" onClick={() => exportReport("outstandingCustomers", "xlsx")}>
                    Export
                  </Button>
                }
              />
              <div className="divide-y divide-slate-100 p-2 dark:divide-slate-800">
                {customerRows.map((c) => {
                  const max = Number(customerRows[0]?.outstanding ?? 1) || 1;
                  const amt = Number(c.outstanding) || 0;
                  return (
                    <div key={String(c.customerId ?? c.customer_id)} className="flex items-center gap-4 px-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{String(c.customerName)}</p>
                        <p className="text-xs text-slate-400">{String(c.customerCode ?? "")}</p>
                        <div className="mt-2 hidden sm:block">
                          <Progress value={(amt / max) * 100} color="bg-rose-500" />
                        </div>
                      </div>
                      <p className="w-28 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                        {formatCurrency(amt, currency)}
                      </p>
                    </div>
                  );
                })}
                {!customersLoading && customerRows.length === 0 && (
                  <p className="px-5 py-8 text-center text-sm text-slate-400">All customers are settled. Nice work!</p>
                )}
              </div>
            </Card>
          </div>
        </>
      )}

      {view === "members" && (
        <>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Due batch</span>
            <select
              className="rounded-xl border-0 bg-white px-3 py-2 text-sm font-medium text-slate-800 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700"
              value={batchId || ""}
              onChange={(e) => {
                const next = new URLSearchParams(searchParams);
                next.set("batchId", e.target.value);
                setSearchParams(next);
              }}
            >
              {batches.map((b) => (
                <option key={b.batchId} value={b.batchId}>
                  {new Date(b.year, b.month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ReportStat index={0} label="Expected" value={formatCurrency(Number(contributionData?.summary?.expected ?? 0), currency)} icon={<Wallet className="h-5 w-5" />} className="bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400" loading={contributionLoading} />
            <ReportStat index={1} label="Collected" value={formatCurrency(Number(contributionData?.summary?.collected ?? 0), currency)} icon={<TrendingUp className="h-5 w-5" />} className="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" loading={contributionLoading} />
            <ReportStat index={2} label="Outstanding" value={formatCurrency(Number(contributionData?.summary?.expected ?? 0) - Number(contributionData?.summary?.collected ?? 0), currency)} icon={<TrendingDown className="h-5 w-5" />} className="bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400" loading={contributionLoading} />
            <ReportStat index={3} label="Collection rate" value={`${memberCollectionPct}%`} icon={<Users className="h-5 w-5" />} className="bg-navy/10 text-navy dark:bg-brand-500/10 dark:text-brand-300" loading={contributionLoading} />
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <ChartCard title="Member status" subtitle="Paid, partial and pending dues">
              {contributionLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <DonutChart
                  data={memberStatusChart}
                  centerValue={`${memberCollectionPct}%`}
                  centerLabel="Collected"
                  height={260}
                />
              )}
            </ChartCard>
            <Card className="xl:col-span-2">
              <CardHeader
                title="Collection progress"
                subtitle="Expected vs received for this batch"
                action={
                  <Button size="sm" variant="secondary" onClick={() => exportReport("contributionReport", "xlsx")} leftIcon={<Download className="h-4 w-4" />}>
                    Export
                  </Button>
                }
              />
              <CardBody>
                {contributionLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : (
                  <>
                    <div className="mb-3 flex justify-between text-sm">
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        Collected {formatCurrency(Number(contributionData?.summary?.collected ?? 0), currency)}
                      </span>
                      <span className="text-slate-500">
                        of {formatCurrency(Number(contributionData?.summary?.expected ?? 0), currency)}
                      </span>
                    </div>
                    <Progress value={memberCollectionPct} color="bg-brand-500" className="h-3" />
                    <div className="mt-6 grid grid-cols-3 gap-3">
                      {[
                        { label: "Paid", count: Number(contributionData?.summary?.paid ?? 0), cls: DUE_STATUS_STYLES.Paid },
                        { label: "Partial", count: Number(contributionData?.summary?.partial ?? 0), cls: DUE_STATUS_STYLES.Partial },
                        { label: "Pending", count: Number(contributionData?.summary?.pending ?? 0), cls: DUE_STATUS_STYLES.Pending },
                      ].map((s) => (
                        <div key={s.label} className="rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-800/50">
                          <p className="text-2xl font-bold text-slate-900 dark:text-white">{s.count}</p>
                          <Badge className={cn("mt-2", s.cls)}>{s.label}</Badge>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardBody>
            </Card>
          </div>
          <Card>
            <CardHeader title="Member dues" subtitle={`${contributionData?.dues?.length ?? 0} members in this batch`} />
            <div className="overflow-x-auto p-3">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                    <th className="px-3 py-2">Member</th>
                    <th className="px-3 py-2 text-right">Due</th>
                    <th className="px-3 py-2 text-right">Paid</th>
                    <th className="px-3 py-2 text-right">Balance</th>
                    <th className="px-3 py-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(contributionData?.dues ?? []).map((d, i) => {
                    const due = Number(d.amount) || 0;
                    const paid = Number(d.paidAmount) || 0;
                    const status = String(d.status ?? "Pending") as keyof typeof DUE_STATUS_STYLES;
                    return (
                      <tr key={d.dueId ?? i} className="text-slate-600 dark:text-slate-300">
                        <td className="px-3 py-2.5 font-medium">{d.memberName}</td>
                        <td className="px-3 py-2.5 text-right font-mono">{formatCurrency(due, currency)}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-emerald-600">{formatCurrency(paid, currency)}</td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-rose-600">{formatCurrency(due - paid, currency)}</td>
                        <td className="px-3 py-2.5 text-right">
                          <Badge className={DUE_STATUS_STYLES[status] ?? DUE_STATUS_STYLES.Pending}>{status}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!contributionLoading && !(contributionData?.dues?.length) && (
                <p className="px-5 py-8 text-center text-sm text-slate-400">No dues in this batch.</p>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function SummaryCell({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-white px-4 py-3 dark:bg-slate-900 sm:px-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={cn("mt-1 truncate text-sm font-bold text-slate-900 dark:text-white", valueClass)}>{value}</p>
    </div>
  );
}

function ReportStat({
  label,
  value,
  icon,
  className,
  loading,
  index,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  className: string;
  loading: boolean;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
          {loading ? (
            <Skeleton className="mt-2 h-7 w-28" />
          ) : (
            <p className="mt-1 truncate text-xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
          )}
        </div>
        <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", className)}>{icon}</span>
      </div>
    </motion.div>
  );
}
