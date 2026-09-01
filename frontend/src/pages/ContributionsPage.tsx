import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { History, Paperclip, Receipt, UsersRound, Wallet, AlertTriangle, BadgeDollarSign } from "lucide-react";
import { DataTable } from "@/components/tables/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import {
  Badge,
  StatCard,
  StatCardsGrid,
  MonthNavigator,
  Modal,
  Input,
  Select,
  EmptyState,
  ErrorState,
  FileUpload,
  type UploadedFile,
} from "@/components/ui";
import { useAccounts, useChargeMembers, useDefaultAccount, useDueBatch, useDues, useGrantMemberCredit, useReceiveDue, useRepayMemberLoan } from "@/hooks/queries";
import { useSelectedMonth } from "@/hooks/useSelectedMonth";
import { useSettings } from "@/context/SettingsContext";
import { financeService } from "@/services/finance";
import { DUE_STATUS_STYLES } from "@/utils/constants";
import { formatCurrency, monthName, todayISO, formatAccountOptionLabel } from "@/utils/format";
import { formatMonthLabel } from "@/utils/monthFilter";
import { dateTimeColumns } from "@/utils/tableHelpers";
import { cn } from "@/utils/cn";
import type { DueBatch, MemberDue } from "@/types";

const columnHelper = createColumnHelper<MemberDue>();

interface ChargeForm {
  month: string;
  year: string;
  defaultAmount: number;
}

export default function ContributionsPage() {
  const { data, isLoading, error, refetch } = useDues();
  const batches = data?.rows ?? [];
  const chargeMutation = useChargeMembers();
  const receiveMutation = useReceiveDue();
  const grantCreditMutation = useGrantMemberCredit();
  const repayLoanMutation = useRepayMemberLoan();
  const { currency, settings } = useSettings();
  const { month, setMonth } = useSelectedMonth();
  const { data: accounts = [] } = useAccounts();
  const { data: defaultAccount } = useDefaultAccount();

  const [chargeOpen, setChargeOpen] = useState(false);
  const [receiveFor, setReceiveFor] = useState<MemberDue | undefined>();
  const [receiveAmount, setReceiveAmount] = useState<number>(0);
  const [receiveAccId, setReceiveAccId] = useState<string>("");
  const [receiptFiles, setReceiptFiles] = useState<UploadedFile[]>([]);
  const [historyFor, setHistoryFor] = useState<MemberDue | undefined>();
  const [creditFor, setCreditFor] = useState<MemberDue | undefined>();
  const [creditAmount, setCreditAmount] = useState<number>(0);
  const [creditNotes, setCreditNotes] = useState("");
  const [creditAccId, setCreditAccId] = useState<string>("");
  const [repayFor, setRepayFor] = useState<MemberDue | undefined>();
  const [repayAmount, setRepayAmount] = useState<number>(0);
  const [repayNotes, setRepayNotes] = useState("");
  const [repayAccId, setRepayAccId] = useState<string>("");

  const activeBatchMeta = useMemo(
    () => batches.find((b) => b.month === month.month && b.year === month.year),
    [batches, month]
  );

  const { data: batchDetail, isLoading: duesLoading } = useDueBatch(activeBatchMeta?.batchId);
  const activeBatch = useMemo((): DueBatch | undefined => {
    if (!activeBatchMeta) return undefined;
    const dues = batchDetail?.dues ?? activeBatchMeta.dues ?? [];
    const base = batchDetail?.batch ?? activeBatchMeta;
    return { ...base, dues };
  }, [activeBatchMeta, batchDetail]);

  const batchStats = useMemo(() => {
    const dues = activeBatch?.dues ?? [];
    return {
      expected: dues.reduce((s, d) => s + Number(d.amount ?? 0), 0),
      collected: dues.reduce((s, d) => s + Number(d.paidAmount ?? 0), 0),
      pending: dues.filter((d) => d.status === "Pending").reduce((s, d) => s + Number(d.balance ?? 0), 0),
      partial: dues.filter((d) => d.status === "Partial").reduce((s, d) => s + Number(d.balance ?? 0), 0),
      overdue: 0,
    };
  }, [activeBatch]);

  const { data: historyDuesData } = useQuery({
    queryKey: ["dues", "member-history", historyFor?.memberId],
    queryFn: () => financeService.memberDues({ memberId: historyFor!.memberId, perPage: 50 }),
    enabled: !!historyFor?.memberId,
  });
  const historyDues = historyDuesData?.rows ?? [];

  const columns = useMemo<ColumnDef<MemberDue, any>[]>(
    () => [
      columnHelper.accessor("memberName", {
        header: "Member",
        cell: (info) => (
          <span className="font-semibold text-slate-800 dark:text-slate-100">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("amount", {
        header: "Due Amount",
        cell: (info) => (
          <span className="font-mono font-semibold text-slate-900 dark:text-white">
            {formatCurrency(info.getValue(), currency)}
          </span>
        ),
      }),
      columnHelper.accessor("paidAmount", {
        header: "Paid",
        cell: (info) => (
          <span
            className={cn(
              "font-mono",
              info.getValue() > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"
            )}
          >
            {formatCurrency(info.getValue(), currency)}
          </span>
        ),
      }),
      columnHelper.accessor("balance", {
        header: "Balance",
        cell: (info) => (
          <span
            className={cn(
              "font-mono font-bold",
              info.getValue() > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
            )}
          >
            {formatCurrency(info.getValue(), currency)}
          </span>
        ),
      }),
      columnHelper.accessor("creditBalance", {
        header: "Loan owed",
        cell: (info) => {
          const val = Number(info.getValue() ?? 0);
          return (
            <span className={cn("font-mono text-xs font-semibold", val > 0 ? "text-brand-600 dark:text-brand-400" : "text-slate-400")}>
              {val > 0 ? formatCurrency(val, currency) : "—"}
            </span>
          );
        },
      }),
      ...dateTimeColumns<MemberDue>("paidDate", "Paid on", (d) => d.paidDate, (d) => d.paidDate),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => {
          const due = info.row.original;
          return (
            <div className="flex items-center gap-1.5">
              <Badge className={DUE_STATUS_STYLES[info.getValue()]} dot>
                {info.getValue()}
              </Badge>
              {Number(due.attachmentCount ?? 0) > 0 && (
                <span title="Has receipt" className="text-slate-400">
                  <Paperclip className="h-3.5 w-3.5" />
                </span>
              )}
            </div>
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: () => null,
      }),
    ],
    [currency]
  );

  const closeReceive = () => {
    setReceiveFor(undefined);
    setReceiptFiles([]);
    setReceiveAccId("");
  };

  const openReceive = (due: MemberDue) => {
    const defAcc =
      defaultAccount?.accId ?? accounts.find((a) => a.isDefault)?.accId ?? accounts[0]?.accId;
    setReceiveFor(due);
    setReceiveAmount(due.balance);
    setReceiveAccId(defAcc ? String(defAcc) : "");
    setReceiptFiles([]);
  };

  const closeCredit = () => {
    setCreditFor(undefined);
    setCreditAmount(0);
    setCreditNotes("");
    setCreditAccId("");
  };

  const openCredit = (due: MemberDue) => {
    const defAcc =
      defaultAccount?.accId ?? accounts.find((a) => a.isDefault)?.accId ?? accounts[0]?.accId;
    setCreditFor(due);
    setCreditAmount(0);
    setCreditNotes("");
    setCreditAccId(defAcc ? String(defAcc) : "");
  };

  const closeRepay = () => {
    setRepayFor(undefined);
    setRepayAmount(0);
    setRepayNotes("");
    setRepayAccId("");
  };

  const openRepay = (due: MemberDue) => {
    const defAcc =
      defaultAccount?.accId ?? accounts.find((a) => a.isDefault)?.accId ?? accounts[0]?.accId;
    const loanOwed = Number(due.creditBalance ?? 0);
    setRepayFor(due);
    setRepayAmount(loanOwed);
    setRepayNotes("");
    setRepayAccId(defAcc ? String(defAcc) : "");
  };

  const dueActions = (due: MemberDue) => {
    const paid = due.balance <= 0;
    const loanOwed = Number(due.creditBalance ?? 0);
    return [
      {
        label: paid ? "Paid" : "Receive",
        icon: <Wallet className="h-4 w-4" />,
        disabled: paid,
        onClick: () => openReceive(due),
      },
      ...(loanOwed > 0
        ? [
            {
              label: "Repay loan",
              icon: <BadgeDollarSign className="h-4 w-4" />,
              onClick: () => openRepay(due),
            },
          ]
        : []),
      {
        label: "Grant loan",
        icon: <BadgeDollarSign className="h-4 w-4" />,
        onClick: () => openCredit(due),
      },
      {
        label: "History",
        icon: <History className="h-4 w-4" />,
        onClick: () => setHistoryFor(due),
      },
    ];
  };

  const handleReceive = () => {
    if (!receiveFor || !receiveAccId) return;
    receiveMutation.mutate(
      {
        dueId: receiveFor.dueId,
        amount: receiveAmount,
        accId: Number(receiveAccId),
        receipt: receiptFiles[0]?.file ?? null,
      },
      { onSuccess: () => closeReceive() }
    );
  };

  if (error) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Member Contributions"
        subtitle="Monthly dues from Madal ICT co-founders."
        actions={
          <>
            <MonthNavigator value={month} onChange={setMonth} />
            <Button onClick={() => setChargeOpen(true)} leftIcon={<Receipt className="h-4 w-4" />}>
              Charge Members
            </Button>
          </>
        }
      />

      <StatCardsGrid>
        <StatCard
          index={0}
          loading={isLoading || duesLoading}
          label="Expected"
          value={formatCurrency(batchStats.expected || Number(activeBatchMeta?.expectedAmount ?? 0), currency)}
          icon={<Receipt className="h-4 w-4" />}
          iconClassName="bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
        />
        <StatCard
          index={1}
          loading={isLoading || duesLoading}
          label="Collected"
          value={formatCurrency(batchStats.collected || Number(activeBatchMeta?.collectedAmount ?? 0), currency)}
          icon={<Wallet className="h-4 w-4" />}
          iconClassName="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
        />
        <StatCard
          index={2}
          loading={isLoading || duesLoading}
          label="Pending"
          value={formatCurrency(batchStats.pending + batchStats.partial, currency)}
          icon={<UsersRound className="h-4 w-4" />}
          iconClassName="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
        />
        <StatCard
          index={3}
          loading={isLoading || duesLoading}
          label="Overdue"
          value={formatCurrency(batchStats.overdue, currency)}
          icon={<AlertTriangle className="h-4 w-4" />}
          iconClassName="bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
        />
      </StatCardsGrid>

      {!activeBatchMeta ? (
        <EmptyState
          title="No contributions for this month"
          description={`Charge members to generate dues for ${formatMonthLabel(month)}.`}
          action={
            <Button onClick={() => setChargeOpen(true)} leftIcon={<Receipt className="h-4 w-4" />}>
              Charge Members
            </Button>
          }
        />
      ) : (
      <DataTable
        columns={columns}
        data={activeBatch?.dues ?? []}
        loading={isLoading || duesLoading}
        searchPlaceholder="Search members…"
        emptyTitle="No members in batch"
        emptyDescription="This batch has no member dues."
        actions={(due) => dueActions(due)}
        renderMobileCard={(due) => (
          <div className="space-y-1">
            <p className="font-semibold text-slate-800 dark:text-slate-100">{due.memberName}</p>
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="font-mono text-slate-600 dark:text-slate-300">
                Due {formatCurrency(due.amount, currency)}
              </span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                Bal {formatCurrency(due.balance, currency)}
              </span>
            </div>
            <Badge className={DUE_STATUS_STYLES[due.status]} dot>
              {due.status}
            </Badge>
          </div>
        )}
      />
      )}

      <ChargeMembersModal
        open={chargeOpen}
        onClose={() => setChargeOpen(false)}
        defaultAmount={settings?.defaultMemberDue ?? 10}
        onSubmit={(data) =>
          chargeMutation.mutate(
            { month: Number(data.month), year: Number(data.year), defaultAmount: data.defaultAmount },
            { onSuccess: () => setChargeOpen(false) }
          )
        }
        loading={chargeMutation.isPending}
      />

      <Modal
        open={!!receiveFor}
        onClose={closeReceive}
        title="Receive Contribution"
        subtitle={
          receiveFor
            ? `${receiveFor.memberName} · ${monthName(activeBatch?.month ?? 0)} ${activeBatch?.year ?? ""}`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={closeReceive}>
              Cancel
            </Button>
            <Button
              disabled={!receiveFor || !receiveAccId || receiveAmount <= 0 || receiveAmount > (receiveFor?.balance ?? 0)}
              loading={receiveMutation.isPending}
              onClick={handleReceive}
            >
              Receive {receiveFor ? formatCurrency(receiveAmount, currency) : ""}
            </Button>
          </>
        }
      >
        {receiveFor && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Due</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {formatCurrency(receiveFor.amount, currency)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Paid</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(receiveFor.paidAmount, currency)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Balance</p>
                <p className="text-sm font-bold text-rose-600 dark:text-rose-400">
                  {formatCurrency(receiveFor.balance, currency)}
                </p>
              </div>
            </div>
            <Input
              label="Amount to receive"
              type="number"
              step="0.01"
              value={receiveAmount}
              onChange={(e) => setReceiveAmount(Number(e.target.value))}
            />
            <Select
              label="Deposit to account"
              required
              value={receiveAccId}
              onChange={(e) => setReceiveAccId(e.target.value)}
              options={[
                { value: "", label: accounts.length ? "Select account…" : "No accounts — create one first" },
                ...accounts.map((a) => ({
                  value: String(a.accId),
                  label: formatAccountOptionLabel(a, currency),
                })),
              ]}
            />
            <div>
              <p className="mb-1.5 text-xs font-semibold text-ink-soft">Payment proof (image / PDF)</p>
              <FileUpload
                label="Drop receipt image here, or click to browse"
                accept="image/*,.pdf"
                value={receiptFiles}
                onChange={setReceiptFiles}
              />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!creditFor}
        onClose={closeCredit}
        title="Grant Member Loan"
        subtitle={creditFor?.memberName}
        footer={
          <>
            <Button variant="secondary" onClick={closeCredit}>Cancel</Button>
            <Button
              loading={grantCreditMutation.isPending}
              disabled={!creditFor || !creditAccId || creditAmount <= 0}
              onClick={() => {
                if (!creditFor || !creditAccId) return;
                grantCreditMutation.mutate(
                  {
                    memberId: creditFor.memberId,
                    amount: creditAmount,
                    accId: Number(creditAccId),
                    notes: creditNotes || undefined,
                    creditDate: todayISO(),
                  },
                  { onSuccess: () => closeCredit() }
                );
              }}
            >
              Grant loan
            </Button>
          </>
        }
      >
        {creditFor && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-brand-50 p-4 dark:bg-brand-500/10">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Outstanding loan</p>
              <p className="text-lg font-bold text-brand-700 dark:text-brand-300">
                {formatCurrency(Number(creditFor.creditBalance ?? 0), currency)}
              </p>
            </div>
            <Input
              label="Loan amount"
              type="number"
              step="0.01"
              min={0.01}
              value={creditAmount || ""}
              onChange={(e) => setCreditAmount(Number(e.target.value))}
              placeholder="Amount to lend member"
            />
            <Select
              label="Lend from account"
              required
              value={creditAccId}
              onChange={(e) => setCreditAccId(e.target.value)}
              options={[
                { value: "", label: accounts.length ? "Select account…" : "No accounts — create one first" },
                ...accounts.map((a) => ({
                  value: String(a.accId),
                  label: formatAccountOptionLabel(a, currency),
                })),
              ]}
            />
            <Input
              label="Notes"
              value={creditNotes}
              onChange={(e) => setCreditNotes(e.target.value)}
              placeholder="Reason for loan (optional)"
            />
            <p className="text-xs text-slate-400">
              Cash leaves the selected account. The member owes this amount back — it is recorded as a loan, not an expense.
            </p>
          </div>
        )}
      </Modal>

      <Modal
        open={!!repayFor}
        onClose={closeRepay}
        title="Repay Member Loan"
        subtitle={repayFor?.memberName}
        footer={
          <>
            <Button variant="secondary" onClick={closeRepay}>Cancel</Button>
            <Button
              loading={repayLoanMutation.isPending}
              disabled={!repayFor || !repayAccId || repayAmount <= 0}
              onClick={() => {
                if (!repayFor || !repayAccId) return;
                repayLoanMutation.mutate(
                  {
                    memberId: repayFor.memberId,
                    amount: repayAmount,
                    accId: Number(repayAccId),
                    notes: repayNotes || undefined,
                    repayDate: todayISO(),
                  },
                  { onSuccess: () => closeRepay() }
                );
              }}
            >
              Record repayment
            </Button>
          </>
        }
      >
        {repayFor && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-500/10">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Loan balance</p>
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                {formatCurrency(Number(repayFor.creditBalance ?? 0), currency)}
              </p>
            </div>
            <Input
              label="Repayment amount"
              type="number"
              step="0.01"
              min={0.01}
              max={Number(repayFor.creditBalance ?? 0)}
              value={repayAmount || ""}
              onChange={(e) => setRepayAmount(Number(e.target.value))}
            />
            <Select
              label="Deposit to account"
              required
              value={repayAccId}
              onChange={(e) => setRepayAccId(e.target.value)}
              options={[
                { value: "", label: accounts.length ? "Select account…" : "No accounts — create one first" },
                ...accounts.map((a) => ({
                  value: String(a.accId),
                  label: formatAccountOptionLabel(a, currency),
                })),
              ]}
            />
            <Input
              label="Notes"
              value={repayNotes}
              onChange={(e) => setRepayNotes(e.target.value)}
              placeholder="Repayment notes (optional)"
            />
          </div>
        )}
      </Modal>

      <Modal
        open={!!historyFor}
        onClose={() => setHistoryFor(undefined)}
        title="Contribution History"
        subtitle={historyFor?.memberName}
      >
        <div className="space-y-2">
          {historyDues.map((due) => {
            const batch = batches.find((b) => b.batchId === due.batchId);
            return (
              <div
                key={due.dueId}
                className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {batch ? `${monthName(batch.month)} ${batch.year}` : `Batch #${due.batchId}`}
                  </p>
                  <p className="text-xs text-slate-400">Due {formatCurrency(due.amount, currency)}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                    {formatCurrency(due.paidAmount, currency)}
                  </p>
                  <Badge className={cn("mt-0.5", DUE_STATUS_STYLES[due.status])}>{due.status}</Badge>
                </div>
              </div>
            );
          })}
          {historyDues.length === 0 && <EmptyState title="No history" />}
        </div>
      </Modal>
    </div>
  );
}

function ChargeMembersModal({
  open,
  onClose,
  defaultAmount,
  onSubmit,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  defaultAmount: number;
  onSubmit: (data: { month: string; year: string; defaultAmount: number }) => void;
  loading: boolean;
}) {
  const now = new Date();
  const { register, handleSubmit, watch } = useForm<ChargeForm>({
    defaultValues: {
      month: String(now.getMonth() + 1),
      year: String(now.getFullYear()),
      defaultAmount,
    },
  });

  const amount = Number(watch("defaultAmount") ?? 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Charge Members"
      subtitle="Generate contribution dues for a month and year."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={loading} onClick={handleSubmit(onSubmit)}>
            Generate {formatCurrency(amount)}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Month"
            options={Array.from({ length: 12 }, (_, i) => ({
              value: String(i + 1),
              label: monthName(i + 1),
            }))}
            {...register("month")}
          />
          <Select
            label="Year"
            options={[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => ({
              value: String(y),
              label: String(y),
            }))}
            {...register("year")}
          />
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Default Amount</span>
            <span className="text-xs text-slate-400">Per member</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              step="0.01"
              className="h-10 w-full rounded-xl border-0 bg-white px-3.5 text-sm font-mono font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-900 dark:text-white dark:ring-slate-700"
              {...register("defaultAmount", { valueAsNumber: true })}
            />
            <span className="shrink-0 rounded-xl bg-brand-50 px-3 py-2 text-sm font-bold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
              {formatCurrency(amount)}
            </span>
          </div>
        </div>
      </form>
    </Modal>
  );
}
