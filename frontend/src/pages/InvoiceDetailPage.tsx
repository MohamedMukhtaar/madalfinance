import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Paperclip,
  Plus,
  Printer,
  Send,
  Wallet,
} from "lucide-react";
import { useInvoice, useCustomers, usePayments, useInvoices } from "@/hooks/queries";
import { useSettings } from "@/context/SettingsContext";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge, Skeleton, ErrorState, Button } from "@/components/ui";
import { Progress } from "@/components/ui/Progress";
import { RecordPaymentModal } from "@/features/payments/RecordPaymentModal";
import { INVOICE_STATUS_STYLES } from "@/utils/constants";
import { formatCurrency, formatDate, formatDateTime } from "@/utils/format";
import { printInvoice } from "@/utils/print";
import { cn } from "@/utils/cn";

const timelineIcons = {
  created: <FileText className="h-3.5 w-3.5" />,
  issued: <Send className="h-3.5 w-3.5" />,
  payment: <Wallet className="h-3.5 w-3.5" />,
  reminder: <Clock className="h-3.5 w-3.5" />,
  attachment: <Paperclip className="h-3.5 w-3.5" />,
  cancelled: <CheckCircle2 className="h-3.5 w-3.5" />,
};

const timelineColors = {
  created: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  issued: "bg-secondary-50 text-primary dark:bg-secondary-500/10 dark:text-secondary-300",
  payment: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  reminder: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  attachment: "bg-primary/10 text-primary dark:bg-primary/20 dark:text-secondary-300",
  cancelled: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
};

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const invoiceId = Number(id);
  const navigate = useNavigate();
  const { currency, settings } = useSettings();
  const { data: invoice, isLoading, error, refetch } = useInvoice(invoiceId);
  const { data: allInvoicesData } = useInvoices();
  const { data: customersData } = useCustomers();
  const { data: paymentsData } = usePayments();
  const allInvoices = allInvoicesData?.rows ?? [];
  const customers = customersData?.rows ?? [];
  const payments = paymentsData?.rows ?? [];
  const [paymentOpen, setPaymentOpen] = useState(false);

  const invoicePayments = useMemo(
    () => payments.filter((p) => p.allocations?.some((allocation) => allocation.invoiceId === invoiceId)),
    [payments, invoiceId]
  );

  const paidPct = invoice
    ? Math.min(100, Math.round((Number(invoice.paidAmount ?? 0) / Math.max(Number(invoice.totalAmount ?? 1), 1)) * 100))
    : 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (error || !invoice) {
    return <ErrorState message="We couldn't find this invoice." onRetry={refetch} />;
  }

  const handlePrint = () => settings && printInvoice(invoice, settings);
  const items = invoice.items ?? [];
  const attachments = invoice.attachments ?? [];
  const timeline = invoice.timeline ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title={invoice.invoiceNumber}
        subtitle={`Created ${formatDate(invoice.invoiceDate)} · Due ${formatDate(invoice.dueDate ?? undefined)}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate(-1)} leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back
            </Button>
            <Button variant="secondary" onClick={handlePrint} leftIcon={<Printer className="h-4 w-4" />}>
              Print
            </Button>
            <Button variant="secondary" onClick={handlePrint} leftIcon={<Download className="h-4 w-4" />}>
              PDF
            </Button>
            {invoice.status !== "Paid" && invoice.status !== "Cancelled" && (
              <Button onClick={() => setPaymentOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
                Record Payment
              </Button>
            )}
          </>
        }
      />

      {/* Compact summary */}
      <Card animated={false}>
        <CardBody className="space-y-3 p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <SummaryCell label="Status" value={<Badge className={INVOICE_STATUS_STYLES[invoice.status]} dot>{invoice.status}</Badge>} />
            <SummaryCell
              label="Customer"
              value={
                <Link to={`/customers/${invoice.customerId}`} className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
                  {invoice.customerName}
                </Link>
              }
            />
            <SummaryCell label="Project" value={<span className="truncate">{invoice.projectName ?? "—"}</span>} />
            <SummaryCell label="Total" value={<span className="font-mono">{formatCurrency(invoice.totalAmount, currency)}</span>} />
            <SummaryCell
              label="Paid"
              value={<span className="font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(invoice.paidAmount, currency)}</span>}
            />
            <SummaryCell
              label="Balance"
              value={<span className="font-mono font-bold text-rose-600 dark:text-rose-400">{formatCurrency(invoice.balance, currency)}</span>}
            />
          </div>
          <div>
            <div className="mb-1 flex justify-between text-[11px]">
              <span className="font-medium text-slate-400">Payment progress</span>
              <span className="font-bold text-slate-600 dark:text-slate-300">{paidPct}%</span>
            </div>
            <Progress value={paidPct} />
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <Card animated={false}>
            <CardHeader title="Invoice Items" className="px-4 pt-4 sm:px-5" />
            <div className="overflow-x-auto px-2 pb-3">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2 text-center">Qty</th>
                    <th className="px-3 py-2 text-right">Unit</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((item) => (
                    <tr key={item.itemId} className="text-slate-600 dark:text-slate-300">
                      <td className="px-3 py-2.5 font-medium text-slate-800 dark:text-slate-100">{item.description}</td>
                      <td className="px-3 py-2.5 text-center">{item.quantity}</td>
                      <td className="px-3 py-2.5 text-right font-mono">{formatCurrency(item.unitPrice, currency)}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold">{formatCurrency(item.total, currency)}</td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-sm text-slate-400">
                        No line items
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="ml-auto mt-2 w-full max-w-xs space-y-1 px-3">
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-mono">{formatCurrency(invoice.subtotal, currency)}</span>
                </div>
                {Number(invoice.discount) > 0 && (
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>Discount</span>
                    <span className="font-mono">−{formatCurrency(invoice.discount, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Tax</span>
                  <span className="font-mono">{formatCurrency(invoice.tax, currency)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5 text-sm font-bold text-slate-900 dark:border-slate-700 dark:text-white">
                  <span>Total</span>
                  <span className="font-mono">{formatCurrency(invoice.totalAmount, currency)}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Files + payments in one compact card */}
          <Card animated={false}>
            <CardBody className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-ink">Files</h3>
                  <Badge className="bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:ring-slate-500/30">
                    <Paperclip className="h-3 w-3" /> {attachments.length}
                  </Badge>
                </div>
                {attachments.length === 0 ? (
                  <p className="text-xs text-slate-400">No attachments</p>
                ) : (
                  <div className="space-y-1.5">
                    {attachments.map((a) => (
                      <div
                        key={a.attachmentId}
                        className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2 dark:bg-slate-800/50"
                      >
                        <Paperclip className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">{a.fileName}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-ink">Payments</h3>
                {invoicePayments.length === 0 ? (
                  <p className="text-xs text-slate-400">No payments yet</p>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {invoicePayments.map((p) => (
                      <div key={p.paymentId} className="flex items-center justify-between py-1.5">
                        <div className="min-w-0">
                          <p className="truncate font-mono text-xs font-semibold text-slate-800 dark:text-slate-100">
                            {p.paymentNumber}
                          </p>
                          <p className="text-[11px] text-slate-400">{formatDate(p.paymentDate)}</p>
                        </div>
                        <p className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          +{formatCurrency(p.amount, currency)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        <Card animated={false}>
          <CardHeader title="Timeline" className="px-4 pt-4 sm:px-5" />
          <CardBody className="p-4 pt-2 sm:p-5 sm:pt-2">
            {timeline.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-400">No activity yet</p>
            ) : (
              <div className="relative ml-1.5 space-y-4 border-l-2 border-slate-100 pl-5 dark:border-slate-800">
                {timeline
                  .slice()
                  .reverse()
                  .map((event) => (
                    <motion.div key={event.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="relative">
                      <span
                        className={cn(
                          "absolute -left-[1.7rem] flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white dark:ring-slate-900",
                          timelineColors[event.type]
                        )}
                      >
                        {timelineIcons[event.type]}
                      </span>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{event.title}</p>
                      {event.description && <p className="mt-0.5 text-xs text-slate-400">{event.description}</p>}
                      <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-slate-400">
                        <CalendarDays className="h-3 w-3" /> {formatDateTime(event.date)}
                      </p>
                    </motion.div>
                  ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <RecordPaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        defaultCustomerId={invoice.customerId}
        defaultInvoiceId={invoice.invoiceId}
        customers={customers}
        invoices={allInvoices}
      />
    </div>
  );
}

function SummaryCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-0.5 text-sm text-slate-800 dark:text-slate-100">{value}</div>
    </div>
  );
}
