import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { History, KeyRound, MoreVertical, Pause, Play, Plus, Receipt, Banknote } from "lucide-react";
import { DataTable } from "@/components/tables/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge, StatCard, Modal, ErrorState, Input, Select, DateRangeFilter, type DateFilterMode } from "@/components/ui";
import {
  useChargeAllRentals,
  useCreateRental,
  useCustomers,
  useGenerateRentalInvoice,
  useInvoices,
  usePauseRental,
  useProjects,
  useResumeRental,
  useRentals,
} from "@/hooks/queries";
import { RecordPaymentModal } from "@/features/payments/RecordPaymentModal";
import { useSettings } from "@/context/SettingsContext";
import { RENTAL_STATUS_STYLES, INVOICE_STATUS_STYLES } from "@/utils/constants";
import { matchesDateFilter } from "@/utils/dateFilter";
import { formatCurrency, formatDate, daysFromNow } from "@/utils/format";
import { dateTimeColumns } from "@/utils/tableHelpers";
import { cn } from "@/utils/cn";
import type { RentalBilling, Invoice } from "@/types";

type ChargeType = "setup" | "monthly";

interface RentalTableRow {
  rowId: string;
  billing: RentalBilling;
  chargeType: ChargeType;
}

const columnHelper = createColumnHelper<RentalTableRow>();

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
].map((label, i) => ({ value: String(i + 1), label }));

function billingDayLabel(day: number) {
  const labels = [
    "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th",
    "11th", "12th", "13th", "14th", "15th", "16th", "17th", "18th", "19th", "20th",
    "21st", "22nd", "23rd", "24th", "25th", "26th", "27th", "28th",
  ];
  return labels[day - 1] ?? `${day}`;
}

function setupPaidLabel(r: RentalBilling) {
  const fee = Number(r.setupFee ?? 0);
  if (fee <= 0) {
    return {
      label: "No setup fee",
      style:
        "bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:ring-slate-500/30",
    };
  }
  const status = r.setupInvoiceStatus ?? "Issued";
  if (status === "Paid") {
    return {
      label: "Paid",
      style:
        "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
    };
  }
  if (status === "Partial") {
    return {
      label: "Partial",
      style:
        "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30",
    };
  }
  return {
    label: "Unpaid",
    style:
      "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30",
  };
}

function expandRentalRows(rentals: RentalBilling[]): RentalTableRow[] {
  const rows: RentalTableRow[] = [];
  for (const billing of rentals) {
    if (Number(billing.setupFee) > 0) {
      rows.push({ rowId: `${billing.billingId}-setup`, billing, chargeType: "setup" });
    }
    rows.push({ rowId: `${billing.billingId}-monthly`, billing, chargeType: "monthly" });
  }
  return rows;
}

function payableInvoiceForRow(
  row: RentalTableRow,
  invoices: Invoice[]
): { invoiceId: number; customerId: number; amount: number } | undefined {
  const payable = (i: Invoice) =>
    Number(i.balance) > 0 && i.status !== "Cancelled" && i.status !== "Draft" && i.status !== "Paid";

  if (row.chargeType === "setup" && row.billing.setupInvoiceId) {
    const inv = invoices.find((i) => i.invoiceId === row.billing.setupInvoiceId && payable(i));
    if (inv) return { invoiceId: inv.invoiceId, customerId: inv.customerId, amount: inv.balance };
    return undefined;
  }

  if (row.chargeType === "monthly") {
    const projectInvoices = invoices
      .filter(
        (i) =>
          i.projectId === row.billing.projectId &&
          payable(i) &&
          i.invoiceId !== row.billing.setupInvoiceId
      )
      .sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
    const inv = projectInvoices[0];
    if (inv) return { invoiceId: inv.invoiceId, customerId: inv.customerId, amount: inv.balance };
  }

  return undefined;
}

function BillingPeriodPicker({
  month,
  year,
  onMonthChange,
  onYearChange,
}: {
  month: string;
  year: string;
  onMonthChange: (v: string) => void;
  onYearChange: (v: string) => void;
}) {
  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 16 }, (_, i) => current - 10 + i);
  }, []);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Select
        label="Billing month"
        required
        value={month}
        onChange={(e) => onMonthChange(e.target.value)}
        options={MONTHS}
      />
      <Select
        label="Billing year"
        required
        value={year}
        onChange={(e) => onYearChange(e.target.value)}
        options={years.map((y) => ({ value: String(y), label: String(y) }))}
      />
    </div>
  );
}

function RentalRowMenu({
  row,
  onGenerate,
  onPause,
  onResume,
  onHistory,
}: {
  row: RentalTableRow;
  onGenerate: () => void;
  onPause: () => void;
  onResume: () => void;
  onHistory: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isMonthly = row.chargeType === "monthly";
  const isActive = row.billing.status === "Active";

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="relative flex justify-end" ref={ref}>
      <button
        type="button"
        aria-label="Row actions"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-navy dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-20 min-w-[10.5rem] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {isMonthly && (
            <>
              <MenuItem
                label="Generate invoice"
                disabled={!isActive}
                onClick={() => {
                  setOpen(false);
                  onGenerate();
                }}
              />
              {isActive ? (
                <MenuItem
                  label="Pause billing"
                  onClick={() => {
                    setOpen(false);
                    onPause();
                  }}
                />
              ) : (
                <MenuItem
                  label="Resume billing"
                  onClick={() => {
                    setOpen(false);
                    onResume();
                  }}
                />
              )}
            </>
          )}
          <MenuItem
            label="Invoice history"
            onClick={() => {
              setOpen(false);
              onHistory();
            }}
          />
        </div>
      )}
    </div>
  );
}

function MenuItem({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "block w-full px-3 py-2 text-left text-sm font-medium transition",
        disabled
          ? "cursor-not-allowed text-slate-300 dark:text-slate-600"
          : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
      )}
    >
      {label}
    </button>
  );
}

export default function RentalsPage() {
  const now = new Date();
  const { data: rentalsData, isLoading, error, refetch } = useRentals();
  const { data: invoicesData } = useInvoices();
  const { data: projectsData } = useProjects({ perPage: 200 });
  const { data: customersData } = useCustomers();
  const rentals = rentalsData?.rows ?? [];
  const [dateMode, setDateMode] = useState<DateFilterMode>("all");
  const [day, setDay] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filteredRentals = useMemo(
    () =>
      rentals.filter((r) =>
        matchesDateFilter(r.nextBillingDate, {
          mode: dateMode,
          date: day,
          from,
          to,
        })
      ),
    [rentals, dateMode, day, from, to]
  );

  const tableRows = useMemo(() => expandRentalRows(filteredRentals), [filteredRentals]);
  const invoices = invoicesData?.rows ?? [];
  const projects = projectsData?.rows ?? [];
  const customers = customersData?.rows ?? [];
  const pauseMutation = usePauseRental();
  const resumeMutation = useResumeRental();
  const generateMutation = useGenerateRentalInvoice();
  const chargeAllMutation = useChargeAllRentals();
  const createMutation = useCreateRental();
  const { currency } = useSettings();

  const [historyFor, setHistoryFor] = useState<RentalBilling | undefined>();
  const [confirmChargeAll, setConfirmChargeAll] = useState(false);
  const [generateFor, setGenerateFor] = useState<RentalBilling | undefined>();
  const [billingMonth, setBillingMonth] = useState(String(now.getMonth() + 1));
  const [billingYear, setBillingYear] = useState(String(now.getFullYear()));
  const [createOpen, setCreateOpen] = useState(false);
  const [payFor, setPayFor] = useState<{ customerId: number; invoiceId: number; amount: number } | undefined>();
  const [form, setForm] = useState({
    projectId: "",
    monthlyAmount: "",
    setupFee: "",
    billingDay: "1",
  });

  const billedProjectIds = useMemo(() => new Set(rentals.map((r) => r.projectId)), [rentals]);
  const availableProjects = useMemo(
    () =>
      projects.filter(
        (p) => String(p.projectType).toLowerCase() === "rental" && !billedProjectIds.has(p.projectId)
      ),
    [projects, billedProjectIds]
  );

  const historyInvoices = useMemo(
    () =>
      invoices
        .filter((i) => historyFor && i.projectId === historyFor.projectId)
        .sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime()),
    [invoices, historyFor]
  );

  const activeRentals = useMemo(() => rentals.filter((r) => r.status === "Active"), [rentals]);
  const totalMonthly = useMemo(
    () => activeRentals.reduce((s, r) => s + r.monthlyAmount, 0),
    [activeRentals]
  );
  const totalYearly = totalMonthly * 12;

  const openPeriodModal = useCallback((mode: "charge-all" | "generate", billing?: RentalBilling) => {
    const d = new Date();
    setBillingMonth(String(d.getMonth() + 1));
    setBillingYear(String(d.getFullYear()));
    if (mode === "charge-all") {
      setGenerateFor(undefined);
      setConfirmChargeAll(true);
    } else if (billing) {
      setConfirmChargeAll(false);
      setGenerateFor(billing);
    }
  }, []);

  const columns = useMemo<ColumnDef<RentalTableRow, any>[]>(
    () => [
      columnHelper.accessor((r) => r.billing.projectName, {
        id: "project",
        header: "Rental / Project",
        cell: (info) => {
          const { billing, chargeType } = info.row.original;
          return (
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-semibold text-slate-800 dark:text-slate-100">{billing.projectName}</p>
                <Badge
                  className={cn(
                    chargeType === "setup"
                      ? "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300"
                      : "bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-500/10 dark:text-brand-300"
                  )}
                >
                  {chargeType === "setup" ? "Setup fee" : "Monthly"}
                </Badge>
              </div>
              <p className="text-xs text-slate-400">{billing.customerName}</p>
            </div>
          );
        },
      }),
      columnHelper.display({
        id: "amount",
        header: "Amount",
        cell: (info) => {
          const { billing, chargeType } = info.row.original;
          const amount = chargeType === "setup" ? Number(billing.setupFee ?? 0) : billing.monthlyAmount;
          return (
            <span className="font-mono font-semibold text-slate-900 dark:text-white">
              {formatCurrency(amount, currency)}
            </span>
          );
        },
      }),
      columnHelper.display({
        id: "schedule",
        header: "Schedule",
        cell: (info) => {
          const { billing, chargeType } = info.row.original;
          if (chargeType === "setup") {
            return <span className="text-sm text-slate-500">One-time</span>;
          }
          return (
            <Badge className="bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-300">
              {billingDayLabel(billing.billingDay)} of month
            </Badge>
          );
        },
      }),
      ...dateTimeColumns<RentalTableRow>(
        "nextBill",
        "Next bill",
        (r) => (r.chargeType === "setup" ? r.billing.nextBillingDate : r.billing.nextBillingDate),
        (r) => r.billing.lastGenerated ?? r.billing.nextBillingDate
      ),
      columnHelper.display({
        id: "period",
        header: "Due in",
        cell: (info) => {
          const { billing, chargeType } = info.row.original;
          if (chargeType === "setup") {
            return (
              <span className="text-sm text-slate-500">
                {billing.setupInvoiceNumber ? `Invoice ${billing.setupInvoiceNumber}` : "At signup"}
              </span>
            );
          }
          const days = daysFromNow(billing.nextBillingDate);
          return (
            <p className={cn("text-xs font-medium", days < 7 ? "text-rose-500" : "text-slate-500")}>
              {days < 0 ? `${Math.abs(days)}d overdue` : `in ${days} days`}
            </p>
          );
        },
      }),
      columnHelper.display({
        id: "status",
        header: "Status",
        cell: (info) => {
          const { billing, chargeType } = info.row.original;
          if (chargeType === "setup") {
            const paid = setupPaidLabel(billing);
            return <Badge className={paid.style}>{paid.label}</Badge>;
          }
          return <Badge className={RENTAL_STATUS_STYLES[billing.status]} dot>{billing.status}</Badge>;
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: (info) => {
          const row = info.row.original;
          const payable = payableInvoiceForRow(row, invoices);
          return (
            <div className="flex items-center justify-end gap-1">
              {payable && (
                <Button
                  size="sm"
                  variant="primary"
                  leftIcon={<Banknote className="h-3.5 w-3.5" />}
                  onClick={() => setPayFor(payable)}
                >
                  Pay
                </Button>
              )}
              <RentalRowMenu
                row={row}
                onGenerate={() => openPeriodModal("generate", row.billing)}
                onPause={() => pauseMutation.mutate(row.billing.billingId)}
                onResume={() => resumeMutation.mutate(row.billing.billingId)}
                onHistory={() => setHistoryFor(row.billing)}
              />
            </div>
          );
        },
      }),
    ],
    [currency, invoices, pauseMutation, resumeMutation, openPeriodModal]
  );

  const submitCreate = () => {
    const projectId = Number(form.projectId);
    const monthlyAmount = Number(form.monthlyAmount);
    const setupFee = Number(form.setupFee || 0);
    const billingDay = Number(form.billingDay);
    if (!projectId || !monthlyAmount || monthlyAmount <= 0) return;
    createMutation.mutate(
      { projectId, monthlyAmount, setupFee, billingDay },
      {
        onSuccess: () => {
          setCreateOpen(false);
          setForm({ projectId: "", monthlyAmount: "", setupFee: "", billingDay: "1" });
        },
      }
    );
  };

  const periodLabel = `${MONTHS[Number(billingMonth) - 1]?.label ?? billingMonth} ${billingYear}`;

  if (error) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Project Charges"
        subtitle="One-time and rental charges. Generate monthly bills, then pay each line."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => setCreateOpen(true)}
              leftIcon={<Plus className="h-4 w-4" />}
              disabled={availableProjects.length === 0}
            >
              Link project
            </Button>
            <Button
              onClick={() => openPeriodModal("charge-all")}
              leftIcon={<Receipt className="h-4 w-4" />}
              disabled={activeRentals.length === 0}
            >
              Charge All ({activeRentals.length})
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
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
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          index={0}
          loading={isLoading}
          label="Active Rentals"
          value={String(activeRentals.length)}
          icon={<KeyRound className="h-5 w-5" />}
          iconClassName="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
        />
        <StatCard
          index={1}
          loading={isLoading}
          label="Monthly Recurring"
          value={formatCurrency(totalMonthly, currency)}
          icon={<KeyRound className="h-5 w-5" />}
          iconClassName="bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
        />
        <StatCard
          index={2}
          loading={isLoading}
          label="Annualized"
          value={formatCurrency(totalYearly, currency)}
          icon={<KeyRound className="h-5 w-5" />}
          iconClassName="bg-secondary-50 text-primary dark:bg-secondary-500/10 dark:text-secondary-300"
        />
      </div>

      <DataTable columns={columns} data={tableRows} loading={isLoading} searchPlaceholder="Search rentals…" />

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Link rental billing"
        subtitle="For projects created before auto-billing was enabled."
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button loading={createMutation.isPending} onClick={submitCreate} disabled={!form.projectId || !form.monthlyAmount}>
              Create billing
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Rental project"
            required
            value={form.projectId}
            onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
            options={[
              { value: "", label: "Select project…" },
              ...availableProjects.map((p) => ({
                value: String(p.projectId),
                label: `${p.projectName} · ${p.customerName ?? ""}`,
              })),
            ]}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Monthly fee" required type="number" min="0" step="0.01" value={form.monthlyAmount} onChange={(e) => setForm((f) => ({ ...f, monthlyAmount: e.target.value }))} />
            <Input label="Setup fee" type="number" min="0" step="0.01" value={form.setupFee} onChange={(e) => setForm((f) => ({ ...f, setupFee: e.target.value }))} />
          </div>
          <Select label="Billing day" value={form.billingDay} onChange={(e) => setForm((f) => ({ ...f, billingDay: e.target.value }))} options={Array.from({ length: 28 }, (_, i) => ({ value: String(i + 1), label: `Day ${i + 1}` }))} />
        </div>
      </Modal>

      <Modal
        open={confirmChargeAll}
        onClose={() => setConfirmChargeAll(false)}
        title="Charge All Active Rentals"
        subtitle="Generate monthly invoices for every active rental for the selected period."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmChargeAll(false)}>Cancel</Button>
            <Button
              loading={chargeAllMutation.isPending}
              onClick={() =>
                chargeAllMutation.mutate(
                  { force: true, month: Number(billingMonth), year: Number(billingYear) },
                  { onSuccess: () => setConfirmChargeAll(false) }
                )
              }
            >
              Charge {activeRentals.length} for {periodLabel}
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
            Creates one <span className="font-semibold">monthly</span> invoice per active rental for{" "}
            <span className="font-semibold text-slate-900 dark:text-white">{periodLabel}</span>. Setup fee rows are
            not affected — those invoices are created at project signup.
          </p>
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Estimated total</p>
            <p className="font-mono text-lg font-bold text-brand-600 dark:text-brand-400">
              {formatCurrency(totalMonthly, currency)}
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!generateFor}
        onClose={() => setGenerateFor(undefined)}
        title="Generate monthly invoice"
        subtitle={generateFor ? `${generateFor.projectName} · ${generateFor.customerName}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setGenerateFor(undefined)}>Cancel</Button>
            <Button
              loading={generateMutation.isPending}
              onClick={() => {
                if (!generateFor) return;
                generateMutation.mutate(
                  {
                    id: generateFor.billingId,
                    force: true,
                    month: Number(billingMonth),
                    year: Number(billingYear),
                  },
                  { onSuccess: () => setGenerateFor(undefined) }
                );
              }}
            >
              Generate for {periodLabel}
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
            Creates a monthly invoice for{" "}
            <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(generateFor?.monthlyAmount ?? 0, currency)}</span>{" "}
            for the selected month. You can pick past months to bill missed periods.
          </p>
        </div>
      </Modal>

      <Modal
        open={!!historyFor}
        onClose={() => setHistoryFor(undefined)}
        size="lg"
        title="Invoice history"
        subtitle={historyFor ? `${historyFor.projectName} · ${historyFor.customerName}` : undefined}
      >
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {historyInvoices.map((inv) => (
            <div key={inv.invoiceId} className="flex items-center justify-between py-3">
              <div>
                <p className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-100">{inv.invoiceNumber}</p>
                <p className="text-xs text-slate-400">
                  Issued {formatDate(inv.invoiceDate)} · due {formatDate(inv.dueDate ?? undefined)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(inv.totalAmount, currency)}</p>
                <Badge className={INVOICE_STATUS_STYLES[inv.status]}>{inv.status}</Badge>
              </div>
            </div>
          ))}
          {historyInvoices.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">No invoices yet for this rental.</p>
          )}
        </div>
      </Modal>

      <RecordPaymentModal
        open={!!payFor}
        onClose={() => setPayFor(undefined)}
        defaultCustomerId={payFor?.customerId}
        defaultInvoiceId={payFor?.invoiceId}
        defaultAmount={payFor?.amount}
        customers={customers}
        invoices={invoices}
      />
    </div>
  );
}
