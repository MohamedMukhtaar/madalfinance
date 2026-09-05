import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Banknote,
  Briefcase,
  Building2,
  Calendar,
  CircleDot,
  Download,
  Eye,
  FileDown,
  FileSpreadsheet,
  Hash,
  Mail,
  MapPin,
  Phone,
  StickyNote,
  Table2,
  User,
  Users,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton, EmptyState, Tabs, DateRangeFilter, Modal, type DateFilterMode } from "@/components/ui";
import { DataTable } from "@/components/tables/DataTable";

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
  useCustomerStatement,
  useDues,
  useExpenseByCategoryReport,
  useExpenseCategories,
  useExpenseStatement,
  useIncomeStatement,
  useMemberStatement,
  useMembers,
  useEmployees,
  useMonthlyRevenueReport,
  useCustomerPaymentReport,
  useProjectStatement,
  useProjects,
  useTransactions,
} from "@/hooks/queries";
import { useSettings } from "@/context/SettingsContext";
import { formatCurrency, formatCompactCurrency, formatDate, formatTime, formatAccountOptionLabel } from "@/utils/format";
import { matchesDateFilter } from "@/utils/dateFilter";
import { financeService } from "@/services/finance";
import { api, getErrorMessage } from "@/services/api";
import { DUE_STATUS_STYLES, CUSTOMER_STATUS_STYLES } from "@/utils/constants";
import { cn } from "@/utils/cn";
import type { Employee, LedgerTransaction } from "@/types";
import { StatementTable } from "@/features/reports/StatementTable";
import toast from "react-hot-toast";

const VIEWS = [
  { id: "customers", label: "Collections", path: "/reports/customers" },
  { id: "statements", label: "Statements", path: "/reports/statements" },
  { id: "employees", label: "HR", path: "/reports/employees" },
  { id: "accounts", label: "Cash books", path: "/reports/accounts" },
  { id: "expenses", label: "Spending", path: "/reports/expenses" },
  { id: "members", label: "Member dues", path: "/reports/members" },
  { id: "income-statement", label: "Profit & loss", path: "/reports/income-statement" },
  { id: "cash-flow", label: "Cash in / out", path: "/reports/cash-flow" },
] as const;

const VIEW_HINTS: Record<(typeof VIEWS)[number]["id"], string> = {
  customers: "Who still owes setup fees, rent, or other invoices — and what has already been collected.",
  statements: "A running ledger for one customer, member, project, or expense.",
  employees: "Staff profile plus salary charges and payments.",
  accounts: "Cash and bank movement per account.",
  expenses: "Where money went, grouped by category.",
  members: "Member contributions, loans, and dues.",
  "income-statement": "Revenue minus expenses for the selected period.",
  "cash-flow": "Money that actually entered or left the ledger — not billed-but-unpaid invoices.",
};

type ViewId = (typeof VIEWS)[number]["id"];

type StatementKind = "customer" | "member" | "project" | "expense";

const STATEMENT_KINDS: Array<{ id: StatementKind; label: string }> = [
  { id: "customer", label: "Customer" },
  { id: "member", label: "Member" },
  { id: "project", label: "Project" },
  { id: "expense", label: "Expense" },
];

const selectClass =
  "min-w-[14rem] rounded-xl border-0 bg-white px-3 py-2 text-sm font-medium text-slate-800 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700";

function dueBatchLabel(batch: { batchId: number; month?: number; year?: number }) {
  const month = Number(batch.month);
  const year = Number(batch.year);
  if (month >= 1 && month <= 12 && year > 1900) {
    return new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  return `Batch #${batch.batchId}`;
}

function ProfileCard({
  title,
  icon: Icon,
  fields,
}: {
  title: string;
  icon: LucideIcon;
  fields: Array<{ label: string; value: ReactNode; icon: LucideIcon }>;
}) {
  return (
    <div className="stat-hover group flex h-full min-h-[16rem] flex-col rounded-2xl bg-card p-4 ring-1 ring-line transition-colors duration-200">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <span className="stat-hover-icon inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="grid flex-1 grid-cols-2 content-start gap-4">
        {fields.map((field) => {
          const FieldIcon = field.icon;
          return (
            <div key={field.label} className="min-w-0">
              <div className="mb-1 flex items-center gap-1.5">
                <FieldIcon className="h-3.5 w-3.5 shrink-0 text-slate-400 transition-colors group-hover:!text-white/70" />
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 transition-colors group-hover:!text-white/70">
                  {field.label}
                </p>
              </div>
              <p className="truncate text-sm font-semibold text-ink transition-colors group-hover:!text-white">
                {field.value ?? "—"}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmployeeReportCards({ employee, currency }: { employee: Employee; currency: string }) {
  return (
    <div className="grid auto-rows-fr grid-cols-1 gap-3 lg:grid-cols-3">
      <ProfileCard
        title="Profile"
        icon={User}
        fields={[
          { label: "Name", icon: User, value: employee.fullName },
          { label: "Code", icon: Hash, value: employee.employeeCode },
          { label: "Phone", icon: Phone, value: employee.phone || "—" },
          { label: "Email", icon: Mail, value: employee.email || "—" },
        ]}
      />
      <ProfileCard
        title="Job"
        icon={Briefcase}
        fields={[
          { label: "Job title", icon: Briefcase, value: employee.jobTitle || "—" },
          { label: "Department", icon: Building2, value: employee.department || "—" },
          { label: "Branch", icon: MapPin, value: employee.branch || "—" },
          { label: "Shift", icon: Calendar, value: employee.shift || "—" },
        ]}
      />
      <ProfileCard
        title="Salary"
        icon={Banknote}
        fields={[
          { label: "Basic salary", icon: Banknote, value: formatCurrency(Number(employee.basicSalary), currency) },
          { label: "Hire date", icon: Calendar, value: formatDate(employee.hireDate) },
          { label: "Status", icon: CircleDot, value: employee.status },
          { label: "Notes", icon: StickyNote, value: employee.notes || "—" },
        ]}
      />
    </div>
  );
}

const employeeColumnHelper = createColumnHelper<Employee>();

const CHART_PALETTE = ["#74bcf8", "#101848", "#4aa6ef", "#10b981", "#f59e0b", "#1a255c", "#f43f5e", "#14b8a6"];

function resolveView(param?: string): ViewId {
  if (param === "salary") return "employees";
  if (
    param === "customers" ||
    param === "statements" ||
    param === "employees" ||
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
  const [dateMode, setDateMode] = useState<DateFilterMode>("all");
  const [day, setDay] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

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

  const dateParams = useMemo(() => {
    if (dateMode === "day" && day) return { fromDate: day, toDate: day };
    if (dateMode === "range") {
      const next: { fromDate?: string; toDate?: string } = {};
      if (from) next.fromDate = from;
      if (to) next.toDate = to;
      return next;
    }
    return {};
  }, [dateMode, day, from, to]);

  const { data: customersData } = useCustomers({ enabled: view === "statements" });
  const allCustomers = customersData?.rows ?? [];
  const { data: income, isLoading: incomeLoading } = useIncomeStatement({ ...dateParams, enabled: view === "income-statement" });
  const { data: customers, isLoading: customersLoading } = useCustomerPaymentReport({ enabled: view === "customers" });
  const { data: expenses, isLoading: expensesLoading } = useExpenseByCategoryReport({ ...dateParams, enabled: view === "expenses" });
  const { data: monthly, isLoading: monthlyLoading } = useMonthlyRevenueReport({
    months: 12,
    ...dateParams,
    enabled: view === "income-statement" || view === "cash-flow",
  });
  const { data: cashFlow, isLoading: cashFlowLoading } = useCashFlowReport({ ...dateParams, enabled: view === "cash-flow" });
  const { data: cashFlowTxData, isLoading: cashFlowTxLoading } = useTransactions({
    ...dateParams,
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

  const { data: duesData } = useDues({ enabled: view === "members", perPage: 100, sort: "batch_id:desc" });
  const batches = duesData?.rows ?? [];
  const batchId = Number(searchParams.get("batchId")) || batches[0]?.batchId;
  const { data: contribution, isLoading: contributionLoading } = useContributionReport(batchId, {
    enabled: view === "members" && !!batchId,
  });

  const [statementCustomerId, setStatementCustomerId] = useState<number | "">("");
  const [statementMemberId, setStatementMemberId] = useState<number | "">("");
  const [statementProjectId, setStatementProjectId] = useState<number | "">("");
  const [statementExpenseId, setStatementExpenseId] = useState<number | "">("");
  const [statementEmployeeId, setStatementEmployeeId] = useState<number | "">("");
  const [statementType, setStatementType] = useState<StatementKind>("customer");
  const [reportAccountId, setReportAccountId] = useState<number | "">("");

  const { data: accountsList = [] } = useAccounts({ enabled: view === "accounts" });
  const { data: members = [] } = useMembers({ enabled: view === "statements" });
  const { data: employeesData, isLoading: employeesLoading } = useEmployees({ enabled: view === "employees", perPage: 500 });
  const statementEmployees = employeesData?.rows ?? [];
  const { data: projectsData } = useProjects({ enabled: view === "statements", perPage: 100 });
  const { data: expenseCategories = [] } = useExpenseCategories();
  const statementProjects = projectsData?.rows ?? [];

  const { data: memberStatementData, isLoading: memberStatementLoading } = useMemberStatement(
    statementMemberId || undefined,
    { ...dateParams, enabled: view === "statements" && statementType === "member" && !!statementMemberId }
  );
  const { data: customerStatementData, isLoading: customerStatementLoading } = useCustomerStatement(
    statementCustomerId || undefined,
    { ...dateParams, enabled: view === "statements" && statementType === "customer" && !!statementCustomerId }
  );
  const { data: projectStatementData, isLoading: projectStatementLoading } = useProjectStatement(
    statementProjectId || undefined,
    { ...dateParams, enabled: view === "statements" && statementType === "project" && !!statementProjectId }
  );
  const { data: expenseStatementData, isLoading: expenseStatementLoading } = useExpenseStatement(
    statementExpenseId || undefined,
    { ...dateParams, enabled: view === "statements" && statementType === "expense" }
  );
  const { data: accountStatementData } = useAccountStatement(
    reportAccountId || undefined,
    { ...dateParams, enabled: view === "accounts" && !!reportAccountId }
  );
  const selectedCustomer = useMemo(
    () => allCustomers.find((c) => c.customerId === statementCustomerId),
    [allCustomers, statementCustomerId]
  );

  const selectedMember = useMemo(
    () => members.find((m) => m.memberId === statementMemberId),
    [members, statementMemberId]
  );

  const selectedProject = useMemo(
    () => statementProjects.find((p) => p.projectId === statementProjectId),
    [statementProjects, statementProjectId]
  );

  const selectedExpense = useMemo(
    () => expenseCategories.find((c) => c.id === statementExpenseId),
    [expenseCategories, statementExpenseId]
  );

  const selectedEmployee = useMemo(
    () => statementEmployees.find((e) => e.employeeId === statementEmployeeId),
    [statementEmployees, statementEmployeeId]
  );

  const filteredEmployees = useMemo(
    () =>
      statementEmployees.filter((e) =>
        matchesDateFilter(e.hireDate, { mode: dateMode, date: day, from, to })
      ),
    [statementEmployees, dateMode, day, from, to]
  );

  const employeeColumns = useMemo<ColumnDef<Employee>[]>(
    () => [
      employeeColumnHelper.accessor("fullName", {
        header: "Name",
        cell: (info) => {
          const e = info.row.original;
          return (
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-100">{e.fullName}</p>
              <p className="text-xs text-slate-400">{e.employeeCode}</p>
            </div>
          );
        },
      }),
      employeeColumnHelper.accessor("phone", {
        header: "Phone",
        cell: (info) => <span className="text-sm text-slate-500">{info.getValue() || "—"}</span>,
      }),
      employeeColumnHelper.accessor("department", {
        header: "Dept",
        cell: (info) => <span className="text-slate-500">{info.getValue() || "—"}</span>,
      }),
      employeeColumnHelper.accessor("jobTitle", {
        header: "Title",
        cell: (info) => <span className="text-slate-600 dark:text-slate-300">{info.getValue() || "—"}</span>,
      }),
      employeeColumnHelper.accessor("branch", {
        header: "Branch",
        cell: (info) => <span className="text-slate-500">{info.getValue() || "—"}</span>,
      }),
      employeeColumnHelper.accessor("shift", {
        header: "Shift",
        cell: (info) => <span className="text-slate-500">{info.getValue() || "—"}</span>,
      }),
      employeeColumnHelper.accessor("hireDate", {
        header: "Hired",
        cell: (info) => <span className="text-sm text-slate-500">{formatDate(info.getValue())}</span>,
      }),
      employeeColumnHelper.accessor("basicSalary", {
        header: "Basic salary",
        cell: (info) => (
          <span className="font-mono font-semibold text-slate-900 dark:text-white">
            {formatCurrency(info.getValue(), currency)}
          </span>
        ),
      }),
      employeeColumnHelper.accessor("status", {
        header: "Status",
        cell: (info) => (
          <Badge className={CUSTOMER_STATUS_STYLES[info.getValue()] ?? ""} dot>
            {info.getValue()}
          </Badge>
        ),
      }),
      employeeColumnHelper.display({
        id: "view",
        header: "",
        cell: (info) => (
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<Eye className="h-4 w-4" />}
            onClick={(e) => {
              e.stopPropagation();
              setStatementEmployeeId(info.row.original.employeeId);
            }}
          >
            View
          </Button>
        ),
      }),
    ],
    [currency]
  );

  const memberStatementRows = memberStatementData?.rows ?? [];
  const customerStatementRows = customerStatementData?.rows ?? [];
  const projectStatementRows = projectStatementData?.rows ?? [];
  const expenseStatementRows = expenseStatementData?.rows ?? [];

  const selectedReportAccount = useMemo(
    () => accountsList.find((a) => a.accId === reportAccountId),
    [accountsList, reportAccountId]
  );

  const totalAccountBalance = useMemo(
    () => accountsList.reduce((s, a) => s + Number(a.balance ?? 0), 0),
    [accountsList]
  );

  const accountMovements = accountStatementData?.movements ?? [];

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
        if (statementType === "project" && statementProjectId) {
          return { kind: "projectStatement", params: { projectId: statementProjectId } };
        }
        if (statementType === "expense") {
          return {
            kind: "expenseStatement",
            params: statementExpenseId ? { expenseId: statementExpenseId } : {},
          };
        }
        return null;
      case "employees":
        return { kind: "employeeList" };
      default:
        return null;
    }
  }, [view, reportAccountId, statementType, statementMemberId, statementCustomerId, statementProjectId, statementExpenseId]);

  const exportReport = async (kind: string, format: "pdf" | "xlsx", extra?: Record<string, unknown>) => {
    try {
      const url = await financeService.exportReportUrl(kind, format, {
        ...(batchId ? { batchId } : {}),
        ...exportConfig?.params,
        ...dateParams,
        ...extra,
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
          ? "Select a customer, member, project, or expense to export their statement"
          : "Nothing to export on this tab"
      );
      return;
    }
    void exportReport(exportConfig.kind, format);
  };

  const periodHint =
    dateMode === "day" && day
      ? formatDate(day)
      : dateMode === "range" && (from || to)
        ? `${from ? formatDate(from) : "…"} – ${to ? formatDate(to) : "…"}`
        : "All dates";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle={VIEW_HINTS[view]}
        actions={
          <>
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

      {(view === "cash-flow" ||
        view === "income-statement" ||
        view === "expenses" ||
        view === "customers" ||
        view === "members") && (
      <div className="flex justify-end">
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
      )}

      {view === "cash-flow" && (
        <>
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
          <Card className="border-dashed">
            <CardBody className="p-4 text-sm text-slate-600 dark:text-slate-300">
              <p className="font-semibold text-slate-800 dark:text-slate-100">What profit & loss shows</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-emerald-600">Income / revenue</span> = money earned (customer
                payments, other income, member contributions).{" "}
                <span className="font-semibold text-amber-600">Expenses</span> = money spent running the business
                (hosting, salaries, tools, etc.). <span className="font-semibold text-navy dark:text-secondary-300">Net profit</span>{" "}
                = income − expenses. This is profitability — not the same as bank cash movement (see Cash in / out).
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
            <div className="inline-flex flex-wrap rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              {STATEMENT_KINDS.map((kind) => (
                <button
                  key={kind.id}
                  type="button"
                  onClick={() => setStatementType(kind.id)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                    statementType === kind.id
                      ? "bg-white text-navy shadow-sm dark:bg-slate-700 dark:text-white"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                  )}
                >
                  {kind.label}
                </button>
              ))}
            </div>

            {statementType === "customer" && (
              <>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Customer</span>
                <select
                  className={selectClass}
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
            )}
            {statementType === "member" && (
              <>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Member</span>
                <select
                  className={selectClass}
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
            {statementType === "project" && (
              <>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Project</span>
                <select
                  className={selectClass}
                  value={statementProjectId}
                  onChange={(e) => setStatementProjectId(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">Select a project…</option>
                  {statementProjects.map((p) => (
                    <option key={p.projectId} value={p.projectId}>
                      {p.projectName}
                    </option>
                  ))}
                </select>
              </>
            )}
            {statementType === "expense" && (
              <>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Expense</span>
                <select
                  className={selectClass}
                  value={statementExpenseId}
                  onChange={(e) => setStatementExpenseId(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">All expenses</option>
                  {expenseCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>

          {statementType === "customer" && selectedCustomer ? (
            <Card>
              <CardHeader
                title={`${selectedCustomer.customerName} — Customer Statement`}
                subtitle={`${selectedCustomer.customerCode} · Period: ${periodHint}`}
                action={
                  <Button size="sm" variant="secondary" onClick={() => handleExport("pdf")} leftIcon={<FileDown className="h-4 w-4" />}>
                    Export PDF
                  </Button>
                }
              />
              <StatementTable
                rows={customerStatementRows}
                loading={customerStatementLoading}
                currency={currency}
                empty="No transactions for this customer in this period."
              />
            </Card>
          ) : statementType === "member" && selectedMember ? (
            <Card>
              <CardHeader
                title={`${selectedMember.memberName} — Member Statement`}
                subtitle={`${selectedMember.position ?? "Member"} · Period: ${periodHint}`}
                action={
                  <Button size="sm" variant="secondary" onClick={() => handleExport("pdf")} leftIcon={<FileDown className="h-4 w-4" />}>
                    Export PDF
                  </Button>
                }
              />
              <StatementTable
                rows={memberStatementRows}
                loading={memberStatementLoading}
                showLoan
                memberBalance
                currency={currency}
                empty="No contribution activity for this member in this period."
              />
            </Card>
          ) : statementType === "project" && selectedProject ? (
            <Card>
              <CardHeader
                title={`${selectedProject.projectName} — Project Statement`}
                subtitle={`Period: ${periodHint}`}
                action={
                  <Button size="sm" variant="secondary" onClick={() => handleExport("pdf")} leftIcon={<FileDown className="h-4 w-4" />}>
                    Export PDF
                  </Button>
                }
              />
              <StatementTable
                rows={projectStatementRows}
                loading={projectStatementLoading}
                currency={currency}
                empty="No invoices or payments for this project in this period."
              />
            </Card>
          ) : statementType === "expense" ? (
            <Card>
              <CardHeader
                title={`${selectedExpense?.name ?? "All expenses"} — Expense Statement`}
                subtitle={`Period: ${periodHint}`}
                action={
                  <Button size="sm" variant="secondary" onClick={() => handleExport("pdf")} leftIcon={<FileDown className="h-4 w-4" />}>
                    Export PDF
                  </Button>
                }
              />
              <StatementTable
                rows={expenseStatementRows}
                loading={expenseStatementLoading}
                currency={currency}
                showName={!selectedExpense}
                empty="No charges or payments for this period."
              />
            </Card>
          ) : (
            <Card>
              <CardBody className="py-12 text-center text-sm text-slate-500">
                Select a {statementType} above to view its statement.
              </CardBody>
            </Card>
          )}
        </>
      )}

      {view === "employees" && (
        <>
          <DataTable
            columns={employeeColumns}
            data={filteredEmployees}
            loading={employeesLoading}
            searchPlaceholder="Search employees…"
            emptyTitle="No employees yet"
            emptyDescription="Add staff on the Employees page to view reports."
            getRowId={(row) => String(row.employeeId)}
          />
          <Modal
            open={!!selectedEmployee}
            onClose={() => setStatementEmployeeId("")}
            title={selectedEmployee ? `${selectedEmployee.fullName} — Employee Report` : "Employee Report"}
            subtitle={
              selectedEmployee
                ? `${selectedEmployee.employeeCode}${selectedEmployee.jobTitle ? ` · ${selectedEmployee.jobTitle}` : ""}`
                : undefined
            }
            size="xl"
            headerActions={
              selectedEmployee ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => exportReport("employeeReport", "pdf", { employeeId: selectedEmployee.employeeId })}
                  leftIcon={<FileDown className="h-4 w-4" />}
                >
                  Export PDF
                </Button>
              ) : undefined
            }
          >
            {selectedEmployee ? <EmployeeReportCards employee={selectedEmployee} currency={currency} /> : null}
          </Modal>
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
                        <th className="px-3 py-2">Reference</th>
                        <th className="px-3 py-2 text-right">Debit</th>
                        <th className="px-3 py-2 text-right">Credit</th>
                        <th className="px-3 py-2 text-right">Loan</th>
                        <th className="px-3 py-2 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {accountMovements.map((m, i) => (
                        <tr key={i} className="text-slate-600 dark:text-slate-300">
                          <td className="px-3 py-2 text-xs">{formatDate(m.movementDate)}</td>
                          <td className="px-3 py-2 text-xs text-slate-400">{formatTime(m.time ?? m.movementDate)}</td>
                          <td className="px-3 py-2 font-medium">{m.description || m.movementType || "—"}</td>
                          <td className="px-3 py-2 font-mono text-xs">{m.referenceLabel || "—"}</td>
                          <td className={cn("px-3 py-2 text-right font-mono", m.debit > 0 && "text-emerald-600 dark:text-emerald-400")}>
                            {m.debit > 0 ? formatCurrency(m.debit, currency) : "—"}
                          </td>
                          <td className={cn("px-3 py-2 text-right font-mono", m.credit > 0 && "text-rose-600 dark:text-rose-400")}>
                            {m.credit > 0 ? formatCurrency(m.credit, currency) : "—"}
                          </td>
                          <td className={cn("px-3 py-2 text-right font-mono", Number(m.loan ?? 0) > 0 && "text-amber-600 dark:text-amber-400")}>
                            {Number(m.loan ?? 0) > 0 ? formatCurrency(Number(m.loan), currency) : "—"}
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
          <div className="mb-1 flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Due batch</span>
            <select
              className={selectClass}
              value={batchId ? String(batchId) : ""}
              onChange={(e) => {
                const next = new URLSearchParams(searchParams);
                if (e.target.value) next.set("batchId", e.target.value);
                else next.delete("batchId");
                setSearchParams(next);
              }}
            >
              {batches.length === 0 ? (
                <option value="">No due batches yet</option>
              ) : (
                batches.map((b) => (
                  <option key={b.batchId} value={b.batchId}>
                    {dueBatchLabel(b)}
                  </option>
                ))
              )}
            </select>
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
