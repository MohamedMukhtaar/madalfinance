import { useMemo, useState } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import {
  Check,
  Eye,
  FileText,
  Paperclip,
  Printer,
  Download,
  Trash2,
  Banknote,
  Receipt,
} from "lucide-react";
import { DataTable } from "@/components/tables/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge, DateRangeFilter, type DateFilterMode, StatCard, StatCardsGrid, MonthNavigator, Select, Modal, EmptyState, FileUpload, ErrorState, promptDeleteReason, type UploadedFile } from "@/components/ui";
import { InvoiceViewModal } from "@/features/invoices/InvoiceViewModal";
import { BillingPeriodPicker, MONTHS } from "@/features/invoices/BillingPeriodPicker";
import { RecordPaymentModal } from "@/features/payments/RecordPaymentModal";
import { useChargeAllRentals, useCustomers, useDeleteInvoice, useInvoices, useRentals } from "@/hooks/queries";
import { useSelectedMonth } from "@/hooks/useSelectedMonth";
import { useSettings } from "@/context/SettingsContext";
import { useAuth } from "@/context/AuthContext";
import { INVOICE_STATUS_STYLES } from "@/utils/constants";
import { describeInvoice, INVOICE_KIND_STYLES } from "@/utils/invoiceKind";
import { formatCurrency, formatDate, formatTime } from "@/utils/format";
import { monthDateBounds, rentalPeriodLabel } from "@/utils/validation";
import { monthRangeParams } from "@/utils/monthFilter";
import { printInvoice } from "@/utils/print";
import { canManage } from "@/utils/roles";
import { cn } from "@/utils/cn";
import type { Invoice, RentalBilling } from "@/types";
import toast from "react-hot-toast";

const columnHelper = createColumnHelper<Invoice>();

export default function InvoicesPage() {
  const now = new Date();
  const { user } = useAuth();
  const manage = canManage(user?.role);
  const deleteMutation = useDeleteInvoice();
  const chargeAllMutation = useChargeAllRentals();
  const { currency, settings } = useSettings();
  const { month, setMonth } = useSelectedMonth();

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(12);
  const [chargeRentOpen, setChargeRentOpen] = useState(false);
  const [billingMonth, setBillingMonth] = useState(String(now.getMonth() + 1));
  const [billingYear, setBillingYear] = useState(String(now.getFullYear()));
  const [viewId, setViewId] = useState<number | undefined>();
  const [payFor, setPayFor] = useState<Invoice | undefined>();
  const [statusFilter, setStatusFilter] = useState("all");
  const [attachmentFor, setAttachmentFor] = useState<Invoice | undefined>();
  const [uploadingFor, setUploadingFor] = useState<Invoice | undefined>();
  const [uploads, setUploads] = useState<Record<number, UploadedFile[]>>({});
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
    if (statusFilter !== "all") base.status = statusFilter;
    if (dateMode === "day" && day) {
      base.fromDate = day;
      base.toDate = day;
    } else if (dateMode === "range") {
      if (from) base.fromDate = from;
      if (to) base.toDate = to;
    }
    return base;
  }, [pageIndex, pageSize, statusFilter, dateMode, day, from, to]);

  const { data: invoicesData, isLoading, error, refetch } = useInvoices(listParams);
  const monthParams = useMemo(() => monthRangeParams(month), [month]);
  const { data: monthInvoicesData } = useInvoices({ ...monthParams, perPage: 500 });
  const { data: customersData } = useCustomers();
  const { data: rentalsData } = useRentals();
  const invoices = invoicesData?.rows ?? [];
  const totalCount = invoicesData?.total ?? 0;
  const customers = customersData?.rows ?? [];
  const monthInvoices = monthInvoicesData?.rows ?? [];
  const activeRentals = useMemo(
    () => (rentalsData?.rows ?? []).filter((r) => r.status === "Active"),
    [rentalsData]
  );
  const thisMonth = now.getMonth() + 1;
  const thisYear = now.getFullYear();
  const thisMonthRange = useMemo(() => monthDateBounds(thisYear, thisMonth), [thisYear, thisMonth]);
  const selectedRange = useMemo(
    () => monthDateBounds(Number(billingYear), Number(billingMonth)),
    [billingYear, billingMonth]
  );
  const { data: thisMonthInvoicesData } = useInvoices({ ...thisMonthRange, perPage: 500 });
  const { data: selectedPeriodInvoicesData } = useInvoices({ ...selectedRange, perPage: 500 });
  const thisMonthInvoices = thisMonthInvoicesData?.rows ?? [];
  const selectedPeriodInvoices = selectedPeriodInvoicesData?.rows ?? [];

  const unchargedThisMonth = useMemo(
    () => unchargedRentalsForPeriod(activeRentals, thisMonthInvoices, thisYear, thisMonth),
    [activeRentals, thisMonthInvoices, thisYear, thisMonth]
  );
  const unchargedSelected = useMemo(
    () =>
      unchargedRentalsForPeriod(
        activeRentals,
        selectedPeriodInvoices,
        Number(billingYear),
        Number(billingMonth)
      ),
    [activeRentals, selectedPeriodInvoices, billingYear, billingMonth]
  );
  const totalMonthlyRent = useMemo(
    () => unchargedSelected.reduce((s, r) => s + r.monthlyAmount, 0),
    [unchargedSelected]
  );
  const periodLabel = `${MONTHS[Number(billingMonth) - 1]?.label ?? billingMonth} ${billingYear}`;
  const canChargeThisMonth = unchargedThisMonth.length > 0;
  const canChargeSelected = unchargedSelected.length > 0;

  const openChargeRent = () => {
    const d = new Date();
    setBillingMonth(String(d.getMonth() + 1));
    setBillingYear(String(d.getFullYear()));
    setChargeRentOpen(true);
  };

  const totals = useMemo(
    () => ({
      total: monthInvoices.reduce((s, i) => s + i.totalAmount, 0),
      paid: monthInvoices.reduce((s, i) => s + i.paidAmount, 0),
      balance: monthInvoices.reduce((s, i) => s + i.balance, 0),
      overdue: monthInvoices.filter((i) => i.status === "Overdue").reduce((s, i) => s + i.balance, 0),
    }),
    [monthInvoices]
  );

  const columns = useMemo<ColumnDef<Invoice, any>[]>(
    () => [
      columnHelper.accessor("invoiceNumber", {
        header: "Invoice #",
        cell: (info) => (
          <span className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400">{info.getValue()}</span>
        ),
      }),
      columnHelper.display({
        id: "kind",
        header: "Kind",
        cell: (info) => {
          const meta = describeInvoice(info.row.original);
          return <Badge className={INVOICE_KIND_STYLES[meta.kind]}>{meta.kindLabel}</Badge>;
        },
      }),
      columnHelper.accessor("customerName", {
        header: "Customer",
        cell: (info) => (
          <span className="font-semibold text-slate-800 dark:text-slate-100">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("projectName", {
        header: "Project",
        cell: (info) => (
          <span className="max-w-[10rem] truncate text-slate-500 dark:text-slate-400">{info.getValue() ?? "—"}</span>
        ),
      }),
      columnHelper.accessor("invoiceDate", {
        header: "Date",
        cell: (info) => <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(info.getValue())}</span>,
      }),
      columnHelper.display({
        id: "time",
        header: "Time",
        cell: (info) => <span className="text-xs text-slate-500 dark:text-slate-400">{formatTime(info.row.original.createdAt ?? info.row.original.invoiceDate)}</span>,
      }),
      columnHelper.accessor("dueDate", {
        header: "Due Date",
        cell: (info) => (
          <span className={cn("text-xs", new Date(info.getValue()) < new Date() ? "font-semibold text-rose-500" : "text-slate-500 dark:text-slate-400")}>
            {formatDate(info.getValue())}
          </span>
        ),
      }),
      columnHelper.accessor("totalAmount", {
        header: "Amount",
        cell: (info) => <span className="font-mono font-semibold text-slate-900 dark:text-white">{formatCurrency(info.getValue(), currency)}</span>,
      }),
      columnHelper.accessor("paidAmount", {
        header: "Paid",
        cell: (info) => (
          <span className={cn("font-mono", info.getValue() > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400")}>
            {formatCurrency(info.getValue(), currency)}
          </span>
        ),
      }),
      columnHelper.accessor("balance", {
        header: "Balance",
        cell: (info) => (
          <span className={cn("font-mono font-bold", info.getValue() > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400")}>
            {formatCurrency(info.getValue(), currency)}
          </span>
        ),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => <Badge className={INVOICE_STATUS_STYLES[info.getValue()]} dot>{info.getValue()}</Badge>,
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: () => null,
      }),
    ],
    [currency]
  );

  const handlePrint = (inv: Invoice) => {
    if (!settings) return;
    printInvoice(inv, settings);
  };

  const handleUpload = (inv: Invoice) => {
    if ((uploads[inv.invoiceId] ?? []).length === 0) {
      toast.error("Please upload at least one file");
      return;
    }
    toast.success(`${uploads[inv.invoiceId].length} agreement(s) uploaded for ${inv.invoiceNumber}`);
    setUploadingFor(undefined);
  };

  if (error) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        subtitle="All customer charges — setup, monthly rent, and one-time invoices. Use Charge rent for monthly billing."
        actions={
          <>
            <MonthNavigator value={month} onChange={setMonth} />
            {manage && (
              <Button
                variant="secondary"
                onClick={openChargeRent}
                leftIcon={<Receipt className="h-4 w-4" />}
                disabled={!canChargeThisMonth}
              >
                Charge rent ({unchargedThisMonth.length})
              </Button>
            )}
          </>
        }
      />

      <StatCardsGrid>
        <StatCard index={0} loading={isLoading} label="Invoiced" value={formatCurrency(totals.total, currency)} icon={<FileText className="h-4 w-4" />} iconClassName="bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400" />
        <StatCard index={1} loading={isLoading} label="Collected" value={formatCurrency(totals.paid, currency)} icon={<FileText className="h-4 w-4" />} iconClassName="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" />
        <StatCard index={2} loading={isLoading} label="Outstanding" value={formatCurrency(totals.balance, currency)} icon={<FileText className="h-4 w-4" />} iconClassName="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" />
        <StatCard index={3} loading={isLoading} label="Overdue" value={formatCurrency(totals.overdue, currency)} icon={<FileText className="h-4 w-4" />} iconClassName="bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400" />
      </StatCardsGrid>

      <DataTable
        columns={columns}
        data={invoices}
        loading={isLoading}
        searchPlaceholder="Search invoices…"
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
              <span className="font-mono text-xs font-bold text-brand-600">{row.invoiceNumber}</span>
              <Badge className={INVOICE_STATUS_STYLES[row.status]} dot>
                {row.status}
              </Badge>
            </div>
            <p className="text-xs font-medium text-slate-500">{describeInvoice(row).kindLabel}</p>
            <p className="font-semibold text-slate-800 dark:text-slate-100">{row.customerName}</p>
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="font-mono text-slate-700 dark:text-slate-200">
                {formatCurrency(row.totalAmount, currency)}
              </span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                Bal {formatCurrency(row.balance, currency)}
              </span>
            </div>
            <p className="text-xs text-slate-500">{formatDate(row.invoiceDate)}</p>
          </div>
        )}
        actions={(row) => {
          const canPay =
            manage &&
            Number(row.balance) > 0 &&
            row.status !== "Cancelled" &&
            row.status !== "Draft" &&
            row.status !== "Paid";
          return [
            { label: "View", icon: <Eye className="h-4 w-4" />, onClick: () => setViewId(row.invoiceId) },
            ...(canPay
              ? [
                  {
                    label: "Pay",
                    icon: <Banknote className="h-4 w-4" />,
                    onClick: () => setPayFor(row),
                  },
                  { divider: true },
                ]
              : []),
            { label: "Print", icon: <Printer className="h-4 w-4" />, onClick: () => handlePrint(row) },
            { label: "Download PDF", icon: <Download className="h-4 w-4" />, onClick: () => handlePrint(row) },
            ...(manage
              ? [
                  { divider: true },
                  {
                    label: "Upload Agreement",
                    icon: <Paperclip className="h-4 w-4" />,
                    onClick: () => {
                      setUploads((u) => ({ ...u, [row.invoiceId]: [] }));
                      setUploadingFor(row);
                    },
                  },
                  {
                    label: `View Attachments (${row.attachments?.length ?? 0})`,
                    icon: <Paperclip className="h-4 w-4" />,
                    onClick: () => setAttachmentFor(row),
                  },
                  {
                    label: "Delete",
                    icon: <Trash2 className="h-4 w-4" />,
                    danger: true,
                    disabled: Number(row.paidAmount ?? 0) > 0,
                    onClick: async () => {
                      const reason = await promptDeleteReason({
                        title: `Delete ${row.invoiceNumber}?`,
                        text: "This invoice will be moved to Trash.",
                      });
                      if (reason) deleteMutation.mutate({ id: row.invoiceId, reason });
                    },
                  },
                ]
              : []),
          ];
        }}
        toolbar={
          <>
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPageIndex(0);
              }}
              options={[
                { value: "all", label: "All statuses" },
                { value: "Draft", label: "Draft" },
                { value: "Issued", label: "Issued" },
                { value: "Partial", label: "Partial" },
                { value: "Paid", label: "Paid" },
                { value: "Overdue", label: "Overdue" },
                { value: "Cancelled", label: "Cancelled" },
              ]}
              className="w-40"
            />
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
          </>
        }
      />

      <Modal
        open={chargeRentOpen}
        onClose={() => setChargeRentOpen(false)}
        title="Charge rent"
        subtitle="Create monthly rent invoices for every active rental for the selected period."
        footer={
          <>
            <Button variant="secondary" onClick={() => setChargeRentOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={chargeAllMutation.isPending}
              disabled={!canChargeSelected || chargeAllMutation.isPending}
              onClick={() =>
                chargeAllMutation.mutate(
                  { force: true, month: Number(billingMonth), year: Number(billingYear) },
                  { onSuccess: () => setChargeRentOpen(false) }
                )
              }
            >
              {canChargeSelected
                ? `Charge ${unchargedSelected.length} for ${periodLabel}`
                : "Already charged this month"}
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <BillingPeriodPicker
            month={billingMonth}
            year={billingYear}
            onMonthChange={setBillingMonth}
            onYearChange={setBillingYear}
          />
          <p>
            Creates one <span className="font-semibold">monthly rent</span> invoice per uncharged active rental for{" "}
            <span className="font-semibold text-slate-900 dark:text-white">{periodLabel}</span>. Setup fees are not
            included — they were already invoiced when the rental project was created.
          </p>
          {!canChargeSelected && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
              Same month, no need to charge twice. All active rentals already have rent for {periodLabel}.
            </p>
          )}
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Estimated total</p>
            <p className="font-mono text-lg font-bold text-brand-600 dark:text-brand-400">
              {formatCurrency(totalMonthlyRent, currency)}
            </p>
          </div>
        </div>
      </Modal>

      <InvoiceViewModal
        open={!!viewId}
        onClose={() => setViewId(undefined)}
        invoiceId={viewId}
        onPay={(inv) => {
          setViewId(undefined);
          setPayFor(inv);
        }}
      />

      <RecordPaymentModal
        open={!!payFor}
        onClose={() => setPayFor(undefined)}
        defaultCustomerId={payFor?.customerId}
        defaultInvoiceId={payFor?.invoiceId}
        defaultAmount={payFor?.balance}
        customers={customers}
        invoices={invoices}
      />

      {/* Upload agreement modal */}
      <Modal
        open={!!uploadingFor}
        onClose={() => setUploadingFor(undefined)}
        title="Upload Agreement"
        subtitle={uploadingFor ? `Attach agreement / contract files to ${uploadingFor.invoiceNumber}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setUploadingFor(undefined)}>Cancel</Button>
            <Button onClick={() => uploadingFor && handleUpload(uploadingFor)} leftIcon={<Check className="h-4 w-4" />}>
              Upload files
            </Button>
          </>
        }
      >
        <FileUpload
          value={uploads[uploadingFor?.invoiceId ?? 0] ?? []}
          onChange={(files) =>
            uploadingFor &&
            setUploads((u) => ({ ...u, [uploadingFor.invoiceId]: files }))
          }
        />
      </Modal>

      {/* View attachments modal */}
      <Modal
        open={!!attachmentFor}
        onClose={() => setAttachmentFor(undefined)}
        title="Invoice Attachments"
        subtitle={attachmentFor?.invoiceNumber}
      >
        {attachmentFor && (attachmentFor.attachments?.length ?? 0) === 0 ? (
          <EmptyState
            title="No attachments yet"
            description="Upload agreements or supporting documents to this invoice."
          />
        ) : (
          <div className="space-y-2">
            {(attachmentFor?.attachments ?? []).map((a) => (
              <div key={a.attachmentId} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200 dark:bg-slate-800/50 dark:ring-slate-700">
                <Paperclip className="h-4 w-4 shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{a.fileName}</p>
                  <p className="text-xs text-slate-400">{a.fileType} · {formatDate(a.uploadedAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

function unchargedRentalsForPeriod(
  rentals: RentalBilling[],
  invoices: Invoice[],
  year: number,
  month: number
) {
  const label = rentalPeriodLabel(year, month);
  const chargedIds = new Set(
    invoices
      .filter((inv) => {
        const meta = describeInvoice(inv);
        return meta.kind === "rent" && meta.period === label && inv.projectId;
      })
      .map((inv) => inv.projectId as number)
  );
  return rentals.filter((r) => !chargedIds.has(r.projectId));
}
