import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Building2, Mail, MapPin, Phone, Pencil } from "lucide-react";
import { useCustomer, useProjects, useInvoices, usePayments } from "@/hooks/queries";
import { useSettings } from "@/context/SettingsContext";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge, Avatar, Skeleton, SkeletonText, ErrorState, Button, Tabs } from "@/components/ui";
import { CUSTOMER_STATUS_STYLES, INVOICE_STATUS_STYLES } from "@/utils/constants";
import { formatCurrency, formatDate } from "@/utils/format";
import { cn } from "@/utils/cn";

type TabValue = "info" | "projects" | "invoices" | "payments" | "statements";

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

  const statementRows = useMemo(() => {
    if (!customer) return [];
    const rows: Array<{ date: string; desc: string; debit: number; credit: number; balance: number }> = [];
    let balance = Number(customer.outstandingBalance ?? 0);
    const items: Array<{ date: string; desc: string; debit: number; credit: number }> = [];
    customerInvoices.forEach((i) =>
      items.push({
        date: i.invoiceDate,
        desc: `Invoice ${i.invoiceNumber}`,
        debit: Number(i.totalAmount ?? 0),
        credit: 0,
      })
    );
    customerPayments.forEach((p) =>
      items.push({
        date: p.paymentDate,
        desc: `Payment ${p.paymentNumber}`,
        debit: 0,
        credit: Number(p.amount ?? 0),
      })
    );
    items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    items.forEach((item) => {
      balance = balance + item.debit - item.credit;
      rows.push({ ...item, balance: Math.round(balance * 100) / 100 });
    });
    return rows;
  }, [customer, customerInvoices, customerPayments]);

  const totalInvoiced = customerInvoices.reduce((s, i) => s + Number(i.totalAmount ?? 0), 0);
  const totalPaid = customerPayments.reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const outstanding = Number(customer?.outstandingBalance ?? Math.max(0, totalInvoiced - totalPaid));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-56" />
        <Card>
          <CardBody>
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <SkeletonText lines={2} className="w-64" />
            </div>
          </CardBody>
        </Card>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <ErrorState
        message="We couldn't find this customer."
        onRetry={refetch}
      />
    );
  }

  const tabs: { label: string; value: TabValue; count?: number }[] = [
    { label: "Information", value: "info" },
    { label: "Projects", value: "projects", count: customerProjects.length },
    { label: "Invoices", value: "invoices", count: customerInvoices.length },
    { label: "Payments", value: "payments", count: customerPayments.length },
    { label: "Statements", value: "statements" },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={customer.customerName}
        subtitle={`${customer.customerCode} · Customer since ${formatDate(customer.createdAt)}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate(-1)} leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back
            </Button>
            <Button variant="secondary" leftIcon={<Pencil className="h-4 w-4" />}>
              Edit
            </Button>
          </>
        }
      />

      {/* Compact profile + key figures */}
      <Card animated={false}>
        <CardBody className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={customer.customerName} size="lg" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-lg font-bold text-slate-900 dark:text-white">{customer.customerName}</h2>
                  <Badge className={CUSTOMER_STATUS_STYLES[customer.status]} dot>{customer.status}</Badge>
                </div>
                {customer.companyName && (
                  <p className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                    <Building2 className="h-3.5 w-3.5" /> {customer.companyName}
                  </p>
                )}
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1.5"><Phone className="h-3 w-3" /> {customer.phone}</span>
                  <span className="inline-flex items-center gap-1.5"><Mail className="h-3 w-3" /> {customer.email}</span>
                  {customer.city && <span className="inline-flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {customer.city}</span>}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {[
                { label: "Projects", value: String(customer.projectCount ?? customerProjects.length) },
                { label: "Invoices", value: String(customerInvoices.length) },
                { label: "Paid", value: formatCurrency(totalPaid, currency) },
                { label: "Invoiced", value: formatCurrency(totalInvoiced, currency) },
                { label: "Due", value: formatCurrency(outstanding, currency), accent: outstanding > 0 },
              ].map((s) => (
                <div key={s.label} className="rounded-lg bg-slate-50 px-2.5 py-2 dark:bg-slate-800/50">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{s.label}</p>
                  <p className={cn("mt-0.5 text-xs font-bold sm:text-sm", s.accent ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white")}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>

      <Tabs tabs={tabs} active={tab} onChange={(v) => setTab(v as TabValue)} />

      <div className="space-y-3">
        {tab === "info" && (
          <Card animated={false}>
            <CardHeader title="Contact & Details" className="px-4 pt-4 sm:px-5" />
            <CardBody className="p-4 pt-3 sm:p-5 sm:pt-3">
              <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {[
                  ["Code", customer.customerCode],
                  ["Name", customer.customerName],
                  ["Company", customer.companyName ?? "—"],
                  ["Phone", customer.phone],
                  ["Email", customer.email],
                  ["City", customer.city ?? "—"],
                  ["Address", customer.address ?? "—"],
                  ["Created", formatDate(customer.createdAt)],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
                    <dt className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{k}</dt>
                    <dd className="mt-0.5 break-words text-sm font-semibold text-slate-800 dark:text-slate-100">{v}</dd>
                  </div>
                ))}
              </dl>
              {customer.notes && (
                <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800 dark:bg-brand-500/10 dark:text-brand-200">
                  {customer.notes}
                </p>
              )}
            </CardBody>
          </Card>
        )}

        {tab === "projects" && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {customerProjects.map((p) => (
              <Card key={p.projectId} hover animated={false}>
                <CardBody className="p-3.5">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{p.projectName}</p>
                  <p className="text-xs text-slate-400">{p.projectType}</p>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Value</span>
                    <span className="font-bold">{formatCurrency(p.projectPrice, currency)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Balance</span>
                    <span className="font-semibold text-rose-600 dark:text-rose-400">
                      {formatCurrency(Number(p.outstanding ?? 0), currency)}
                    </span>
                  </div>
                </CardBody>
              </Card>
            ))}
            {customerProjects.length === 0 && (
              <Card animated={false} className="sm:col-span-2 xl:col-span-3">
                <CardBody className="py-6 text-center text-sm text-slate-400">No projects yet for this customer.</CardBody>
              </Card>
            )}
          </div>
        )}

        {tab === "invoices" && (
          <Card animated={false}>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {customerInvoices.map((inv) => (
                <Link
                  key={inv.invoiceId}
                  to={`/invoices/${inv.invoiceId}`}
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-100">{inv.invoiceNumber}</p>
                    <p className="text-xs text-slate-400">{inv.projectName ?? "—"} · due {formatDate(inv.dueDate ?? undefined)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(inv.totalAmount, currency)}</p>
                    <Badge className={cn("mt-0.5", INVOICE_STATUS_STYLES[inv.status])}>{inv.status}</Badge>
                  </div>
                </Link>
              ))}
              {customerInvoices.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-400">No invoices for this customer.</p>}
            </div>
          </Card>
        )}

        {tab === "payments" && (
          <Card animated={false}>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {customerPayments.map((p) => (
                <div key={p.paymentId} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-100">{p.paymentNumber}</p>
                    <p className="text-xs text-slate-400">{p.paymentMethod} · {formatDate(p.paymentDate)}</p>
                  </div>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">+{formatCurrency(p.amount, currency)}</p>
                </div>
              ))}
              {customerPayments.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-400">No payments recorded for this customer.</p>}
            </div>
          </Card>
        )}

        {tab === "statements" && (
          <Card animated={false}>
            <CardHeader title="Account Statement" subtitle="Invoices & payments with running balance" className="px-4 pt-4 sm:px-5" />
            <div className="overflow-x-auto p-2">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2 text-right">Debit</th>
                    <th className="px-3 py-2 text-right">Credit</th>
                    <th className="px-3 py-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr className="text-slate-500 dark:text-slate-400">
                    <td className="px-3 py-2 text-xs">{formatDate(customer.createdAt)}</td>
                    <td className="px-3 py-2 font-semibold">Opening balance</td>
                    <td className="px-3 py-2 text-right">—</td>
                    <td className="px-3 py-2 text-right">—</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold">{formatCurrency(outstanding, currency)}</td>
                  </tr>
                  {statementRows.map((r, i) => (
                    <tr key={i} className="text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/40">
                      <td className="px-3 py-2 text-xs">{formatDate(r.date)}</td>
                      <td className="px-3 py-2 font-medium">{r.desc}</td>
                      <td className={cn("px-3 py-2 text-right font-mono", r.debit > 0 && "text-rose-600 dark:text-rose-400")}>
                        {r.debit > 0 ? formatCurrency(r.debit, currency) : "—"}
                      </td>
                      <td className={cn("px-3 py-2 text-right font-mono", r.credit > 0 && "text-emerald-600 dark:text-emerald-400")}>
                        {r.credit > 0 ? formatCurrency(r.credit, currency) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-slate-800 dark:text-slate-100">
                        {formatCurrency(r.balance, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

