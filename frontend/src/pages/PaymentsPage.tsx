import { useMemo, useState } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { CreditCard, Download, Eye, Pencil, Paperclip, Plus, Printer, Trash2, UploadCloud } from "lucide-react";
import { DataTable } from "@/components/tables/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge, DateRangeFilter, type DateFilterMode, StatCard, StatCardsGrid, Modal, FileUpload, ErrorState, promptDeleteReason, type UploadedFile } from "@/components/ui";
import { RecordPaymentModal } from "@/features/payments/RecordPaymentModal";
import { EditPaymentModal } from "@/features/payments/EditPaymentModal";
import { useCustomers, useInvoices, usePayments, useVoidPayment } from "@/hooks/queries";
import { useSettings } from "@/context/SettingsContext";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency, formatDate, formatTime } from "@/utils/format";
import { printPayment } from "@/utils/print";
import { financeService } from "@/services/finance";
import { getErrorMessage } from "@/services/api";
import { canManage } from "@/utils/roles";
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
  const { user } = useAuth();
  const manage = canManage(user?.role);
  const voidMutation = useVoidPayment();
  const { currency, settings } = useSettings();

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(12);
  const [modalOpen, setModalOpen] = useState(false);
  const [editFor, setEditFor] = useState<Payment | undefined>();
  const [detailFor, setDetailFor] = useState<Payment | undefined>();
  const [receiptFor, setReceiptFor] = useState<Payment | undefined>();
  const [receipts, setReceipts] = useState<Record<number, UploadedFile[]>>({});
  const [dateMode, setDateMode] = useState<DateFilterMode>("all");
  const [day, setDay] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const listParams = useMemo(() => {
    const base: Record<string, string | number> = {
      page: pageIndex + 1,
      perPage: pageSize,
      sort: "created_at:desc",
    };
    if (dateMode === "day" && day) {
      base.fromDate = day;
      base.toDate = day;
    } else if (dateMode === "range") {
      if (from) base.fromDate = from;
      if (to) base.toDate = to;
    }
    return base;
  }, [pageIndex, pageSize, dateMode, day, from, to]);

  const { data: paymentsData, isLoading, error, refetch } = usePayments(listParams);
  const statsParams = useMemo(() => {
    const base: Record<string, string | number> = { page: 1, perPage: 500, sort: "created_at:desc" };
    if (dateMode === "day" && day) {
      base.fromDate = day;
      base.toDate = day;
    } else if (dateMode === "range") {
      if (from) base.fromDate = from;
      if (to) base.toDate = to;
    }
    return base;
  }, [dateMode, day, from, to]);
  const { data: statsPaymentsData } = usePayments(statsParams);
  const { data: customersData } = useCustomers();
  const { data: invoicesData } = useInvoices();
  const payments = paymentsData?.rows ?? [];
  const totalCount = paymentsData?.total ?? 0;
  const customers = customersData?.rows ?? [];
  const invoices = invoicesData?.rows ?? [];
  const statsPayments = statsPaymentsData?.rows ?? [];

  const handlePrint = async (p: Payment) => {
    if (!settings) {
      toast.error("Settings not loaded");
      return;
    }
    try {
      const full = await financeService.payment(p.paymentId);
      const customer = customers.find((c) => c.customerId === full.customerId);
      printPayment(full, settings, customer);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load payment for printing"));
    }
  };

  const handleDownloadPdf = async (p: Payment) => {
    try {
      await financeService.downloadPaymentPdf(p.paymentId, `${p.paymentNumber}.pdf`);
      toast.success("PDF downloaded");
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to download PDF"));
    }
  };

  const totals = useMemo(
    () => ({
      total: statsPayments.reduce((s, p) => s + p.amount, 0),
      count: statsPaymentsData?.total ?? statsPayments.length,
    }),
    [statsPayments, statsPaymentsData?.total]
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

  const handleUploadReceipt = async (p: Payment) => {
    const files = receipts[p.paymentId] ?? [];
    if (files.length === 0) {
      toast.error("Please select a receipt image");
      return;
    }
    try {
      for (const file of files) {
        if (!file.file) {
          toast.error("Invalid file — please re-select the receipt");
          return;
        }
        await financeService.uploadPaymentAttachment(p.paymentId, file.file);
      }
      toast.success(`Receipt uploaded for ${p.paymentNumber}`);
      setReceiptFor(undefined);
      setReceipts((prev) => ({ ...prev, [p.paymentId]: [] }));
      void refetch();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to upload receipt"));
    }
  };

  if (error) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        subtitle="Every payment collected, with receipts and references."
        actions={
          manage ? (
            <Button onClick={() => setModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
              Record Payment
            </Button>
          ) : undefined
        }
      />

      <StatCardsGrid className="sm:grid-cols-3 xl:grid-cols-3">
        <StatCard index={0} loading={isLoading} label="Collected" value={formatCurrency(totals.total, currency)} icon={<CreditCard className="h-4 w-4" />} iconClassName="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" />
        <StatCard index={1} loading={isLoading} label="Payments" value={String(totals.count)} icon={<CreditCard className="h-4 w-4" />} iconClassName="bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400" />
        <StatCard index={2} loading={isLoading} label="Average" value={formatCurrency(totals.count ? totals.total / totals.count : 0, currency)} icon={<CreditCard className="h-4 w-4" />} iconClassName="bg-secondary-50 text-primary dark:bg-secondary-500/10 dark:text-secondary-300" />
      </StatCardsGrid>

      <DataTable
        columns={columns}
        data={payments}
        loading={isLoading}
        searchPlaceholder="Search payments…"
        serverSide
        totalCount={totalCount}
        pageIndex={pageIndex}
        pageSize={pageSize}
        onPageChange={setPageIndex}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPageIndex(0);
        }}
        renderMobileCard={(row) => (
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-bold text-brand-600">{row.paymentNumber}</span>
              <Badge className={methodStyles[row.paymentMethod]}>{row.paymentMethod}</Badge>
            </div>
            <p className="font-semibold text-slate-800 dark:text-slate-100">{row.customerName}</p>
            <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              +{formatCurrency(row.amount, currency)}
            </p>
            <p className="text-xs text-slate-500">{formatDate(row.paymentDate)}</p>
          </div>
        )}
        actions={(row) => [
          { label: "View Details", icon: <Eye className="h-4 w-4" />, onClick: () => setDetailFor(row) },
          { label: "Print", icon: <Printer className="h-4 w-4" />, onClick: () => handlePrint(row) },
          {
            label: "Download PDF",
            icon: <Download className="h-4 w-4" />,
            onClick: () => {
              void handleDownloadPdf(row);
            },
          },
          ...(manage
            ? [
                { label: "Edit", icon: <Pencil className="h-4 w-4" />, onClick: () => setEditFor(row) },
                {
                  label: "Upload Receipt",
                  icon: <UploadCloud className="h-4 w-4" />,
                  onClick: () => {
                    setReceipts((r) => ({ ...r, [row.paymentId]: [] }));
                    setReceiptFor(row);
                  },
                },
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
              ]
            : []),
        ]}
        toolbar={
          <DateRangeFilter
            mode={dateMode}
            onModeChange={(mode) => {
              setDateMode(mode);
              setPageIndex(0);
            }}
            date={day}
            from={from}
            to={to}
            onDateChange={(value) => {
              setDay(value);
              setPageIndex(0);
            }}
            onFromChange={(value) => {
              setFrom(value);
              setPageIndex(0);
            }}
            onToChange={(value) => {
              setTo(value);
              setPageIndex(0);
            }}
          />
        }
      />

      <RecordPaymentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        customers={customers}
        invoices={invoices}
      />

      <EditPaymentModal open={!!editFor} onClose={() => setEditFor(undefined)} payment={editFor} />

      {/* Payment details modal */}
      <Modal
        open={!!detailFor}
        onClose={() => setDetailFor(undefined)}
        title={detailFor?.paymentNumber}
        subtitle={detailFor?.customerName}
        size="md"
        footer={
          detailFor ? (
            <>
              <Button variant="secondary" onClick={() => setDetailFor(undefined)}>Close</Button>
              <Button variant="secondary" leftIcon={<Pencil className="h-4 w-4" />} onClick={() => { setEditFor(detailFor); setDetailFor(undefined); }}>
                Edit
              </Button>
              <Button variant="secondary" leftIcon={<Printer className="h-4 w-4" />} onClick={() => handlePrint(detailFor)}>
                Print
              </Button>
              <Button leftIcon={<Download className="h-4 w-4" />} onClick={() => void handleDownloadPdf(detailFor)}>
                Download PDF
              </Button>
            </>
          ) : undefined
        }
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
