import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import {
  ArrowLeft,
  Building2,
  Mail,
  MapPin,
  Phone,
  User,
  FolderKanban,
  FileText,
  CreditCard,
  ScrollText,
} from "lucide-react";
import { useCustomer, useProjects, useInvoices, usePayments, useCustomerDetailStatement } from "@/hooks/queries";
import { useSettings } from "@/context/SettingsContext";
import { DataTable } from "@/components/tables/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge, Avatar, Skeleton, SkeletonText, ErrorState, Button, Tabs, StatCard, StatCardsGrid } from "@/components/ui";
import { CUSTOMER_STATUS_STYLES, INVOICE_STATUS_STYLES } from "@/utils/constants";
import { describeInvoice, INVOICE_KIND_STYLES } from "@/utils/invoiceKind";
import { formatCurrency, formatDate, formatTime } from "@/utils/format";
import { dateTimeColumns } from "@/utils/tableHelpers";
import { cn } from "@/utils/cn";
import type { Invoice, Payment, Project } from "@/types";
import { StatementTable } from "@/features/reports/StatementTable";

type TabValue = "info" | "projects" | "invoices" | "payments" | "statements";

const projectHelper = createColumnHelper<Project>();
const invoiceHelper = createColumnHelper<Invoice>();
const paymentHelper = createColumnHelper<Payment>();

export default function CustomerDetailPage() {
  const { id } = useParams();
  const customerId = Number(id);
  const navigate = useNavigate();
  const { currency } = useSettings();
  const { data: customer, isLoading, error, refetch } = useCustomer(customerId);
  const { data: projectsData } = useProjects();
  const { data: invoicesData } = useInvoices();
  const { data: paymentsData } = usePayments();
  const projects = projectsData?.rows ?? [];
  const invoices = invoicesData?.rows ?? [];
  const payments = paymentsData?.rows ?? [];
  const [tab, setTab] = useState<TabValue>("info");
  const { data: statementData, isLoading: statementLoading } = useCustomerDetailStatement(customerId, {
    enabled: tab === "statements" && Number.isFinite(customerId),
  });
  const statementRows = statementData?.rows ?? [];

  const customerProjects = useMemo(
    () => projects.filter((p) => p.customerId === customerId),
    [projects, customerId]
  );
  const customerInvoices = useMemo(
    () => invoices.filter((i) => i.customerId === customerId),
    [invoices, customerId]
  );
  const customerPayments = useMemo(
    () => payments.filter((p) => p.customerId === customerId),
    [payments, customerId]
  );

  const totalInvoiced = customerInvoices.reduce((s, i) => s + Number(i.totalAmount ?? 0), 0);
  const totalPaid = customerPayments.reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const outstanding = Number(customer?.outstandingBalance ?? Math.max(0, totalInvoiced - totalPaid));

  const projectColumns = useMemo<ColumnDef<Project, any>[]>(
    () => [
      projectHelper.accessor("projectName", {
        header: "Project",
        cell: (info) => <span className="font-semibold text-slate-800 dark:text-slate-100">{info.getValue()}</span>,
      }),
      projectHelper.accessor("projectType", {
        header: "Type",
        cell: (info) => <span className="text-slate-500">{info.getValue()}</span>,
      }),
      projectHelper.accessor("projectPrice", {
        header: "Value",
        cell: (info) => <span className="font-mono font-semibold">{formatCurrency(info.getValue(), currency)}</span>,
      }),
      projectHelper.accessor("outstanding", {
        header: "Balance",
        cell: (info) => (
          <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">
            {formatCurrency(Number(info.getValue() ?? 0), currency)}
          </span>
        ),
      }),
      ...dateTimeColumns<Project>("startDate", "Start", (p) => p.startDate, (p) => p.createdAt),
    ],
    [currency]
  );

  const invoiceColumns = useMemo<ColumnDef<Invoice, any>[]>(
    () => [
      invoiceHelper.accessor("invoiceNumber", {
        header: "Invoice #",
        cell: (info) => <span className="font-mono text-xs font-bold text-brand-600">{info.getValue()}</span>,
      }),
      invoiceHelper.display({
        id: "kind",
        header: "Kind",
        cell: (info) => {
          const meta = describeInvoice(info.row.original);
          return <Badge className={INVOICE_KIND_STYLES[meta.kind]}>{meta.kindLabel}</Badge>;
        },
      }),
      invoiceHelper.accessor("projectName", {
        header: "Project",
        cell: (info) => <span className="text-slate-500">{info.getValue() ?? "—"}</span>,
      }),
      ...dateTimeColumns<Invoice>("invoiceDate", "Date", (i) => i.invoiceDate, (i) => i.createdAt),
      invoiceHelper.accessor("totalAmount", {
        header: "Amount",
        cell: (info) => <span className="font-mono font-semibold">{formatCurrency(info.getValue(), currency)}</span>,
      }),
      invoiceHelper.accessor("balance", {
        header: "Balance",
        cell: (info) => (
          <span className={cn("font-mono font-bold", info.getValue() > 0 ? "text-rose-600" : "text-emerald-600")}>
            {formatCurrency(info.getValue(), currency)}
          </span>
        ),
      }),
      invoiceHelper.accessor("status", {
        header: "Status",
        cell: (info) => <Badge className={INVOICE_STATUS_STYLES[info.getValue()]} dot>{info.getValue()}</Badge>,
      }),
    ],
    [currency]
  );

  const paymentColumns = useMemo<ColumnDef<Payment, any>[]>(
    () => [
      paymentHelper.accessor("paymentNumber", {
        header: "Payment #",
        cell: (info) => <span className="font-mono text-xs font-bold text-brand-600">{info.getValue()}</span>,
      }),
      paymentHelper.accessor("paymentMethod", {
        header: "Method",
        cell: (info) => <span className="text-slate-500">{info.getValue()}</span>,
      }),
      ...dateTimeColumns<Payment>("paymentDate", "Date", (p) => p.paymentDate, (p) => p.createdAt),
      paymentHelper.accessor("amount", {
        header: "Amount",
        cell: (info) => (
          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
            +{formatCurrency(info.getValue(), currency)}
          </span>
        ),
      }),
      paymentHelper.accessor("referenceNumber", {
        header: "Reference",
        cell: (info) => <span className="font-mono text-xs text-slate-400">{info.getValue() ?? "—"}</span>,
      }),
    ],
    [currency]
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-56" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  if (error || !customer) {
    return <ErrorState message="We couldn't find this customer." onRetry={refetch} />;
  }

  const tabs = [
    { label: "Information", value: "info", icon: <User className="h-4 w-4" /> },
    { label: "Projects", value: "projects", icon: <FolderKanban className="h-4 w-4" />, count: customerProjects.length },
    { label: "Invoices", value: "invoices", icon: <FileText className="h-4 w-4" />, count: customerInvoices.length },
    { label: "Payments", value: "payments", icon: <CreditCard className="h-4 w-4" />, count: customerPayments.length },
    { label: "Statements", value: "statements", icon: <ScrollText className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={customer.customerName}
        subtitle={`${customer.customerCode} · Customer since ${formatDate(customer.createdAt)}`}
        actions={
          <Button variant="secondary" onClick={() => navigate(-1)} leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Back
          </Button>
        }
      />

      {/* Profile strip */}
      <Card animated={false} className="overflow-hidden">
        <CardBody className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar name={customer.customerName} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{customer.customerName}</h2>
                <Badge className={CUSTOMER_STATUS_STYLES[customer.status]} dot>
                  {customer.status}
                </Badge>
              </div>
              {customer.companyName && (
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
                  <Building2 className="h-3.5 w-3.5" /> {customer.companyName}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {customer.phone}</span>
                <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {customer.email}</span>
                {customer.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {customer.city}</span>}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <StatCardsGrid className="sm:grid-cols-2 xl:grid-cols-5">
        <StatCard index={0} label="Projects" value={String(customerProjects.length)} icon={<FolderKanban className="h-4 w-4" />} iconClassName="bg-brand-50 text-brand-600" />
        <StatCard index={1} label="Invoices" value={String(customerInvoices.length)} icon={<FileText className="h-4 w-4" />} iconClassName="bg-secondary-50 text-primary" />
        <StatCard index={2} label="Paid" value={formatCurrency(totalPaid, currency)} icon={<CreditCard className="h-4 w-4" />} iconClassName="bg-emerald-50 text-emerald-600" />
        <StatCard index={3} label="Invoiced" value={formatCurrency(totalInvoiced, currency)} icon={<FileText className="h-4 w-4" />} iconClassName="bg-slate-100 text-slate-600" />
        <StatCard
          index={4}
          label="Outstanding"
          value={formatCurrency(outstanding, currency)}
          icon={<ScrollText className="h-4 w-4" />}
          iconClassName={outstanding > 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}
        />
      </StatCardsGrid>

      <Tabs tabs={tabs} active={tab} onChange={(v) => setTab(v as TabValue)} />

      {tab === "info" && (
        <Card animated={false}>
          <CardBody className="p-4 sm:p-5">
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["Customer code", customer.customerCode],
                ["Full name", customer.customerName],
                ["Company", customer.companyName ?? "—"],
                ["Phone", customer.phone],
                ["Email", customer.email],
                ["City", customer.city ?? "—"],
                ["Address", customer.address ?? "—"],
                ["Created", formatDate(customer.createdAt)],
                ["Time", formatTime(customer.createdAt)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/40">
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{k}</dt>
                  <dd className="mt-1 break-words text-sm font-semibold text-slate-800 dark:text-slate-100">{v}</dd>
                </div>
              ))}
            </dl>
            {customer.notes && (
              <p className="mt-4 rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-sm text-brand-900 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-100">
                {customer.notes}
              </p>
            )}
          </CardBody>
        </Card>
      )}

      {tab === "projects" && (
        <DataTable
          columns={projectColumns}
          data={customerProjects}
          searchPlaceholder="Search projects…"
          emptyTitle="No projects"
          emptyDescription="This customer has no projects yet."
        />
      )}

      {tab === "invoices" && (
        <DataTable
          columns={invoiceColumns}
          data={customerInvoices}
          searchPlaceholder="Search invoices…"
          emptyTitle="No invoices"
          emptyDescription="No invoices for this customer."
        />
      )}

      {tab === "payments" && (
        <DataTable
          columns={paymentColumns}
          data={customerPayments}
          searchPlaceholder="Search payments…"
          emptyTitle="No payments"
          emptyDescription="No payments recorded for this customer."
        />
      )}

      {tab === "statements" && (
        <Card animated={false}>
          <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Account Statement</h3>
            <p className="text-xs text-slate-500">Date · Time · Type · Reference · Debit · Credit · Balance</p>
          </div>
          <StatementTable
            rows={statementRows}
            loading={statementLoading}
            currency={currency}
            empty="No transactions yet."
          />
        </Card>
      )}
    </div>
  );
}
