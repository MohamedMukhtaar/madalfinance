import { useEffect, useMemo, useState } from "react";
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
  Activity,
  Table2,
  BarChart3,
  Landmark,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton, EmptyState, Tabs, MonthNavigator } from "@/components/ui";

type ReportChartsModule = typeof import("@/features/reports/ReportCharts");

function useLazyReportCharts(enabled: boolean) {
  const [mod, setMod] = useState<ReportChartsModule | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    void import("@/features/reports/ReportCharts").then((m) => {
      if (live) setMod(m);
    });
    return () => {
      live = false;
    };
  }, [enabled]);
  return mod;
}

function ChartPlaceholder() {
  return <Skeleton className="h-72 w-full rounded-xl" />;
}
import { Progress } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";
import {
  useAccountStatement,
  useAccounts,
  useCashFlowReport,
  useContributionReport,
  useCustomers,
  useDues,
  useExpenseByCategoryReport,
  useIncomeStatement,
  useInvoices,
  useMemberStatement,
  useMembers,
  useMonthlyRevenueReport,
  useCustomerPaymentReport,
  usePayments,
  useTransactions,
} from "@/hooks/queries";
import { useSettings } from "@/context/SettingsContext";
import { useSelectedMonth } from "@/hooks/useSelectedMonth";
import { formatCurrency, formatCompactCurrency, formatDate, formatTime, formatAccountOptionLabel, formatMemberStatementBalance } from "@/utils/format";
import { runningBalanceAsc } from "@/utils/chronology";
import { formatMonthLabel, monthRangeParams } from "@/utils/monthFilter";
import { cn } from "@/utils/cn";
import { financeService } from "@/services/finance";
import { api, getErrorMessage } from "@/services/api";
import { DUE_STATUS_STYLES } from "@/utils/constants";
import type { LedgerTransaction } from "@/types";
import toast from "react-hot-toast";

const VIEWS = [
  { id: "customers", label: "Customers", path: "/reports/customers" },
  { id: "statements", label: "Statements", path: "/reports/statements" },
  { id: "accounts", label: "Accounts", path: "/reports/accounts" },
  { id: "expenses", label: "Expenses", path: "/reports/expenses" },
  { id: "members", label: "Members", path: "/reports/members" },
  { id: "income-statement", label: "Income Statement", path: "/reports/income-statement" },
  { id: "cash-flow", label: "Cash Flow", path: "/reports/cash-flow" },
] as const;

type ViewId = (typeof VIEWS)[number]["id"];

const CHART_PALETTE = ["#74bcf8", "#101848", "#4aa6ef", "#10b981", "#f59e0b", "#1a255c", "#f43f5e", "#14b8a6"];

function resolveView(param?: string): ViewId {
  if (
    param === "customers" ||
    param === "statements" ||
    param === "accounts" ||
    param === "expenses" ||
    param === "members" ||
    param === "income-statement" ||
    param === "cash-flow"
  ) {
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
  const { month, setMonth } = useSelectedMonth();

  const [displayMode, setDisplayMode] = useState<"charts" | "table">("charts");
  const [customerPayFilter, setCustomerPayFilter] = useState<"all" | "unpaid" | "partial" | "paid">("all");
  const charts = useLazyReportCharts(displayMode === "charts");
  const ChartCard = charts?.ChartCard ?? ((props: { title?: string; subtitle?: string; className?: string; children?: React.ReactNode }) => (
    <Card className={props.className}>
      <CardHeader title={props.title} subtitle={props.subtitle} />
      <CardBody>{charts ? props.children : <ChartPlaceholder />}</CardBody>
    </Card>
  ));
  const CashFlowComposedChart = charts?.CashFlowComposedChart ?? ChartPlaceholder;
  const FullPieChart = charts?.FullPieChart ?? ChartPlaceholder;
  const RevenueAreaChart = charts?.RevenueAreaChart ?? ChartPlaceholder;
  const IncomeExpenseBarChart = charts?.IncomeExpenseBarChart ?? ChartPlaceholder;
  const NetTrendLineChart = charts?.NetTrendLineChart ?? ChartPlaceholder;
  const DonutChart = charts?.DonutChart ?? ChartPlaceholder;
  const HorizontalBarChart = charts?.HorizontalBarChart ?? ChartPlaceholder;
  const StackedStatusBarChart = charts?.StackedStatusBarChart ?? ChartPlaceholder;

  const reportParams = useMemo(() => monthRangeParams(month), [month]);
  const { from: monthFrom, to: monthTo } = useMemo(() => {
    const { fromDate, toDate } = monthRangeParams(month);
    return { from: fromDate, to: toDate };
  }, [month]);

  const { data: customersData } = useCustomers({ enabled: view === "statements" });
  const { data: invoicesData } = useInvoices({ enabled: view === "statements" });
  const { data: paymentsData } = usePayments({ enabled: view === "statements" });
  const allCustomers = customersData?.rows ?? [];
  const allInvoices = invoicesData?.rows ?? [];
  const allPayments = paymentsData?.rows ?? [];
  const { data: income, isLoading: incomeLoading } = useIncomeStatement({ ...reportParams, enabled: view === "income-statement" });
  const { data: customers, isLoading: customersLoading } = useCustomerPaymentReport({ enabled: view === "customers" });
  const { data: expenses, isLoading: expensesLoading } = useExpenseByCategoryReport({ ...reportParams, enabled: view === "expenses" });
  const { data: monthly, isLoading: monthlyLoading } = useMonthlyRevenueReport({
    months: 12,
    ...reportParams,
    enabled: view === "income-statement" || view === "cash-flow",
  });
  const { data: cashFlow, isLoading: cashFlowLoading } = useCashFlowReport({ ...reportParams, enabled: view === "cash-flow" });
  const { data: cashFlowTxData, isLoading: cashFlowTxLoading } = useTransactions({
    ...reportParams,
    perPage: 500,
    sort: "created_at:asc",
    enabled: view === "cash-flow",
  });
  const cashFlowTransactions = (cashFlowTxData?.rows ?? []) as LedgerTransaction[];

  const cashFlowTableRows = useMemo(() => {
    const sorted = [...cashFlowTransactions].sort((a, b) => {
      const ta = new Date(a.createdAt ?? a.transactionDate).getTime();
      const tb = new Date(b.createdAt ?? b.transactionDate).getTime();
      return ta - tb || a.transactionId - b.transactionId;
    });
    let balance = 0;
    return sorted.map((row) => {
      const net = Number(row.income ?? 0) - Number(row.expense ?? 0);
      balance = Math.round((balance + net) * 100) / 100;
      return { ...row, net, balance };
    });
  }, [cashFlowTransactions]);

  const { data: duesData } = useDues({ enabled: view === "members" });
  const batches = duesData?.rows ?? [];
  const batchId = Number(searchParams.get("batchId")) || batches[0]?.batchId;
  const { data: contribution, isLoading: contributionLoading } = useContributionReport(batchId, {
    enabled: view === "members" && !!batchId,
  });

  const [statementCustomerId, setStatementCustomerId] = useState<number | "">("");
  const [statementMemberId, setStatementMemberId] = useState<number | "">("");
  const [statementType, setStatementType] = useState<"customer" | "member">("customer");
  const [reportAccountId, setReportAccountId] = useState<number | "">("");

  const { data: accountsList = [] } = useAccounts({ enabled: view === "accounts" });
  const { data: members = [] } = useMembers({ enabled: view === "statements" });
  const { data: memberStatementData, isLoading: memberStatementLoading } = useMemberStatement(
    statementMemberId || undefined,
    { ...reportParams, enabled: view === "statements" && statementType === "member" && !!statementMemberId }
  );
  const { data: accountStatementData } = useAccountStatement(
    reportAccountId || undefined,
    { ...reportParams, enabled: view === "accounts" && !!reportAccountId }
  );
  const selectedCustomer = useMemo(
    () => allCustomers.find((c) => c.customerId === statementCustomerId),
    [allCustomers, statementCustomerId]
  );

  const selectedMember = useMemo(
    () => members.find((m) => m.memberId === statementMemberId),
    [members, statementMemberId]
  );

  const memberStatementRows = memberStatementData?.rows ?? [];
  const memberStatementTotals = memberStatementData?.totals ?? { charged: 0, loans: 0, paid: 0, outstanding: 0, loanBalance: 0 };

  const selectedReportAccount = useMemo(
    () => accountsList.find((a) => a.accId === reportAccountId),
    [accountsList, reportAccountId]
  );

  const totalAccountBalance = useMemo(
    () => accountsList.reduce((s, a) => s + Number(a.balance ?? 0), 0),
    [accountsList]
  );

  const accountMovements = accountStatementData?.movements ?? [];
  const accountStatementTotals = useMemo(() => {
    const debits = accountMovements.reduce((s, m) => s + Number(m.debit ?? 0), 0);
    const credits = accountMovements.reduce((s, m) => s + Number(m.credit ?? 0), 0);
    return { debits, credits, net: debits - credits };
  }, [accountMovements]);

  const statementRows = useMemo(() => {
    if (!selectedCustomer || !statementCustomerId) return [];
    const customerInvoices = allInvoices.filter((i) => i.customerId === statementCustomerId);
    const customerPayments = allPayments.filter((p) => p.customerId === statementCustomerId);
    const items: Array<{ date: string; time: string; desc: string; debit: number; credit: number }> = [];
    customerInvoices.forEach((i) =>
      items.push({
        date: i.invoiceDate,
        time: i.createdAt ?? i.invoiceDate,
        desc: `Invoice ${i.invoiceNumber}`,
        debit: Number(i.totalAmount ?? 0),
        credit: 0,
      })
    );
    customerPayments.forEach((p) =>
      items.push({
        date: p.paymentDate,
        time: p.createdAt ?? p.paymentDate,
        desc: `Payment ${p.paymentNumber}`,
        debit: 0,
        credit: Number(p.amount ?? 0),
      })
    );
    const filteredItems = items.filter((item) => {
      const d = item.date.slice(0, 10);
      if (d < monthFrom) return false;
      if (d > monthTo) return false;
      return true;
    });
    return runningBalanceAsc(
      filteredItems.map((item) => ({ ...item, payout: 0 })),
      (item) => item.time ?? item.date
    ).map((item) => ({
      date: item.date,
      time: item.time,
      desc: item.desc,
      debit: item.debit,
      credit: item.credit,
      balance: item.balance,
    }));
  }, [selectedCustomer, statementCustomerId, allInvoices, allPayments, monthFrom, monthTo]);

  const statementTotals = useMemo(() => {
    if (!selectedCustomer) return { invoiced: 0, paid: 0, outstanding: 0 };
    const inRange = (dateStr: string) => {
      const d = dateStr.slice(0, 10);
      return d >= monthFrom && d <= monthTo;
    };
    const customerInvoices = allInvoices.filter(
      (i) => i.customerId === statementCustomerId && inRange(i.invoiceDate)
    );
    const customerPayments = allPayments.filter(
      (p) => p.customerId === statementCustomerId && inRange(p.paymentDate)
    );
    const invoiced = customerInvoices.reduce((s, i) => s + Number(i.totalAmount ?? 0), 0);
    const paid = customerPayments.reduce((s, p) => s + Number(p.amount ?? 0), 0);
    const outstanding = Number(selectedCustomer.outstandingBalance ?? Math.max(0, invoiced - paid));
    return { invoiced, paid, outstanding };
  }, [selectedCustomer, statementCustomerId, allInvoices, allPayments, monthFrom, monthTo]);

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

  const customerRowsAll = useMemo(
    () =>
      customerRowsRaw.filter((c) => {
        const invoiced = Number(c.totalInvoiced ?? c.total_invoiced ?? 0);
        return invoiced > 0 || Number(c.outstanding ?? 0) > 0;
      }),
    [customerRowsRaw]
  );

  const customerRows = useMemo(() => {
    if (customerPayFilter === "unpaid") {
      return customerRowsAll.filter(
        (c) => String(c.paymentStatus ?? c.payment_status ?? "") === "Unpaid"
      );
    }
    if (customerPayFilter === "partial") {
      return customerRowsAll.filter(
        (c) => String(c.paymentStatus ?? c.payment_status ?? "") === "Partial"
      );
    }
    if (customerPayFilter === "paid") {
      return customerRowsAll.filter(
        (c) => String(c.paymentStatus ?? c.payment_status ?? "") === "Paid"
      );
    }
    return customerRowsAll;
  }, [customerRowsAll, customerPayFilter]);

  const customerPaySummary = useMemo(() => {
    const statusOf = (c: Record<string, unknown>) =>
      String(c.paymentStatus ?? c.payment_status ?? "");
    const unpaidOnly = customerRowsAll.filter((c) => statusOf(c) === "Unpaid");
    const partial = customerRowsAll.filter((c) => statusOf(c) === "Partial");
    const paid = customerRowsAll.filter((c) => statusOf(c) === "Paid");
    const totalOutstanding = customerRowsAll.reduce((s, c) => s + (Number(c.outstanding) || 0), 0);
    const totalCollected = customerRowsAll.reduce((s, c) => s + (Number(c.totalPaid ?? c.total_paid) || 0), 0);
    return {
      unpaidCount: unpaidOnly.length,
      partialCount: partial.length,
      paidCount: paid.length,
      totalOutstanding,
      totalCollected,
    };
  }, [customerRowsAll]);

  const expenseRows = asRows<{ categoryName: string; total: number; count: number }>(expenses);

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
      customerRowsAll
        .filter((c) => Number(c.outstanding) > 0)
        .slice(0, 8)
        .map((c, index) => ({
          name: String(c.customerName ?? c.customer_name ?? "Customer").slice(0, 18),
          value: Number(c.outstanding) || 0,
          color: CHART_PALETTE[index % CHART_PALETTE.length],
        })),
    [customerRowsAll]
  );
  const totalOutstanding = customerPaySummary.totalOutstanding;

  const customerStatusChart = useMemo(
    () =>
      [
        { name: "Unpaid", value: customerPaySummary.unpaidCount, color: "#f43f5e" },
        { name: "Partial", value: customerPaySummary.partialCount, color: "#f59e0b" },
        { name: "Paid", value: customerPaySummary.paidCount, color: "#10b981" },
      ].filter((d) => d.value > 0),
    [customerPaySummary]
  );

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

  const cashTotals = useMemo(() => {
    const inflow = cashChart.reduce((s, r) => s + r.inflow, 0);
    const outflow = cashChart.reduce((s, r) => s + r.outflow, 0);
    return {
      inflow,
      outflow,
      net: inflow - outflow,
      months: cashChart.length,
    };
  }, [cashChart]);

  const profitSplitChart = useMemo(
    () =>
      [
        { name: "Income", value: Math.max(0, totalIncome), color: "#74bcf8" },
        { name: "Expenses", value: Math.max(0, totalExpense), color: "#f59e0b" },
      ].filter((d) => d.value > 0),
    [totalIncome, totalExpense]
  );

  const memberStackChart = useMemo(() => {
    const s = contributionData?.summary;
    return [
      {
        name: "This batch",
        paid: Number(s?.paid ?? 0),
        partial: Number(s?.partial ?? 0),
        pending: Number(s?.pending ?? 0),
      },
    ];
  }, [contributionData]);

  const exportConfig = useMemo(() => {
    switch (view) {
      case "customers":
        return { kind: "customerPaymentStatus" };
      case "expenses":
        return { kind: "expenseByCategory" };
      case "members":
        return { kind: "contributionReport" };
      case "cash-flow":
        return { kind: "cashFlow" };
      case "income-statement":
        return { kind: "incomeStatement" };
      case "accounts":
        return reportAccountId
          ? { kind: "accountStatement", params: { accId: reportAccountId } }
          : { kind: "accountBalances" };
      case "statements":
        if (statementType === "member" && statementMemberId) {
          return { kind: "memberStatement", params: { memberId: statementMemberId } };
        }
        if (statementType === "customer" && statementCustomerId) {
          return { kind: "customerStatement", params: { customerId: statementCustomerId } };
        }
        return null;
      default:
        return null;
    }
  }, [view, reportAccountId, statementType, statementMemberId, statementCustomerId]);

  const exportReport = async (kind: string, format: "pdf" | "xlsx") => {
    try {
      const url = await financeService.exportReportUrl(kind, format, {
        ...(batchId ? { batchId } : {}),
        ...exportConfig?.params,
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

  const handleExport = (format: "pdf" | "xlsx") => {
    if (!exportConfig) {
      toast.error(
        view === "statements"
          ? "Select a customer or member to export their statement"
          : "Nothing to export on this tab"
      );
      return;
    }
    void exportReport(exportConfig.kind, format);
  };

  const periodHint = formatMonthLabel(month);

  const summaryPrimaryLabel =
    view === "expenses"
      ? "Total spend"
      : view === "customers"
        ? "Outstanding"
        : view === "statements"
          ? statementType === "member"
            ? "Charged"
            : "Invoiced"
          : view === "accounts"
            ? "Total balance"
            : view === "members"
              ? "Collected"
              : view === "cash-flow"
                ? "Inflow"
                : "Income";

  const summaryPrimaryValue =
    view === "expenses"
      ? formatCurrency(totalExpenseCats, currency)
      : view === "customers"
        ? formatCurrency(totalOutstanding, currency)
        : view === "statements"
          ? statementType === "member"
            ? formatCurrency(memberStatementTotals.charged, currency)
            : formatCurrency(statementTotals.invoiced, currency)
          : view === "accounts"
            ? formatCurrency(totalAccountBalance, currency)
            : view === "members"
              ? formatCurrency(Number(contributionData?.summary?.collected ?? 0), currency)
              : view === "cash-flow"
                ? formatCurrency(cashTotals.inflow, currency)
                : formatCurrency(totalIncome, currency);

  const summarySecondaryLabel =
    view === "income-statement"
      ? "Net profit"
      : view === "statements"
        ? "Outstanding"
        : view === "accounts"
          ? "Accounts"
          : view === "members"
            ? "Collection rate"
            : view === "cash-flow"
              ? "Net cash"
              : view === "expenses"
                ? "Transactions"
                : "Records";

  const summarySecondaryValue =
    view === "income-statement"
      ? formatCurrency(netProfit, currency)
      : view === "statements"
        ? statementType === "member"
          ? formatCurrency(memberStatementTotals.outstanding, currency)
          : formatCurrency(statementTotals.outstanding, currency)
        : view === "accounts"
          ? String(accountsList.length)
          : view === "members"
            ? `${memberCollectionPct}%`
            : view === "cash-flow"
              ? formatCurrency(cashTotals.net, currency)
              : view === "expenses"
                ? String(expenseTxnCount)
                : String(customerRows.length);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Analyse finances with live charts and filtered periods."
        actions={
          <>
            <MonthNavigator value={month} onChange={setMonth} />
            {exportConfig && (
              <>
                <Button variant="secondary" onClick={() => handleExport("pdf")} leftIcon={<FileDown className="h-4 w-4" />}>
                  PDF
                </Button>
                <Button variant="secondary" onClick={() => handleExport("xlsx")} leftIcon={<FileSpreadsheet className="h-4 w-4" />}>
                  Excel
                </Button>
              </>
            )}
          </>
        }
      />

      <Tabs
        tabs={VIEWS.map((v) => ({ label: v.label, value: v.id }))}
        active={view}
        onChange={(id) => {
          const target = VIEWS.find((v) => v.id === id);
          if (target) navigate(target.path);
        }}
      />

      {/* Summary strip */}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-end sm:px-6">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setDisplayMode("charts")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                displayMode === "charts"
                  ? "bg-white text-navy shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              )}
            >
              <BarChart3 className="h-3.5 w-3.5" /> Charts
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode("table")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                displayMode === "table"
                  ? "bg-white text-navy shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              )}
            >
              <Table2 className="h-3.5 w-3.5" /> Table
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px bg-slate-100 dark:bg-slate-800 sm:grid-cols-4">
          <SummaryCell label="Report" value={VIEWS.find((v) => v.id === view)?.label ?? "—"} />
          <SummaryCell label="Period" value={periodHint} />
          <SummaryCell
            label={summaryPrimaryLabel}
            value={summaryPrimaryValue}
            valueClass="text-brand-700 dark:text-brand-400"
          />
          <SummaryCell
            label={summarySecondaryLabel}
            value={summarySecondaryValue}
            valueClass={
              view === "income-statement" || view === "cash-flow"
                ? (view === "cash-flow" ? cashTotals.net : netProfit) >= 0
                  ? "text-emerald-600"
                  : "text-rose-600"
                : undefined
            }
          />
        </div>
      </Card>

      {view === "cash-flow" && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ReportStat
              index={0}
              label="Total inflow"
              value={formatCurrency(cashTotals.inflow, currency)}
              icon={<TrendingUp className="h-5 w-5" />}
              className="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
              loading={cashFlowLoading}
            />
            <ReportStat
              index={1}
              label="Total outflow"
              value={formatCurrency(cashTotals.outflow, currency)}
              icon={<TrendingDown className="h-5 w-5" />}
              className="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
              loading={cashFlowLoading}
            />
            <ReportStat
              index={2}
              label="Net cash"
              value={formatCurrency(cashTotals.net, currency)}
              icon={<Activity className="h-5 w-5" />}
              className="bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
              loading={cashFlowLoading}
            />
            <ReportStat
              index={3}
              label="Months covered"
              value={String(cashTotals.months)}
              icon={<Wallet className="h-5 w-5" />}
              className="bg-navy/10 text-navy dark:bg-brand-500/10 dark:text-brand-300"
              loading={cashFlowLoading}
            />
          </div>

          <Card className="border-dashed">
            <CardBody className="p-4 text-sm text-slate-600 dark:text-slate-300">
              <p className="font-semibold text-slate-800 dark:text-slate-100">What cash flow shows</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Cash <span className="font-semibold text-emerald-600">in</span> = money that entered the ledger
                (payments received, other income, contribution receipts). Cash{" "}
                <span className="font-semibold text-amber-600">out</span> = money that left (expenses paid, voided
                payments reversed). Net = in − out for each month.
              </p>
            </CardBody>
          </Card>

          {displayMode === "charts" && (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <ChartCard title="Cash in vs cash out" subtitle="Bars + net line by month" className="xl:col-span-2">
                {cashFlowLoading ? (
                  <Skeleton className="h-72 w-full" />
                ) : cashChart.length === 0 ? (
                  <EmptyState title="No cash-flow data" description="No ledger transactions in this period." />
                ) : (
                  <CashFlowComposedChart data={cashChart} currency={currency} height={320} />
                )}
              </ChartCard>
              <ChartCard title="In vs out mix" subtitle="Totals for the selected period">
                <FullPieChart
                  data={[
                    { name: "Cash in", value: cashTotals.inflow, color: "#74bcf8" },
                    { name: "Cash out", value: cashTotals.outflow, color: "#f59e0b" },
                  ].filter((d) => d.value > 0)}
                  currency={currency}
                  height={260}
                  loading={cashFlowLoading}
                />
              </ChartCard>
            </div>
          )}

          <Card>
            <CardHeader
              title="Cash flow transactions"
              subtitle="Every ledger movement with description, date and time"
              action={
                <Button size="sm" variant="secondary" onClick={() => exportReport("cashFlow", "xlsx")}>
                  Export
                </Button>
              }
            />
            <div className="overflow-x-auto p-3">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2 text-right">Inflow (in)</th>
                    <th className="px-3 py-2 text-right">Outflow (out)</th>
                    <th className="px-3 py-2 text-right">Net</th>
                    <th className="px-3 py-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {cashFlowTxLoading ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8">
                        <Skeleton className="h-8 w-full" />
                      </td>
                    </tr>
                  ) : (
                    cashFlowTableRows.map((row) => (
                      <tr key={row.transactionId} className="text-slate-600 dark:text-slate-300">
                        <td className="max-w-[20rem] px-3 py-2.5 font-medium text-slate-800 dark:text-slate-100">
                          {row.description || `${row.referenceType ?? "Transaction"} #${row.referenceId ?? ""}`}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(row.transactionDate)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-500 dark:text-slate-400">
                          {formatTime(row.createdAt ?? row.transactionDate)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                          {row.income > 0 ? formatCurrency(row.income, currency) : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-amber-600 dark:text-amber-400">
                          {row.expense > 0 ? formatCurrency(row.expense, currency) : "—"}
                        </td>
                        <td
                          className={cn(
                            "px-3 py-2.5 text-right font-mono font-semibold",
                            row.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                          )}
                        >
                          {row.net >= 0 ? "+" : ""}
                          {formatCurrency(row.net, currency)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-800 dark:text-slate-100">
                          {formatCurrency(row.balance, currency)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {!cashFlowTxLoading && cashFlowTableRows.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 font-bold dark:border-slate-700">
                      <td className="px-3 py-2.5" colSpan={3}>
                        Total
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-emerald-600">
                        {formatCurrency(cashTotals.inflow, currency)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-amber-600">
                        {formatCurrency(cashTotals.outflow, currency)}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2.5 text-right font-mono",
                          cashTotals.net >= 0 ? "text-emerald-600" : "text-rose-600"
                        )}
                      >
                        {formatCurrency(cashTotals.net, currency)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-800 dark:text-slate-100">
                        {formatCurrency(cashFlowTableRows[cashFlowTableRows.length - 1]?.balance ?? 0, currency)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
              {!cashFlowTxLoading && cashFlowTableRows.length === 0 && (
                <p className="px-5 py-8 text-center text-sm text-slate-400">No cash-flow rows for this period.</p>
              )}
            </div>
          </Card>

          {displayMode === "table" && (
          <Card>
            <CardHeader title="Monthly summary" subtitle="Inflow, outflow and net by month" />
            <div className="overflow-x-auto p-3">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                    <th className="px-3 py-2">Month</th>
                    <th className="px-3 py-2 text-right">Inflow (in)</th>
                    <th className="px-3 py-2 text-right">Outflow (out)</th>
                    <th className="px-3 py-2 text-right">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {cashChart.map((row) => (
                    <tr key={row.month} className="text-slate-600 dark:text-slate-300">
                      <td className="px-3 py-2.5 font-medium">{row.month}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(row.inflow, currency)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-amber-600 dark:text-amber-400">
                        {formatCurrency(row.outflow, currency)}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2.5 text-right font-mono font-bold",
                          row.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        )}
                      >
                        {formatCurrency(row.net, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {cashChart.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 font-bold dark:border-slate-700">
                      <td className="px-3 py-2.5">Total</td>
                      <td className="px-3 py-2.5 text-right font-mono text-emerald-600">
                        {formatCurrency(cashTotals.inflow, currency)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-amber-600">
                        {formatCurrency(cashTotals.outflow, currency)}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2.5 text-right font-mono",
                          cashTotals.net >= 0 ? "text-emerald-600" : "text-rose-600"
                        )}
                      >
                        {formatCurrency(cashTotals.net, currency)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
              {!cashFlowLoading && cashChart.length === 0 && (
                <p className="px-5 py-8 text-center text-sm text-slate-400">No monthly summary for this period.</p>
              )}
            </div>
          </Card>
          )}
        </>
      )}

      {view === "income-statement" && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ReportStat index={0} label="Total Income" value={formatCurrency(totalIncome, currency)} icon={<TrendingUp className="h-5 w-5" />} className="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" loading={incomeLoading} />
            <ReportStat index={1} label="Total Expenses" value={formatCurrency(totalExpense, currency)} icon={<TrendingDown className="h-5 w-5" />} className="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" loading={incomeLoading} />
            <ReportStat index={2} label="Net Profit" value={formatCurrency(netProfit, currency)} icon={<Wallet className="h-5 w-5" />} className="bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400" loading={incomeLoading} />
            <ReportStat index={3} label="Margin" value={`${marginPct}%`} icon={<PieChart className="h-5 w-5" />} className="bg-navy/10 text-navy dark:bg-brand-500/10 dark:text-brand-300" loading={incomeLoading} />
          </div>

          <Card className="border-dashed">
            <CardBody className="p-4 text-sm text-slate-600 dark:text-slate-300">
              <p className="font-semibold text-slate-800 dark:text-slate-100">What the income statement shows</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-emerald-600">Income / revenue</span> = money earned (customer
                payments, other income, member contributions).{" "}
                <span className="font-semibold text-amber-600">Expenses</span> = money spent running the business
                (hosting, salaries, tools, etc.). <span className="font-semibold text-navy dark:text-secondary-300">Net profit</span>{" "}
                = income − expenses. This is profitability — not the same as bank cash movement (see Cash Flow).
              </p>
            </CardBody>
          </Card>

          {displayMode === "charts" ? (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <ChartCard title="Revenue vs expenses (area)" subtitle="Trend over recent months" className="xl:col-span-2">
                <RevenueAreaChart data={monthlyChart} currency={currency} height={300} loading={monthlyLoading} />
              </ChartCard>
              <ChartCard title="Income vs expense mix" subtitle="Period totals as pie">
                <FullPieChart data={profitSplitChart} currency={currency} height={260} loading={incomeLoading} />
              </ChartCard>
              <ChartCard title="Side-by-side comparison" subtitle="Monthly bar chart" className="xl:col-span-2">
                <IncomeExpenseBarChart data={monthlyChart} currency={currency} height={280} loading={monthlyLoading} />
              </ChartCard>
              <ChartCard title="Net profit trend" subtitle="Profit / loss line">
                <NetTrendLineChart data={monthlyChart} currency={currency} height={280} loading={monthlyLoading} />
              </ChartCard>
            </div>
          ) : (
            <Card>
              <CardHeader
                title="Monthly income & expenses"
                subtitle="Table of revenue, expenses and net profit"
                action={
                  <Button size="sm" variant="secondary" onClick={() => exportReport("incomeStatement", "xlsx")}>
                    Export
                  </Button>
                }
              />
              <div className="overflow-x-auto p-3">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                      <th className="px-3 py-2">Month</th>
                      <th className="px-3 py-2 text-right">Income (revenue)</th>
                      <th className="px-3 py-2 text-right">Expenses</th>
                      <th className="px-3 py-2 text-right">Net profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {monthlyChart.map((row) => (
                      <tr key={row.month} className="text-slate-600 dark:text-slate-300">
                        <td className="px-3 py-2.5 font-medium">{row.month}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(row.income, currency)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-amber-600 dark:text-amber-400">
                          {formatCurrency(row.expense, currency)}
                        </td>
                        <td
                          className={cn(
                            "px-3 py-2.5 text-right font-mono font-bold",
                            row.profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                          )}
                        >
                          {formatCurrency(row.profit, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 font-bold dark:border-slate-700">
                      <td className="px-3 py-2.5">Period total</td>
                      <td className="px-3 py-2.5 text-right font-mono text-emerald-600">
                        {formatCurrency(totalIncome, currency)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-amber-600">
                        {formatCurrency(totalExpense, currency)}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2.5 text-right font-mono",
                          netProfit >= 0 ? "text-emerald-600" : "text-rose-600"
                        )}
                      >
                        {formatCurrency(netProfit, currency)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
                {!monthlyLoading && monthlyChart.length === 0 && (
                  <p className="px-5 py-8 text-center text-sm text-slate-400">No monthly rows for this period.</p>
                )}
              </div>
            </Card>
          )}
        </>
      )}

      {view === "expenses" && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <ReportStat index={0} label="Total Expenses" value={formatCurrency(totalExpenseCats, currency)} icon={<Receipt className="h-5 w-5" />} className="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" loading={expensesLoading} />
            <ReportStat index={1} label="Categories" value={String(expenseChart.length)} icon={<PieChart className="h-5 w-5" />} className="bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400" loading={expensesLoading} />
            <ReportStat index={2} label="Top category" value={topCategory?.name ?? "—"} icon={<TrendingUp className="h-5 w-5" />} className="bg-navy/10 text-navy dark:bg-brand-500/10 dark:text-brand-300" loading={expensesLoading} />
          </div>
          {displayMode === "charts" ? (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <ChartCard title="Spend by category" subtitle="Pie share of expenses" className="xl:col-span-1">
                <DonutChart
                  data={expenseChart.slice(0, 8)}
                  centerValue={formatCompactCurrency(totalExpenseCats, currency)}
                  centerLabel="Total"
                  height={280}
                  loading={expensesLoading}
                />
              </ChartCard>
              <ChartCard title="Category ranking" subtitle="Horizontal bars — largest spend first" className="xl:col-span-2">
                <HorizontalBarChart
                  data={expenseChart.slice(0, 10)}
                  currency={currency}
                  height={Math.max(280, expenseChart.slice(0, 10).length * 36)}
                  loading={expensesLoading}
                  color="#f59e0b"
                />
              </ChartCard>
            </div>
          ) : (
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
          )}
        </>
      )}

      {view === "statements" && (
        <>
          <div className="mb-1 flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setStatementType("customer")}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                  statementType === "customer"
                    ? "bg-white text-navy shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                )}
              >
                Customer
              </button>
              <button
                type="button"
                onClick={() => setStatementType("member")}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                  statementType === "member"
                    ? "bg-white text-navy shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                )}
              >
                Member
              </button>
            </div>

            {statementType === "customer" ? (
              <>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Customer</span>
                <select
                  className="min-w-[14rem] rounded-xl border-0 bg-white px-3 py-2 text-sm font-medium text-slate-800 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700"
                  value={statementCustomerId}
                  onChange={(e) => setStatementCustomerId(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">Select a customer…</option>
                  {allCustomers.map((c) => (
                    <option key={c.customerId} value={c.customerId}>
                      {c.customerName} ({c.customerCode})
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Member</span>
                <select
                  className="min-w-[14rem] rounded-xl border-0 bg-white px-3 py-2 text-sm font-medium text-slate-800 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700"
                  value={statementMemberId}
                  onChange={(e) => setStatementMemberId(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">Select a member…</option>
                  {members.map((m) => (
                    <option key={m.memberId} value={m.memberId}>
                      {m.memberName}{m.position ? ` · ${m.position}` : ""}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>

          {statementType === "customer" && selectedCustomer ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <ReportStat
                  index={0}
                  label="Total invoiced"
                  value={formatCurrency(statementTotals.invoiced, currency)}
                  icon={<Receipt className="h-5 w-5" />}
                  className="bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                  loading={false}
                />
                <ReportStat
                  index={1}
                  label="Total paid"
                  value={formatCurrency(statementTotals.paid, currency)}
                  icon={<TrendingUp className="h-5 w-5" />}
                  className="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                  loading={false}
                />
                <ReportStat
                  index={2}
                  label="Outstanding"
                  value={formatCurrency(statementTotals.outstanding, currency)}
                  icon={<Wallet className="h-5 w-5" />}
                  className="bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                  loading={false}
                />
              </div>

              <Card>
                <CardHeader
                  title={`${selectedCustomer.customerName} — Account Statement`}
                  subtitle={`${selectedCustomer.customerCode} · Period: ${periodHint}`}
                  action={
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleExport("pdf")}
                      leftIcon={<FileDown className="h-4 w-4" />}
                    >
                      Export PDF
                    </Button>
                  }
                />
                <div className="w-full overflow-x-auto">
                  <table className="w-full min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Time</th>
                        <th className="px-3 py-2">Description</th>
                        <th className="px-3 py-2 text-right">Debit</th>
                        <th className="px-3 py-2 text-right">Credit</th>
                        <th className="px-3 py-2 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {statementRows.map((r, i) => (
                        <tr key={i} className="text-slate-600 dark:text-slate-300">
                          <td className="px-3 py-2 text-xs">{formatDate(r.date)}</td>
                          <td className="px-3 py-2 text-xs text-slate-400">{formatTime(r.time)}</td>
                          <td className="px-3 py-2 font-medium">{r.desc}</td>
                          <td className={cn("px-3 py-2 text-right font-mono", r.debit > 0 && "text-rose-600 dark:text-rose-400")}>
                            {r.debit > 0 ? formatCurrency(r.debit, currency) : "—"}
                          </td>
                          <td className={cn("px-3 py-2 text-right font-mono", r.credit > 0 && "text-emerald-600 dark:text-emerald-400")}>
                            {r.credit > 0 ? formatCurrency(r.credit, currency) : "—"}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-semibold">
                            {formatCurrency(r.balance, currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {statementRows.length === 0 && (
                    <p className="px-5 py-8 text-center text-sm text-slate-400">No transactions for this customer yet.</p>
                  )}
                </div>
              </Card>
            </>
          ) : statementType === "member" && selectedMember ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <ReportStat
                  index={0}
                  label="Dues charged"
                  value={formatCurrency(memberStatementTotals.charged, currency)}
                  icon={<Receipt className="h-5 w-5" />}
                  className="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                  loading={memberStatementLoading}
                />
                <ReportStat
                  index={1}
                  label="Loans given"
                  value={formatCurrency(memberStatementTotals.loans ?? 0, currency)}
                  icon={<TrendingDown className="h-5 w-5" />}
                  className="bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400"
                  loading={memberStatementLoading}
                />
                <ReportStat
                  index={2}
                  label="Total paid"
                  value={formatCurrency(memberStatementTotals.paid, currency)}
                  icon={<TrendingUp className="h-5 w-5" />}
                  className="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                  loading={memberStatementLoading}
                />
                <ReportStat
                  index={3}
                  label="Net balance"
                  value={formatCurrency(memberStatementTotals.closingBalance ?? memberStatementTotals.loanBalance ?? 0, currency)}
                  icon={<Wallet className="h-5 w-5" />}
                  className="bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                  loading={memberStatementLoading}
                />
              </div>

              <Card>
                <CardHeader
                  title={`${selectedMember.memberName} — Member Statement`}
                  subtitle={`${selectedMember.position ?? "Member"} · Period: ${periodHint}`}
                  action={
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleExport("pdf")}
                      leftIcon={<FileDown className="h-4 w-4" />}
                    >
                      Export PDF
                    </Button>
                  }
                />
                <div className="w-full overflow-x-auto">
                  <table className="w-full min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Time</th>
                        <th className="px-3 py-2">Description</th>
                        <th className="px-3 py-2 text-right">Due</th>
                        <th className="px-3 py-2 text-right">Paid</th>
                        <th className="px-3 py-2 text-right">Loan</th>
                        <th className="px-3 py-2 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {memberStatementLoading ? (
                        <tr>
                          <td colSpan={7} className="px-3 py-8">
                            <Skeleton className="h-8 w-full" />
                          </td>
                        </tr>
                      ) : (
                        memberStatementRows.map((r, i) => (
                          <tr key={i} className="text-slate-600 dark:text-slate-300">
                            <td className="px-3 py-2 text-xs">{r.date}</td>
                            <td className="px-3 py-2 text-xs text-slate-400">{r.time}</td>
                            <td className="px-3 py-2 font-medium">{r.description}</td>
                            <td className={cn("px-3 py-2 text-right font-mono", r.due > 0 && "text-rose-600 dark:text-rose-400")}>
                              {r.due > 0 ? formatCurrency(r.due, currency) : "—"}
                            </td>
                            <td className={cn("px-3 py-2 text-right font-mono", r.paid > 0 && "text-emerald-600 dark:text-emerald-400")}>
                              {r.paid > 0 ? formatCurrency(r.paid, currency) : "—"}
                            </td>
                            <td className={cn("px-3 py-2 text-right font-mono", r.loan > 0 && "text-amber-600 dark:text-amber-400")}>
                              {r.loan > 0 ? formatCurrency(r.loan, currency) : "—"}
                            </td>
                            <td
                              className={cn(
                                "px-3 py-2 text-right font-mono text-xs font-semibold",
                                r.balance > 0
                                  ? "text-rose-600 dark:text-rose-400"
                                  : "text-slate-800 dark:text-slate-100"
                              )}
                            >
                              {formatMemberStatementBalance(r.balance, currency)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  {!memberStatementLoading && memberStatementRows.length === 0 && (
                    <p className="px-5 py-8 text-center text-sm text-slate-400">No contribution activity for this member in this period.</p>
                  )}
                </div>
              </Card>
            </>
          ) : (
            <Card>
              <CardBody className="py-12 text-center text-sm text-slate-500">
                Select a {statementType === "member" ? "member" : "customer"} above to view their account statement.
              </CardBody>
            </Card>
          )}
        </>
      )}

      {view === "accounts" && (
        <>
          <Card>
            <CardHeader title="Account balances" subtitle={`All accounts · ${periodHint}`} />
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                    <th className="px-3 py-2">Institution</th>
                    <th className="px-3 py-2">Account #</th>
                    <th className="px-3 py-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {accountsList.map((a) => (
                    <tr key={a.accId} className="text-slate-600 dark:text-slate-300">
                      <td className="px-3 py-2.5 font-medium">
                        {a.institution}
                        {a.isDefault ? (
                          <Badge className="ml-2 bg-amber-50 text-amber-700 ring-amber-200">Default</Badge>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs">{a.number}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold">
                        {formatCurrency(Number(a.balance), currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {accountsList.length > 0 && (
                  <tfoot>
                    <tr className="border-t border-slate-200 font-semibold dark:border-slate-700">
                      <td className="px-3 py-2.5" colSpan={2}>
                        Total
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono">{formatCurrency(totalAccountBalance, currency)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
              {accountsList.length === 0 && (
                <p className="px-5 py-8 text-center text-sm text-slate-400">No accounts yet. Create one under Accounts.</p>
              )}
            </div>
          </Card>

          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Account</span>
            <select
              className="min-w-[14rem] rounded-xl border-0 bg-white px-3 py-2 text-sm font-medium text-slate-800 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700"
              value={reportAccountId}
              onChange={(e) => setReportAccountId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Select an account…</option>
              {accountsList.map((a) => (
                <option key={a.accId} value={a.accId}>
                  {formatAccountOptionLabel(a, currency)}
                </option>
              ))}
            </select>
          </div>

          {selectedReportAccount ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <ReportStat
                  index={0}
                  label="Current balance"
                  value={formatCurrency(Number(accountStatementData?.account?.balance ?? selectedReportAccount.balance), currency)}
                  icon={<Landmark className="h-5 w-5" />}
                  className="bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                  loading={false}
                />
                <ReportStat
                  index={1}
                  label="Debit (receipts)"
                  value={formatCurrency(accountStatementTotals.debits, currency)}
                  icon={<TrendingUp className="h-5 w-5" />}
                  className="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                  loading={false}
                />
                <ReportStat
                  index={2}
                  label="Credit (payments)"
                  value={formatCurrency(accountStatementTotals.credits, currency)}
                  icon={<TrendingDown className="h-5 w-5" />}
                  className="bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                  loading={false}
                />
              </div>

              <Card>
                <CardHeader
                  title={`${selectedReportAccount.institution} — Statement`}
                  subtitle={`${selectedReportAccount.number} · Period: ${periodHint}`}
                />
                <div className="w-full overflow-x-auto">
                  <table className="w-full min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Time</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2">Description</th>
                        <th className="px-3 py-2 text-right">Debit (in)</th>
                        <th className="px-3 py-2 text-right">Credit (out)</th>
                        <th className="px-3 py-2 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {accountMovements.map((m, i) => (
                        <tr key={i} className="text-slate-600 dark:text-slate-300">
                          <td className="px-3 py-2 text-xs">{formatDate(m.movementDate)}</td>
                          <td className="px-3 py-2 text-xs text-slate-400">{formatTime(m.movementDate)}</td>
                          <td className="px-3 py-2 capitalize">
                            {m.movementType === "income"
                              ? "Receipt"
                              : m.movementType === "expense"
                                ? "Payment"
                                : m.movementType === "loan_out"
                                  ? "Member loan"
                                  : m.movementType === "loan_repay"
                                    ? "Loan repayment"
                                    : m.movementType === "opening"
                                      ? "Opening"
                                      : m.movementType.replace(/_/g, " ")}
                          </td>
                          <td className="px-3 py-2 font-medium">{m.description || m.referenceLabel}</td>
                          <td className={cn("px-3 py-2 text-right font-mono", m.debit > 0 && "text-emerald-600 dark:text-emerald-400")}>
                            {m.debit > 0 ? formatCurrency(m.debit, currency) : "—"}
                          </td>
                          <td className={cn("px-3 py-2 text-right font-mono", m.credit > 0 && "text-rose-600 dark:text-rose-400")}>
                            {m.credit > 0 ? formatCurrency(m.credit, currency) : "—"}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-semibold">
                            {formatCurrency(m.balance, currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {accountMovements.length === 0 && (
                    <p className="px-5 py-8 text-center text-sm text-slate-400">No movements for this account in the selected period.</p>
                  )}
                </div>
              </Card>
            </>
          ) : (
            <Card>
              <CardBody className="py-12 text-center text-sm text-slate-500">
                Select an account above to view its statement.
              </CardBody>
            </Card>
          )}
        </>
      )}

      {view === "customers" && (
        <>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {(["all", "unpaid", "partial", "paid"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setCustomerPayFilter(filter)}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs font-semibold capitalize transition",
                  customerPayFilter === filter
                    ? "bg-navy text-white dark:bg-brand-500"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                )}
              >
                {filter === "all" ? "All" : filter}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            <ReportStat index={0} label="Unpaid" value={String(customerPaySummary.unpaidCount)} icon={<Users className="h-5 w-5" />} className="bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400" loading={customersLoading} />
            <ReportStat index={1} label="Partial" value={String(customerPaySummary.partialCount)} icon={<Users className="h-5 w-5" />} className="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" loading={customersLoading} />
            <ReportStat index={2} label="Paid" value={String(customerPaySummary.paidCount)} icon={<Users className="h-5 w-5" />} className="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" loading={customersLoading} />
            <ReportStat index={3} label="Outstanding" value={formatCurrency(customerPaySummary.totalOutstanding, currency)} icon={<Wallet className="h-5 w-5" />} className="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" loading={customersLoading} />
            <ReportStat index={4} label="Collected" value={formatCurrency(customerPaySummary.totalCollected, currency)} icon={<TrendingUp className="h-5 w-5" />} className="bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400" loading={customersLoading} />
          </div>
          {displayMode === "charts" ? (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <ChartCard title="Payment status" subtitle="Unpaid, partial, and paid customers">
                <DonutChart
                  data={customerStatusChart}
                  centerValue={String(
                    customerPaySummary.unpaidCount + customerPaySummary.partialCount + customerPaySummary.paidCount
                  )}
                  centerLabel="Customers"
                  height={260}
                  loading={customersLoading}
                />
              </ChartCard>
              <ChartCard title="Who owes the most" subtitle="Horizontal bar — outstanding balances" className="xl:col-span-2">
                <HorizontalBarChart
                  data={customerChart}
                  currency={currency}
                  height={Math.max(260, customerChart.length * 40)}
                  loading={customersLoading}
                  color="#f43f5e"
                />
              </ChartCard>
            </div>
          ) : (
            <Card>
              <CardHeader
                title="Customer payment status"
                subtitle="Unpaid, partial, and paid — with last payment date"
                action={
                  <Button size="sm" variant="secondary" onClick={() => exportReport("customerPaymentStatus", "xlsx")}>
                    Export
                  </Button>
                }
              />
              <div className="overflow-x-auto p-3">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                      <th className="px-3 py-2">Customer</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Last payment</th>
                      <th className="px-3 py-2 text-right">Invoiced</th>
                      <th className="px-3 py-2 text-right">Paid</th>
                      <th className="px-3 py-2 text-right">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {customerRows.map((c) => {
                      const status = String(c.paymentStatus ?? c.payment_status ?? "—");
                      const invoiced = Number(c.totalInvoiced ?? c.total_invoiced ?? 0);
                      const paid = Number(c.totalPaid ?? c.total_paid ?? 0);
                      const amt = Number(c.outstanding) || 0;
                      const lastPaid = (c.lastPaymentAt ?? c.last_payment_at) as string | undefined;
                      const statusStyle =
                        status === "Paid"
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300"
                          : status === "Partial"
                            ? "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300"
                            : "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300";
                      return (
                        <tr key={String(c.customerId ?? c.customer_id)} className="text-slate-600 dark:text-slate-300">
                          <td className="px-3 py-2.5 font-medium text-slate-800 dark:text-slate-100">{String(c.customerName ?? c.customer_name)}</td>
                          <td className="px-3 py-2.5">
                            <Badge className={statusStyle}>{status}</Badge>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-slate-500">
                            {lastPaid ? (
                              <>
                                <span className="font-medium text-slate-700 dark:text-slate-200">
                                  {formatDate(lastPaid)}
                                </span>
                                <span className="ml-1.5 text-slate-400">{formatTime(lastPaid)}</span>
                              </>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono">{formatCurrency(invoiced, currency)}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(paid, currency)}</td>
                          <td className={cn("px-3 py-2.5 text-right font-mono font-bold", amt > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400")}>
                            {formatCurrency(amt, currency)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!customersLoading && customerRows.length === 0 && (
                  <p className="px-5 py-8 text-center text-sm text-slate-400">No customers match this filter.</p>
                )}
              </div>
            </Card>
          )}
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ReportStat index={0} label="Expected" value={formatCurrency(Number(contributionData?.summary?.expected ?? 0), currency)} icon={<Wallet className="h-5 w-5" />} className="bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400" loading={contributionLoading} />
            <ReportStat index={1} label="Collected" value={formatCurrency(Number(contributionData?.summary?.collected ?? 0), currency)} icon={<TrendingUp className="h-5 w-5" />} className="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" loading={contributionLoading} />
            <ReportStat index={2} label="Outstanding" value={formatCurrency(Number(contributionData?.summary?.expected ?? 0) - Number(contributionData?.summary?.collected ?? 0), currency)} icon={<TrendingDown className="h-5 w-5" />} className="bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400" loading={contributionLoading} />
            <ReportStat index={3} label="Collection rate" value={`${memberCollectionPct}%`} icon={<Users className="h-5 w-5" />} className="bg-navy/10 text-navy dark:bg-brand-500/10 dark:text-brand-300" loading={contributionLoading} />
          </div>
          {displayMode === "charts" ? (
            <>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <ChartCard title="Member status" subtitle="Pie — paid / partial / pending">
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
                <ChartCard title="Collection stack" subtitle="Stacked bar of dues status" className="xl:col-span-2">
                  <StackedStatusBarChart data={memberStackChart} height={260} loading={contributionLoading} />
                </ChartCard>
              </div>
              <Card>
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
            </>
          ) : (
            <Card>
              <CardHeader
                title="Member dues"
                subtitle={`${contributionData?.dues?.length ?? 0} members in this batch`}
                action={
                  <Button size="sm" variant="secondary" onClick={() => exportReport("contributionReport", "xlsx")} leftIcon={<Download className="h-4 w-4" />}>
                    Export
                  </Button>
                }
              />
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
          )}
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-xl bg-white p-3.5 shadow-card ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
          {loading ? (
            <Skeleton className="mt-1.5 h-6 w-24" />
          ) : (
            <p className="mt-1 truncate text-lg font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
          )}
        </div>
        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg [&_svg]:h-4 [&_svg]:w-4", className)}>{icon}</span>
      </div>
    </motion.div>
  );
}
