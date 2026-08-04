import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CalendarClock,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  FileText,
  FolderKanban,
  KeyRound,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton, SkeletonTable } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/EmptyState";
import {
  ChartCard,
  RevenueAreaChart,
  CashFlowComposedChart,
  IncomeExpenseBarChart,
  DonutChart,
} from "@/components/charts/Charts";
import { useDashboard } from "@/hooks/queries";
import { useSettings } from "@/context/SettingsContext";
import {
  DUE_STATUS_STYLES,
  INVOICE_STATUS_STYLES,
  RENTAL_STATUS_STYLES,
} from "@/utils/constants";
import { formatCurrency, formatDate, formatCompactCurrency } from "@/utils/format";
import { cn } from "@/utils/cn";
import { MonthNavigator } from "@/components/ui/MonthNavigator";

const CATEGORY_COLORS: Record<string, string> = {
  Hosting: "#74bcf8",
  Domain: "#4aa6ef",
  Internet: "#8ecaf9",
  Transport: "#f59e0b",
  Marketing: "#ec4899",
  Office: "#10b981",
  Software: "#101848",
  Equipment: "#f97316",
  Salary: "#22c55e",
  Utilities: "#14b8a6",
  Other: "#64748b",
};

function eColor(name: string): string {
  return CATEGORY_COLORS[name] ?? "#64748b";
}

function useMonthlySeries(
  txns: { transactionDate: string; income: number; expense: number }[] | undefined,
  selected: { year: number; month: number }
) {
  return useMemo(() => {
    const buckets = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(selected.year, selected.month - 1 - (5 - i), 1);
      return {
        key: `${d.getFullYear()}-${d.getMonth()}`,
        month: d.toLocaleDateString("en-US", { month: "short" }),
        income: 0,
        expense: 0,
        profit: 0,
        inflow: 0,
        outflow: 0,
        net: 0,
      };
    });
    txns?.forEach((t) => {
      const d = new Date(t.transactionDate);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = buckets.find((b) => b.key === key);
      if (bucket) {
        bucket.income += Number(t.income) || 0;
        bucket.expense += Number(t.expense) || 0;
        bucket.inflow += Number(t.income) || 0;
        bucket.outflow += Number(t.expense) || 0;
      }
    });
    buckets.forEach((b) => {
      b.income = Math.round(b.income);
      b.expense = Math.round(b.expense);
      b.profit = Math.round(b.income - b.expense);
      b.inflow = Math.round(b.inflow);
      b.outflow = Math.round(b.outflow);
      b.net = Math.round(b.inflow - b.outflow);
    });
    return buckets;
  }, [txns, selected.year, selected.month]);
}

export default function DashboardPage() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  });
  const { data: dash, isLoading: dashLoading, error, refetch } = useDashboard(selectedMonth);
  const { currency } = useSettings();

  const chartTxns = dash?.chartTransactions ?? [];
  const listTxns = dash?.recentTransactions ?? [];
  const payments = dash?.recentPayments ?? [];
  const expenses = dash?.recentExpenses ?? [];
  const rentals = dash?.rentalRenewals ?? [];
  const dueBatches = dash?.dueBatches ?? [];

  const monthly = useMonthlySeries(chartTxns, selectedMonth);

  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>();
    expenses?.forEach((e) => map.set(e.categoryName, (map.get(e.categoryName) ?? 0) + e.amount));
    return [...map.entries()]
      .map(([name, value]) => ({ name, value: Math.round(value), color: eColor(name) }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  const latestTxns = useMemo(() => listTxns.slice(0, 7), [listTxns]);
  const recentPayments = useMemo(() => payments.slice(0, 6), [payments]);
  const recentExpenses = useMemo(() => expenses.slice(0, 5), [expenses]);
  const upcomingRenewals = useMemo(
    () =>
      rentals
        .filter((r) => r.status === "Active")
        .sort((a, b) => new Date(a.nextBillingDate).getTime() - new Date(b.nextBillingDate).getTime())
        .slice(0, 5),
    [rentals]
  );
  const dueSummary = useMemo(() => {
    const batch =
      dueBatches.find((b) => b.year === selectedMonth.year && b.month === selectedMonth.month) ??
      dueBatches[0];
    return {
      month: batch
        ? `${new Date(batch.year, batch.month - 1, 1).toLocaleDateString("en-US", { month: "long" })} ${batch.year}`
        : "—",
      paid: batch?.paid ?? 0,
      partial: batch?.partial ?? 0,
      pending: batch?.pending ?? 0,
    };
  }, [dueBatches, selectedMonth]);

  const monthLabel = new Date(selectedMonth.year, selectedMonth.month - 1, 1).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric" }
  );

  if (error) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  const fmt = (n: number) => formatCurrency(n, currency);
  const compact = (n: number) => formatCompactCurrency(n, currency);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={`Overview for ${monthLabel} — Madal ICT Solutions`}
        actions={<MonthNavigator value={selectedMonth} onChange={setSelectedMonth} />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          index={0}
          loading={dashLoading}
          label="Cash Balance"
          value={compact(dash?.stats.currentBalance ?? 0)}
          icon={<Wallet className="h-5 w-5" />}
          iconClassName="bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
        />
        <StatCard
          index={1}
          loading={dashLoading}
          label="Monthly Income"
          value={compact(dash?.stats.monthIncome ?? 0)}
          icon={<TrendingUp className="h-5 w-5" />}
          iconClassName="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
        />
        <StatCard
          index={2}
          loading={dashLoading}
          label="Monthly Expenses"
          value={compact(dash?.stats.monthExpense ?? 0)}
          icon={<ArrowUpRight className="h-5 w-5" />}
          iconClassName="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
        />
        <StatCard
          index={3}
          loading={dashLoading}
          label="Outstanding"
          value={compact(dash?.stats.totalOutstanding ?? 0)}
          icon={<CircleDollarSign className="h-5 w-5" />}
          iconClassName="bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <MiniStat index={0} label="Open Invoices" value={dash?.stats.openInvoices ?? 0} icon={<FileText className="h-4 w-4" />} link="/invoices" loading={dashLoading} />
        <MiniStat index={1} label="Overdue Invoices" value={dash?.stats.overdueInvoices ?? 0} icon={<FileText className="h-4 w-4" />} link="/invoices" loading={dashLoading} />
        <MiniStat index={2} label="Active Rentals" value={dash?.stats.activeRentals ?? 0} icon={<KeyRound className="h-4 w-4" />} link="/projects/rental" loading={dashLoading} />
        <MiniStat index={3} label="Active Projects" value={dash?.stats.activeProjects ?? 0} icon={<FolderKanban className="h-4 w-4" />} link="/projects" loading={dashLoading} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard
          title="Monthly Revenue"
          subtitle={`Income vs expenses · 6 months ending ${monthLabel}`}
          className="xl:col-span-2"
          action={
            <Link to="/reports/income-statement" className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">
              Full report
            </Link>
          }
        >
          <RevenueAreaChart data={monthly} currency={currency} height={300} loading={dashLoading} />
        </ChartCard>
        <ChartCard title="Expenses by Category" subtitle={`Spend in ${monthLabel}`}>
          <DonutChart
            data={expenseByCategory.slice(0, 6)}
            centerValue={compact(expenseByCategory.reduce((s, d) => s + d.value, 0))}
            centerLabel="Total"
            height={250}
            loading={dashLoading}
          />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard title="Cash Flow" subtitle="Inflows, outflows and net position" className="xl:col-span-2">
          <CashFlowComposedChart data={monthly} currency={currency} height={280} loading={dashLoading} />
        </ChartCard>
        <ChartCard title="Income vs Expense" subtitle="Side-by-side comparison">
          <IncomeExpenseBarChart data={monthly} currency={currency} height={280} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Transactions"
            subtitle={`Entries in ${monthLabel}`}
            action={
              <Link to="/transactions" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">
                View all <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <div className="p-3 sm:p-4">
            {dashLoading ? (
              <SkeletonTable rows={5} cols={5} />
            ) : latestTxns.length === 0 ? (
              <p className="px-2 py-8 text-center text-sm text-slate-400">No transactions this month.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {latestTxns.map((t, i) => (
                  <motion.div
                    key={t.transactionId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3.5 rounded-xl px-2 py-2.5 transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                        t.transactionType === "Income"
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                          : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                      )}
                    >
                      {t.transactionType === "Income" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{t.description}</p>
                      <p className="text-xs text-slate-400">{t.referenceType ?? "—"} · {formatDate(t.transactionDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-sm font-bold", t.transactionType === "Income" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-slate-200")}>
                        {t.transactionType === "Income" ? "+" : "−"}{fmt(t.income || t.expense)}
                      </p>
                      <p className="text-[11px] text-slate-400">Bal {compact(t.balanceAfter)}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Members Due Status"
              subtitle={dueSummary.month}
              action={<Link to="/contributions" className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">View</Link>}
            />
            <CardBody className="pt-4">
              {dashLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Paid", count: dueSummary.paid, cls: DUE_STATUS_STYLES.Paid },
                    { label: "Partial", count: dueSummary.partial, cls: DUE_STATUS_STYLES.Partial },
                    { label: "Pending", count: dueSummary.pending, cls: DUE_STATUS_STYLES.Pending },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800/50">
                      <p className="text-xl font-bold text-slate-900 dark:text-white">{s.count}</p>
                      <Badge className={cn("mt-1.5", s.cls)}>{s.label}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Upcoming Rental Renewals"
              subtitle="Next billing dates"
              action={<Link to="/projects/rental" className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">View</Link>}
            />
            <div className="divide-y divide-slate-100 p-2 dark:divide-slate-800">
              {dashLoading ? (
                <div className="space-y-2 p-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : upcomingRenewals.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-slate-400">No renewals in the next 30 days.</p>
              ) : (
                upcomingRenewals.map((r) => (
                  <div key={r.billingId} className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                      <CalendarClock className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{r.projectName}</p>
                      <p className="text-xs text-slate-400">{r.customerName} · billing day {r.billingDay}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{compact(r.monthlyAmount)}</p>
                      <Badge className={cn("mt-0.5", RENTAL_STATUS_STYLES.Active)} dot>Active</Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Payments"
            subtitle={`Collected in ${monthLabel}`}
            action={<Link to="/payments" className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">View all</Link>}
          />
          <div className="divide-y divide-slate-100 p-2 dark:divide-slate-800">
            {dashLoading ? (
              <SkeletonTable rows={4} cols={4} />
            ) : recentPayments.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-slate-400">No payments this month.</p>
            ) : (
              recentPayments.map((p) => (
                <div key={p.paymentId} className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                    <CreditCard className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{p.customerName}</p>
                    <p className="text-xs text-slate-400">{p.paymentNumber} · {p.paymentMethod} · {formatDate(p.paymentDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">+{fmt(p.amount)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Expenses"
            subtitle={`Recorded in ${monthLabel}`}
            action={<Link to="/expenses" className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">View all</Link>}
          />
          <div className="divide-y divide-slate-100 p-2 dark:divide-slate-800">
            {dashLoading ? (
              <SkeletonTable rows={4} cols={4} />
            ) : recentExpenses.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-slate-400">No expenses this month.</p>
            ) : (
              recentExpenses.map((e) => (
                <div key={e.expenseId} className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                    <Banknote className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{e.description}</p>
                    <p className="text-xs text-slate-400">{e.categoryName} · {formatDate(e.expenseDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">−{fmt(e.amount)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Invoice Status Overview"
          subtitle="Distribution of all invoices"
          action={<Link to="/invoices" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">Manage invoices <ChevronRight className="h-3.5 w-3.5" /></Link>}
        />
        <CardBody className="pt-4">
          {dashLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {(dash?.invoiceStatusCounts ?? []).map(({ status, count }) => (
                <div key={status} className="rounded-xl bg-slate-50 p-4 transition hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800">
                  <div className="flex items-center justify-between">
                    <Badge className={INVOICE_STATUS_STYLES[status as keyof typeof INVOICE_STATUS_STYLES]}>{status}</Badge>
                    <span className="text-xs text-slate-400">{count}</span>
                  </div>
                  <p className="mt-3 text-lg font-bold text-slate-900 dark:text-white">{count}</p>
                  <p className="text-[11px] text-slate-400">invoices</p>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon,
  link,
  loading,
  index,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  link: string;
  loading: boolean;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + index * 0.04 }}
    >
      <Link
        to={link}
        className="flex items-center gap-3.5 rounded-2xl bg-card p-4 ring-1 ring-line shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-lg font-bold leading-tight text-slate-900 dark:text-white">
            {loading ? <Skeleton className="h-6 w-10" /> : value}
          </p>
          <p className="truncate text-xs font-medium text-slate-400">{label}</p>
        </div>
      </Link>
    </motion.div>
  );
}
