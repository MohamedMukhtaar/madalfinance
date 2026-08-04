import { useMemo, useState } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { History, KeyRound, Pause, Play, Plus, Receipt } from "lucide-react";
import { DataTable } from "@/components/tables/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge, StatCard, Modal, ErrorState } from "@/components/ui";
import {
  useChargeAllRentals,
  useGenerateRentalInvoice,
  useInvoices,
  usePauseRental,
  useResumeRental,
  useRentals,
} from "@/hooks/queries";
import { useSettings } from "@/context/SettingsContext";
import { RENTAL_STATUS_STYLES, INVOICE_STATUS_STYLES } from "@/utils/constants";
import { formatCurrency, formatDate, daysFromNow } from "@/utils/format";
import { cn } from "@/utils/cn";
import type { RentalBilling } from "@/types";

const columnHelper = createColumnHelper<RentalBilling>();

export default function RentalsPage() {
  const { data: rentalsData, isLoading, error, refetch } = useRentals();
  const { data: invoicesData } = useInvoices();
  const rentals = rentalsData?.rows ?? [];
  const invoices = invoicesData?.rows ?? [];
  const pauseMutation = usePauseRental();
  const resumeMutation = useResumeRental();
  const generateMutation = useGenerateRentalInvoice();
  const chargeAllMutation = useChargeAllRentals();
  const { currency } = useSettings();

  const [historyFor, setHistoryFor] = useState<RentalBilling | undefined>();
  const [confirmChargeAll, setConfirmChargeAll] = useState(false);

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
  const dueCount = useMemo(
    () => activeRentals.filter((r) => daysFromNow(r.nextBillingDate) <= 0).length,
    [activeRentals]
  );

  const columns = useMemo<ColumnDef<RentalBilling, any>[]>(
    () => [
      columnHelper.accessor("projectName", {
        header: "Rental / Project",
        cell: (info) => {
          const r = info.row.original;
          return (
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-800 dark:text-slate-100">{r.projectName}</p>
              <p className="text-xs text-slate-400">{r.customerName}</p>
            </div>
          );
        },
      }),
      columnHelper.accessor("monthlyAmount", {
        header: "Monthly Fee",
        cell: (info) => (
          <span className="font-mono font-semibold text-slate-900 dark:text-white">
            {formatCurrency(info.getValue(), currency)}
          </span>
        ),
      }),
      columnHelper.accessor("billingDay", {
        header: "Billing Day",
        cell: (info) => (
          <Badge className="bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-500/30">
            {
              [
                "1st",
                "2nd",
                "3rd",
                "4th",
                "5th",
                "6th",
                "7th",
                "8th",
                "9th",
                "10th",
                "11th",
                "12th",
                "13th",
                "14th",
                "15th",
                "16th",
                "17th",
                "18th",
                "19th",
                "20th",
                "21st",
                "22nd",
                "23rd",
                "24th",
                "25th",
                "26th",
                "27th",
                "28th",
              ][info.getValue() - 1]
            }
          </Badge>
        ),
      }),
      columnHelper.accessor("nextBillingDate", {
        header: "Next Billing",
        cell: (info) => {
          const days = daysFromNow(info.getValue());
          return (
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{formatDate(info.getValue())}</p>
              <p className={cn("text-xs", days < 7 ? "font-semibold text-rose-500" : "text-slate-400")}>
                {days < 0 ? `${Math.abs(days)}d overdue` : `in ${days} days`}
              </p>
            </div>
          );
        },
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => <Badge className={RENTAL_STATUS_STYLES[info.getValue()]} dot>{info.getValue()}</Badge>,
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: (info) => {
          const r = info.row.original;
          const canGenerate = r.status === "Active";
          return (
            <div className="flex items-center justify-end gap-1.5">
              <Button
                size="sm"
                variant="outline"
                disabled={!canGenerate || generateMutation.isPending}
                loading={generateMutation.isPending && generateMutation.variables?.id === r.billingId}
                onClick={() => generateMutation.mutate({ id: r.billingId, force: true })}
                leftIcon={<Plus className="h-3.5 w-3.5" />}
              >
                Generate
              </Button>
              {r.status === "Active" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => pauseMutation.mutate(r.billingId)}
                  leftIcon={<Pause className="h-3.5 w-3.5" />}
                >
                  Pause
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => resumeMutation.mutate(r.billingId)}
                  leftIcon={<Play className="h-3.5 w-3.5" />}
                >
                  Resume
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setHistoryFor(r)}>
                <History className="h-3.5 w-3.5" />
                <span className="hidden xl:inline">History</span>
              </Button>
            </div>
          );
        },
      }),
    ],
    [currency]
  );

  if (error) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rental Management"
        subtitle="Recurring billing for hosted and rental services."
        actions={
          <Button
            onClick={() => setConfirmChargeAll(true)}
            leftIcon={<Receipt className="h-4 w-4" />}
            disabled={activeRentals.length === 0}
          >
            Charge All ({activeRentals.length})
          </Button>
        }
      />

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

      <DataTable columns={columns} data={rentals} loading={isLoading} searchPlaceholder="Search rentals…" />

      <Modal
        open={confirmChargeAll}
        onClose={() => setConfirmChargeAll(false)}
        title="Charge All Active Rentals"
        subtitle="Create invoices for every active rental using its monthly fee."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmChargeAll(false)}>
              Cancel
            </Button>
            <Button
              loading={chargeAllMutation.isPending}
              onClick={() =>
                chargeAllMutation.mutate(
                  { force: true },
                  { onSuccess: () => setConfirmChargeAll(false) }
                )
              }
            >
              Charge {activeRentals.length} · {formatCurrency(totalMonthly, currency)}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
          <p>
            This generates one invoice per <span className="font-semibold text-slate-900 dark:text-white">Active</span>{" "}
            rental for the current billing period, based on each rental&apos;s monthly amount.
          </p>
          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Active</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{activeRentals.length}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Overdue / due</p>
              <p className="text-sm font-bold text-rose-600 dark:text-rose-400">{dueCount}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Total this run</p>
              <p className="font-mono text-base font-bold text-brand-600 dark:text-brand-400">
                {formatCurrency(totalMonthly, currency)}
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Use <span className="font-semibold">Generate</span> on a row to bill one rental only. Already-billed
            periods are skipped.
          </p>
        </div>
      </Modal>

      <Modal
        open={!!historyFor}
        onClose={() => setHistoryFor(undefined)}
        size="lg"
        title="Billing History"
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
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {formatCurrency(inv.totalAmount, currency)}
                </p>
                <Badge className={cn("mt-0.5", INVOICE_STATUS_STYLES[inv.status])}>{inv.status}</Badge>
              </div>
            </div>
          ))}
          {historyInvoices.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">No invoices generated for this rental yet.</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
