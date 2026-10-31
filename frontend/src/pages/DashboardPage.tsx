import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CalendarClock,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  FolderKanban,
  KeyRound,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard, StatCardsGrid } from "@/components/ui";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/EmptyState";
import {
  ChartCard,
  RevenueAreaChart,
  CashFlowComposedChart,
  DonutChart,
} from "@/components/charts/Charts";
import { useDashboard } from "@/hooks/queries";
import { useSettings } from "@/context/SettingsContext";
import { useAuth } from "@/context/AuthContext";
import { useAmountVisibility } from "@/context/AmountVisibilityContext";
import { DUE_STATUS_STYLES, INVOICE_STATUS_STYLES } from "@/utils/constants";
import { formatCurrency, formatDate, formatTime, formatCompactCurrency } from "@/utils/format";
import { cn } from "@/utils/cn";
import { MonthNavigator } from "@/components/ui/MonthNavigator";

const CATEGORY_COLORS: Record<string, string> = {
  Hosting: "#74bcf8",
  Domain: "#4aa6ef",
  Internet: "#8ecaf9",
  Transport: "#f59e0b",
  Marketing: "#ec4899",
  Office: "#10b981",
  Software: "var(--brand-primary)",
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

function ActivityRow({
  icon,
  iconClass,
  title,
  meta,
  amount,
  amountClass,
}: {
  icon: ReactNode;
  iconClass: string;
  title: string;
  meta: string;
  amount: string;
  amountClass?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-muted/70">
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", iconClass)}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{title}</p>
        <p className="truncate text-[11px] text-ink-muted">{meta}</p>
      </div>
      <p className={cn("shrink-0 text-sm font-bold", amountClass)}>{amount}</p>
    </div>
  );
}

function SectionLink({ to, children = "View All" }: { to: string; children?: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-0.5 text-xs font-semibold text-[var(--brand-primary)] hover:underline"
    >
      {children}
      <ChevronRight className="h-3.5 w-3.5" />
    </Link>
  );
}

export default function DashboardPage() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  });
  const { data: dash, isLoading: dashLoading, error, refetch } = useDashboard(selectedMonth);
  const { currency } = useSettings();
  const { user } = useAuth();
  const { mask } = useAmountVisibility();

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

  const latestTxns = useMemo(() => listTxns.slice(0, 6), [listTxns]);
  const recentPayments = useMemo(() => payments.slice(0, 5), [payments]);
  const recentExpenses = useMemo(() => expenses.slice(0, 5), [expenses]);
  const upcomingRenewals = useMemo(
    () =>
      rentals
        .filter((r) => r.status === "Active")
        .sort((a, b) => new Date(a.nextBillingDate).getTime() - new Date(b.nextBillingDate).getTime())
        .slice(0, 4),
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

  const monthIncome = dash?.stats.monthIncome ?? 0;
  const monthExpense = dash?.stats.monthExpense ?? 0;
  const monthProfit = monthIncome - monthExpense;
  const firstName = user?.fullName?.split(/\s+/)[0] || "there";

  if (error) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  const fmt = (n: number) => formatCurrency(n, currency);
  const compact = (n: number) => formatCompactCurrency(n, currency);
  const s = dash?.stats;

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Welcome, ${firstName}`}
        subtitle={
          <>
            {monthLabel} overview · Net{" "}
            <span
              className={cn(
                "font-semibold",
                monthProfit >= 0 ? "text-emerald-600" : "text-rose-600"
              )}
            >
              {dashLoading ? "…" : mask(compact(monthProfit))}
            </span>
          </>
        }
        actions={<MonthNavigator value={selectedMonth} onChange={setSelectedMonth} />}
      />

      {/* Income summary */}
      <StatCardsGrid cols={5}>
        <StatCard
          compact
          index={0}
          loading={dashLoading}
          label="Today income"
          value={compact(s?.todayIncome ?? 0)}
          icon={<Zap className="h-4 w-4" />}
          iconClassName="emerald"
        />
        <StatCard
          compact
          index={1}
          loading={dashLoading}
          label="Weekly income"
          value={compact(s?.weekIncome ?? 0)}
          icon={<CalendarDays className="h-4 w-4" />}
          iconClassName="teal"
        />
        <StatCard
          compact
          index={2}
          loading={dashLoading}
          label="Month income"
          value={compact(s?.monthIncome ?? 0)}
          icon={<TrendingUp className="h-4 w-4" />}
          iconClassName="emerald"
        />
        <StatCard
          compact
          index={3}
          loading={dashLoading}
          label="Collected"
          value={compact(s?.totalCollected ?? 0)}
          icon={<CreditCard className="h-4 w-4" />}
          iconClassName="sky"
        />
        <StatCard
          compact
          index={4}
          loading={dashLoading}
          label="Cash balance"
          value={compact(s?.currentBalance ?? 0)}
          icon={<Wallet className="h-4 w-4" />}
          iconClassName="navy"
        />
      </StatCardsGrid>

      {/* Expense summary */}
      <StatCardsGrid cols={5}>
        <StatCard
          compact
          index={5}
          loading={dashLoading}
          label="Today expense"
          value={compact(s?.todayExpense ?? 0)}
          icon={<TrendingDown className="h-4 w-4" />}
          iconClassName="orange"
        />
        <StatCard
          compact
          index={6}
          loading={dashLoading}
          label="Weekly expense"
          value={compact(s?.weekExpense ?? 0)}
          icon={<CalendarDays className="h-4 w-4" />}
          iconClassName="amber"
        />
        <StatCard
          compact
          index={7}
          loading={dashLoading}
          label="Month expense"
          value={compact(s?.monthExpense ?? 0)}
          icon={<ArrowUpRight className="h-4 w-4" />}
          iconClassName="amber"
        />
        <StatCard
          compact
          index={8}
          loading={dashLoading}
          label="Outstanding"
          value={compact(s?.totalOutstanding ?? 0)}
          icon={<CircleDollarSign className="h-4 w-4" />}
          iconClassName="rose"
        />
        <StatCard
          compact
          index={9}
          loading={dashLoading}
          label="Dues balance"
          value={compact(s?.totalDuesBalance ?? 0)}
          icon={<Banknote className="h-4 w-4" />}
          iconClassName="red"
        />
      </StatCardsGrid>

      {/* Counts */}
      <StatCardsGrid cols={4}>
        <StatCard
          compact
          index={10}
          loading={dashLoading}
          label="Total customers"
          value={String(s?.totalCustomers ?? 0)}
          icon={<Users className="h-4 w-4" />}
          iconClassName="sky"
        />
        <StatCard
          compact
          index={11}
          loading={dashLoading}
          label="Total projects"
          value={String(s?.totalProjects ?? 0)}
          icon={<FolderKanban className="h-4 w-4" />}
          iconClassName="violet"
        />
        <StatCard
          compact
          index={12}
          loading={dashLoading}
          label="Rental projects"
          value={String(s?.totalRentalProjects ?? 0)}
          icon={<KeyRound className="h-4 w-4" />}
          iconClassName="indigo"
        />
        <StatCard
          compact
          index={13}
          loading={dashLoading}
          label="One-time projects"
          value={String(s?.totalOneTimeProjects ?? 0)}
          icon={<FolderKanban className="h-4 w-4" />}
          iconClassName="slate"
        />
      </StatCardsGrid>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard
          title="Revenue trend"
          subtitle="Last 6 months"
          className="xl:col-span-2"
          action={<SectionLink to="/reports/income-statement">Report</SectionLink>}
        >
          <RevenueAreaChart data={monthly} currency={currency} height={240} loading={dashLoading} />
        </ChartCard>
        <ChartCard title="Expense split" subtitle={monthLabel}>
          <DonutChart
            data={expenseByCategory.slice(0, 5)}
            centerValue={compact(expenseByCategory.reduce((sum, d) => sum + d.value, 0))}
            centerLabel="Total"
            height={200}
            loading={dashLoading}
          />
        </ChartCard>
      </div>

      <ChartCard title="Cash flow" subtitle="Inflow vs outflow">
        <CashFlowComposedChart data={monthly} currency={currency} height={210} loading={dashLoading} />
      </ChartCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Card animated={false}>
          <CardHeader
            title="Transactions"
            subtitle={monthLabel}
            className="px-4 pt-4"
            action={<SectionLink to="/transactions" />}
          />
          <CardBody className="space-y-0.5 p-3 pt-1">
            {dashLoading ? (
              <SkeletonTable rows={4} cols={3} />
            ) : latestTxns.length === 0 ? (
              <p className="py-8 text-center text-xs text-ink-muted">No transactions this month.</p>
            ) : (
              latestTxns.map((t) => (
                <ActivityRow
                  key={t.transactionId}
                  icon={
                    t.transactionType === "Income" ? (
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5" />
                    )
                  }
                  iconClass={
                    t.transactionType === "Income"
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15"
                      : "bg-amber-50 text-amber-600 dark:bg-amber-500/15"
                  }
                  title={t.description ?? "Transaction"}
                  meta={`${formatDate(t.transactionDate)} · ${formatTime(t.transactionDate)}`}
                  amount={`${t.transactionType === "Income" ? "+" : "−"}${fmt(t.income || t.expense)}`}
                  amountClass={t.transactionType === "Income" ? "text-emerald-600" : "text-ink"}
                />
              ))
            )}
          </CardBody>
        </Card>

        <Card animated={false}>
          <CardHeader
            title="Payments"
            subtitle={monthLabel}
            className="px-4 pt-4"
            action={<SectionLink to="/payments" />}
          />
          <CardBody className="space-y-0.5 p-3 pt-1">
            {dashLoading ? (
              <SkeletonTable rows={3} cols={3} />
            ) : recentPayments.length === 0 ? (
              <p className="py-8 text-center text-xs text-ink-muted">No payments.</p>
            ) : (
              recentPayments.map((p) => (
                <ActivityRow
                  key={p.paymentId}
                  icon={<CreditCard className="h-3.5 w-3.5" />}
                  iconClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15"
                  title={p.customerName ?? p.paymentNumber}
                  meta={`${formatDate(p.paymentDate)} · ${formatTime(p.createdAt ?? p.paymentDate)}`}
                  amount={`+${fmt(p.amount)}`}
                  amountClass="text-emerald-600"
                />
              ))
            )}
          </CardBody>
        </Card>

        <Card animated={false}>
          <CardHeader
            title="Expenses"
            subtitle={monthLabel}
            className="px-4 pt-4"
            action={<SectionLink to="/expenses" />}
          />
          <CardBody className="space-y-0.5 p-3 pt-1">
            {dashLoading ? (
              <SkeletonTable rows={3} cols={3} />
            ) : recentExpenses.length === 0 ? (
              <p className="py-8 text-center text-xs text-ink-muted">No expenses.</p>
            ) : (
              recentExpenses.map((e) => (
                <ActivityRow
                  key={e.expenseId}
                  icon={<Banknote className="h-3.5 w-3.5" />}
                  iconClass="bg-amber-50 text-amber-600 dark:bg-amber-500/15"
                  title={e.description}
                  meta={`${e.categoryName} · ${formatDate(e.expenseDate)} · ${formatTime(e.createdAt ?? e.expenseDate)}`}
                  amount={`−${fmt(e.amount)}`}
                  amountClass="text-ink"
                />
              ))
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card animated={false}>
          <CardHeader
            title="Member dues"
            subtitle={dueSummary.month}
            className="px-4 pt-4"
            action={<SectionLink to="/contributions">View</SectionLink>}
          />
          <CardBody className="p-4 pt-2">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Paid", count: dueSummary.paid, cls: DUE_STATUS_STYLES.Paid },
                { label: "Partial", count: dueSummary.partial, cls: DUE_STATUS_STYLES.Partial },
                { label: "Pending", count: dueSummary.pending, cls: DUE_STATUS_STYLES.Pending },
              ].map((row) => (
                <div key={row.label} className="rounded-xl bg-muted/60 px-3 py-3 text-center">
                  <p className="text-xl font-bold text-ink">{dashLoading ? "—" : row.count}</p>
                  <Badge className={cn("mt-1.5 text-[10px]", row.cls)}>{row.label}</Badge>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card animated={false}>
          <CardHeader
            title="Rental renewals"
            subtitle="Upcoming"
            className="px-4 pt-4"
            action={<SectionLink to="/projects/customers">View</SectionLink>}
          />
          <CardBody className="space-y-0.5 p-3 pt-1">
            {upcomingRenewals.length === 0 ? (
              <p className="py-6 text-center text-xs text-ink-muted">No upcoming renewals.</p>
            ) : (
              upcomingRenewals.map((r) => (
                <ActivityRow
                  key={r.billingId}
                  icon={<CalendarClock className="h-3.5 w-3.5" />}
                  iconClass="bg-[color-mix(in_srgb,var(--brand-primary)_12%,white)] text-[var(--brand-primary)]"
                  title={r.projectName}
                  meta={`${r.customerName} · ${formatDate(r.nextBillingDate)}`}
                  amount={compact(r.monthlyAmount)}
                />
              ))
            )}
          </CardBody>
        </Card>
      </div>

      <Card animated={false}>
        <CardHeader
          title="Invoices by status"
          className="px-4 pt-4"
          action={<SectionLink to="/invoices">Manage</SectionLink>}
        />
        <CardBody className="p-4 pt-2">
          <div className="flex flex-wrap gap-2">
            {(dash?.invoiceStatusCounts ?? []).map(({ status, count }) => (
              <div
                key={status}
                className="flex min-w-[7.5rem] flex-1 items-center justify-between gap-2 rounded-xl bg-muted/60 px-3 py-2.5"
              >
                <Badge
                  className={cn(
                    "text-[10px]",
                    INVOICE_STATUS_STYLES[status as keyof typeof INVOICE_STATUS_STYLES]
                  )}
                >
                  {status}
                </Badge>
                <span className="text-sm font-bold text-ink">{count}</span>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
