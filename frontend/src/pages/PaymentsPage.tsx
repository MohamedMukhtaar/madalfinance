import { useMemo, useState } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { CreditCard, Eye, Paperclip, Plus, Trash2, UploadCloud } from "lucide-react";
import { DataTable } from "@/components/tables/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge, DateRangeFilter, type DateFilterMode, StatCard, Modal, FileUpload, ErrorState, promptDeleteReason, type UploadedFile } from "@/components/ui";
import { RecordPaymentModal } from "@/features/payments/RecordPaymentModal";
import { useCustomers, useInvoices, usePayments, useVoidPayment } from "@/hooks/queries";
import { useSettings } from "@/context/SettingsContext";
import { formatCurrency, formatDate, formatTime } from "@/utils/format";
import { matchesDateFilter } from "@/utils/dateFilter";
import type { Payment } from "@/types";
import toast from "react-hot-toast";

const columnHelper = createColumnHelper<Payment>();

const methodStyles: Record<string, string> = {
  Cash: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-500/30",
  Bank: "bg-secondary-50 text-primary ring-secondary-200 dark:bg-secondary-500/10 dark:text-secondary-300 dark:ring-secondary-500/30",
  "EVC Plus": "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
  eDahab: "bg-primary/10 text-primary ring-primary/20 dark:bg-primary/20 dark:text-secondary-300 dark:ring-primary/30",
  "Premier Wallet": "bg-secondary-100 text-primary ring-secondary-200 dark:bg-secondary-500/10 dark:text-secondary-300 dark:ring-secondary-500/30",
  Other: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-500/30",
};

export default function PaymentsPage() {
  const { data: paymentsData, isLoading, error, refetch } = usePayments();
  const { data: customersData } = useCustomers();
  const { data: invoicesData } = useInvoices();
  const payments = paymentsData?.rows ?? [];
  const customers = customersData?.rows ?? [];
  const invoices = invoicesData?.rows ?? [];
  const voidMutation = useVoidPayment();
  const { currency } = useSettings();

  const [modalOpen, setModalOpen] = useState(false);
  const [detailFor, setDetailFor] = useState<Payment | undefined>();
  const [receiptFor, setReceiptFor] = useState<Payment | undefined>();
  const [receipts, setReceipts] = useState<Record<number, UploadedFile[]>>({});
  const [dateMode, setDateMode] = useState<DateFilterMode>("all");
  const [day, setDay] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(
    () => payments.filter((p) => matchesDateFilter(p.paymentDate, { mode: dateMode, date: day, from, to })),
    [payments, dateMode, day, from, to]
  );

  const totals = useMemo(
    () => ({
      total: payments.reduce((s, p) => s + p.amount, 0),
      count: payments.length,
      thisMonth: payments
        .filter((p) => {
          const d = new Date(p.paymentDate);
          const now = new Date();
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        })
        .reduce((s, p) => s + p.amount, 0),
    }),
    [payments]
  );

  const columns = useMemo<ColumnDef<Payment, any>[]>(
    () => [
      columnHelper.accessor("paymentNumber", {
        header: "Payment #",
        cell: (info) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDetailFor(info.row.original);
            }}
            className="font-mono text-xs font-bold text-brand-600 hover:underline dark:text-brand-400"
          >
            {info.getValue()}
          </button>
        ),
      }),
      columnHelper.accessor("customerName", {
        header: "Customer",
        cell: (info) => <span className="font-semibold text-slate-800 dark:text-slate-100">{info.getValue()}</span>,
      }),
      columnHelper.accessor("amount", {
        header: "Amount",
        cell: (info) => (
          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">+{formatCurrency(info.getValue(), currency)}</span>
        ),
      }),
      columnHelper.accessor("paymentMethod", {
        header: "Method",
        cell: (info) => <Badge className={methodStyles[info.getValue()]}>{info.getValue()}</Badge>,
      }),
      columnHelper.accessor("referenceNumber", {
        header: "Reference",
        cell: (info) => (
          <span className="max-w-[10rem] truncate font-mono text-xs text-slate-500 dark:text-slate-400">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("paymentDate", {
        header: "Date",
        cell: (info) => <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(info.getValue())}</span>,
      }),
      columnHelper.display({
        id: "time",
        header: "Time",
        cell: (info) => <span className="text-xs text-slate-500 dark:text-slate-400">{formatTime(info.row.original.createdAt ?? info.row.original.paymentDate)}</span>,
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: () => null,
      }),
    ],
    [currency]
  );

  const handleUploadReceipt = (p: Payment) => {
    if ((receipts[p.paymentId] ?? []).length === 0) {
      toast.error("Please select a receipt image");
      return;
    }
    toast.success(`Receipt uploaded for ${p.paymentNumber}`);
    setReceiptFor(undefined);
  };

  if (error) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        subtitle="Every payment collected, with receipts and references."
        actions={
          <Button onClick={() => setModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
            Record Payment
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard index={0} loading={isLoading} label="Total Collected" value={formatCurrency(totals.total, currency)} icon={<CreditCard className="h-5 w-5" />} iconClassName="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" />
        <StatCard index={1} loading={isLoading} label="This Month" value={formatCurrency(totals.thisMonth, currency)} icon={<CreditCard className="h-5 w-5" />} iconClassName="bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400" />
        <StatCard index={2} loading={isLoading} label="Payments" value={String(totals.count)} icon={<CreditCard className="h-5 w-5" />} iconClassName="bg-secondary-50 text-primary dark:bg-secondary-500/10 dark:text-secondary-300" />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={isLoading}
        searchPlaceholder="Search payments…"
        actions={(row) => [
          { label: "View Details", icon: <Eye className="h-4 w-4" />, onClick: () => setDetailFor(row) },
          { label: "Upload Receipt", icon: <UploadCloud className="h-4 w-4" />, onClick: () => { setReceipts((r) => ({ ...r, [row.paymentId]: [] })); setReceiptFor(row); } },
          { divider: true },
          {
            label: "Void / Delete",
            icon: <Trash2 className="h-4 w-4" />,
            danger: true,
            onClick: async () => {
              const reason = await promptDeleteReason({
                title: `Void ${row.paymentNumber}?`,
                text: "This payment will be voided, reversed on invoices, and moved to Trash.",
                confirmText: "Void payment",
              });
              if (reason) voidMutation.mutate({ id: row.paymentId, reason });
            },
          },
        ]}
        toolbar={
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
        }
      />

      <RecordPaymentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        customers={customers}
        invoices={invoices}
      />

      {/* Payment details modal */}
      <Modal
        open={!!detailFor}
        onClose={() => setDetailFor(undefined)}
        title={detailFor?.paymentNumber}
        subtitle={detailFor?.customerName}
        size="md"
      >
        {detailFor && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ["Amount", <span key="a" className="font-mono font-bold text-emerald-600 dark:text-emerald-400">+{formatCurrency(detailFor.amount, currency)}</span>],
              ["Method", detailFor.paymentMethod],
              ["Reference", <span key="r" className="font-mono">{detailFor.referenceNumber ?? "—"}</span>],
              ["Date", formatDate(detailFor.paymentDate)],
            ].map(([k, v]) => (
              <div key={k as string} className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{k}</p>
                <div className="mt-0.5 font-semibold text-slate-800 dark:text-slate-100">{v}</div>
              </div>
            ))}
            {detailFor.notes && <p className="col-span-2 rounded-xl bg-slate-50 px-4 py-3 text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">{detailFor.notes}</p>}
          </div>
        )}
      </Modal>

      {/* Receipt upload modal */}
      <Modal
        open={!!receiptFor}
        onClose={() => setReceiptFor(undefined)}
        title="Upload Receipt"
        subtitle={receiptFor ? `Attach a payment receipt for ${receiptFor.paymentNumber}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setReceiptFor(undefined)}>Cancel</Button>
            <Button onClick={() => receiptFor && handleUploadReceipt(receiptFor)} leftIcon={<Paperclip className="h-4 w-4" />}>
              Upload receipt
            </Button>
          </>
        }
      >
        <FileUpload
          value={receipts[receiptFor?.paymentId ?? 0] ?? []}
          onChange={(files) => receiptFor && setReceipts((r) => ({ ...r, [receiptFor.paymentId]: files }))}
          accept="image/*,.pdf"
        />
      </Modal>
    </div>
  );
}
