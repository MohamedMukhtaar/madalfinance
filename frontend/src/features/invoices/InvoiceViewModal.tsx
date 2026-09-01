import { useMemo } from "react";
import {
  Banknote,
  CalendarDays,
  Download,
  FileText,
  Paperclip,
  Printer,
  User,
  Wallet,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Badge, Button } from "@/components/ui";
import { Progress } from "@/components/ui/Progress";
import { useInvoice, usePayments } from "@/hooks/queries";
import { useSettings } from "@/context/SettingsContext";
import { INVOICE_STATUS_STYLES } from "@/utils/constants";
import { formatCurrency, formatDate, formatDateTime } from "@/utils/format";
import { printInvoice } from "@/utils/print";
import { cn } from "@/utils/cn";
import type { Invoice } from "@/types";

export function InvoiceViewModal({
  open,
  onClose,
  invoiceId,
  onPay,
}: {
  open: boolean;
  onClose: () => void;
  invoiceId?: number;
  onPay?: (invoice: Invoice) => void;
}) {
  const { currency, settings } = useSettings();
  const { data: invoice, isLoading } = useInvoice(open && invoiceId ? invoiceId : undefined);
  const { data: paymentsData } = usePayments();
  const payments = paymentsData?.rows ?? [];

  const invoicePayments = useMemo(
    () =>
      invoice
        ? payments.filter((p) => p.allocations?.some((a) => a.invoiceId === invoice.invoiceId))
        : [],
    [payments, invoice]
  );

  const paidPct = invoice
    ? Math.min(100, Math.round((Number(invoice.paidAmount ?? 0) / Math.max(Number(invoice.totalAmount ?? 1), 1)) * 100))
    : 0;

  const canPay =
    invoice &&
    Number(invoice.balance) > 0 &&
    invoice.status !== "Cancelled" &&
    invoice.status !== "Draft" &&
    invoice.status !== "Paid";

  const handlePrint = () => {
    if (invoice && settings) printInvoice(invoice, settings);
  };

  const items = invoice?.items ?? [];
  const attachments = invoice?.attachments ?? [];
  const timeline = invoice?.timeline ?? [];

  const headerActions = invoice ? (
    <>
      <IconBtn title="Print" onClick={handlePrint}>
        <Printer className="h-4 w-4" />
      </IconBtn>
      <IconBtn title="PDF" onClick={handlePrint}>
        <Download className="h-4 w-4" />
      </IconBtn>
      {canPay && onPay && (
        <IconBtn title="Record payment" onClick={() => onPay(invoice)} primary>
          <Banknote className="h-4 w-4" />
        </IconBtn>
      )}
    </>
  ) : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={invoice?.invoiceNumber ?? "Invoice"}
      subtitle={
        invoice
          ? `${formatDate(invoice.invoiceDate)} · Due ${formatDate(invoice.dueDate ?? undefined)}`
          : undefined
      }
      headerActions={headerActions}
    >
      {isLoading || !invoice ? (
        <p className="py-6 text-center text-sm text-slate-400">Loading…</p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={INVOICE_STATUS_STYLES[invoice.status]} dot>{invoice.status}</Badge>
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <User className="h-3.5 w-3.5" /> {invoice.customerName}
            </span>
            {invoice.projectName && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <FileText className="h-3.5 w-3.5" /> {invoice.projectName}
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2.5 text-center dark:bg-slate-800/50">
            <MiniStat icon={<Wallet className="h-3.5 w-3.5" />} label="Total" value={formatCurrency(invoice.totalAmount, currency)} />
            <MiniStat icon={<Banknote className="h-3.5 w-3.5" />} label="Paid" value={formatCurrency(invoice.paidAmount, currency)} accent="text-emerald-600" />
            <MiniStat icon={<Wallet className="h-3.5 w-3.5" />} label="Balance" value={formatCurrency(invoice.balance, currency)} accent="text-rose-600" />
          </div>

          <div>
            <div className="mb-1 flex justify-between text-[10px]">
              <span className="text-slate-400">Progress</span>
              <span className="font-bold text-slate-600">{paidPct}%</span>
            </div>
            <Progress value={paidPct} className="h-1.5" />
          </div>

          <div className="overflow-x-auto rounded-lg ring-1 ring-slate-200 dark:ring-slate-700">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:bg-slate-800/50">
                  <th className="px-2.5 py-1.5">Item</th>
                  <th className="px-2.5 py-1.5 text-center">Qty</th>
                  <th className="px-2.5 py-1.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item) => (
                  <tr key={item.itemId}>
                    <td className="px-2.5 py-2 font-medium">{item.description}</td>
                    <td className="px-2.5 py-2 text-center">{item.quantity}</td>
                    <td className="px-2.5 py-2 text-right font-mono font-semibold">{formatCurrency(item.total, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end border-t border-slate-100 px-2.5 py-2 text-xs font-bold dark:border-slate-800">
              Total {formatCurrency(invoice.totalAmount, currency)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800/50">
              <p className="mb-1 flex items-center gap-1 font-semibold text-slate-500">
                <Paperclip className="h-3 w-3" /> Files ({attachments.length})
              </p>
              {attachments.length === 0 ? (
                <p className="text-slate-400">None</p>
              ) : (
                attachments.map((a) => <p key={a.attachmentId} className="truncate">{a.fileName}</p>)
              )}
            </div>
            <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800/50">
              <p className="mb-1 flex items-center gap-1 font-semibold text-slate-500">
                <Banknote className="h-3 w-3" /> Payments
              </p>
              {invoicePayments.length === 0 ? (
                <p className="text-slate-400">None yet</p>
              ) : (
                invoicePayments.map((p) => (
                  <div key={p.paymentId} className="flex justify-between">
                    <span className="font-mono">{p.paymentNumber}</span>
                    <span className="text-emerald-600">+{formatCurrency(p.amount, currency)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {timeline.length > 0 && (
            <div className="space-y-1 border-t border-slate-100 pt-2 dark:border-slate-800">
              {timeline.slice().reverse().map((event) => (
                <div key={event.id} className="flex items-center gap-2 text-[11px] text-slate-500">
                  <CalendarDays className="h-3 w-3 shrink-0" />
                  <span className="font-medium text-slate-700 dark:text-slate-300">{event.title}</span>
                  <span className="text-slate-400">{formatDateTime(event.date)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function IconBtn({
  children,
  title,
  onClick,
  primary,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "rounded-lg p-2 transition",
        primary
          ? "bg-navy text-white hover:bg-navy/90"
          : "text-ink-muted hover:bg-muted hover:text-ink"
      )}
    >
      {children}
    </button>
  );
}

function MiniStat({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div>
      <p className="flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">
        {icon} {label}
      </p>
      <p className={cn("mt-0.5 font-mono text-sm font-bold", accent ?? "text-slate-900 dark:text-white")}>{value}</p>
    </div>
  );
}
