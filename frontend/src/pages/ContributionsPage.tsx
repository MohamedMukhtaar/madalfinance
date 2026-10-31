import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import toast from "react-hot-toast";
import {
  History,
  Paperclip,
  Pencil,
  Receipt,
  Trash2,
  UsersRound,
  Wallet,
  AlertTriangle,
  BadgeDollarSign,
} from "lucide-react";
import { DataTable } from "@/components/tables/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import {
  Avatar,
  Badge,
  StatCard,
  StatCardsGrid,
  Modal,
  Input,
  EmptyState,
  ErrorState,
  FileUpload,
  FilterBar,
  Select,
  confirmDialog,
  type UploadedFile,
} from "@/components/ui";
import {
  useAccounts,
  useChargeMembers,
  useDefaultAccount,
  useGrantMemberCredit,
  useMembers,
  useReceiveDue,
  useRepayMemberLoan,
} from "@/hooks/queries";
import { useSettings } from "@/context/SettingsContext";
import { financeService } from "@/services/finance";
import { getErrorMessage } from "@/services/api";
import { DUE_STATUS_STYLES } from "@/utils/constants";
import { formatCurrency, formatDate, monthName, todayISO, formatAccountOptionLabel } from "@/utils/format";
import { dateTimeColumns } from "@/utils/tableHelpers";
import { cn } from "@/utils/cn";
import type { MemberDue } from "@/types";

const columnHelper = createColumnHelper<MemberDue>();

interface ChargeForm {
  reason: string;
  /** Single control: "YYYY-MM" → month name + year (e.g. 2026-10 → October 2026). */
  period: string;
  defaultAmount: number;
}

/** "YYYY-MM" filter value; "" means every month. */
const periodKey = (year: number, month: number) => `${year}-${String(month).padStart(2, "0")}`;
const periodLabel = (year: number, month: number) => `${monthName(month)} ${year}`;

export default function ContributionsPage() {
  const qc = useQueryClient();
  const [period, setPeriod] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [year, monthNum] = period ? period.split("-").map(Number) : [undefined, undefined];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["dues", "list", period],
    queryFn: () =>
      financeService.memberDues({ perPage: 1000, sort: "charge_date:desc", ...(period ? { year, month: monthNum } : {}) }),
  });
  const allDues = data?.rows ?? [];
  const dues = useMemo(() => {
    if (!statusFilter) return allDues;
    return allDues.filter((d) => d.status === statusFilter);
  }, [allDues, statusFilter]);
  const { data: periods = [] } = useQuery({
    queryKey: ["dues", "periods"],
    queryFn: () => financeService.contributionPeriods(),
  });
  const unpaidBatchIds = useMemo(() => {
    const ids = new Set<number>();
    for (const d of allDues) {
      if (d.paidAmount <= 0) ids.add(d.batchId);
    }
    // Only batches where every due is unpaid can be bulk-deleted safely.
    const paidBatches = new Set(allDues.filter((d) => d.paidAmount > 0).map((d) => d.batchId));
    return [...ids].filter((id) => !paidBatches.has(id));
  }, [allDues]);

  const chargeMutation = useChargeMembers();
  const receiveMutation = useReceiveDue();
  const grantCreditMutation = useGrantMemberCredit();
  const repayLoanMutation = useRepayMemberLoan();
  const { currency, settings } = useSettings();
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
  const [editDueFor, setEditDueFor] = useState<MemberDue | undefined>();
  const [editDueAmount, setEditDueAmount] = useState<number>(0);
  const [editChargeFor, setEditChargeFor] = useState<MemberDue | undefined>();
  const [editChargeReason, setEditChargeReason] = useState("");
  const [editChargeDate, setEditChargeDate] = useState("");

  const refreshDues = () => {
    qc.invalidateQueries({ queryKey: ["dues"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };
  const onFail = (fallback: string) => (err: unknown) => toast.error(getErrorMessage(err, fallback));

  const updateDueMutation = useMutation({
    mutationFn: ({ dueId, amount }: { dueId: number; amount: number }) => financeService.updateMemberDue(dueId, amount),
    onSuccess: () => {
      refreshDues();
      toast.success("Due updated");
      setEditDueFor(undefined);
    },
    onError: onFail("Failed to update due"),
  });
  const deleteDueMutation = useMutation({
    mutationFn: (dueId: number) => financeService.deleteMemberDue(dueId),
    onSuccess: () => {
      refreshDues();
      toast.success("Due deleted");
    },
    onError: onFail("Failed to delete due"),
  });
  const updateChargeMutation = useMutation({
    mutationFn: ({ batchId, reason, chargeDate }: { batchId: number; reason: string; chargeDate: string }) =>
      financeService.updateContributionCharge(batchId, { reason, chargeDate }),
    onSuccess: () => {
      refreshDues();
      toast.success("Charge updated");
      setEditChargeFor(undefined);
    },
    onError: onFail("Failed to update charge"),
  });
  const deleteChargeMutation = useMutation({
    mutationFn: (batchId: number) => financeService.deleteContributionCharge(batchId),
    onSuccess: () => {
      refreshDues();
      toast.success("Charge deleted");
    },
    onError: onFail("Failed to delete charge"),
  });

  const batchStats = useMemo(
    () => ({
      expected: allDues.reduce((s, d) => s + Number(d.amount ?? 0), 0),
      collected: allDues.reduce((s, d) => s + Number(d.paidAmount ?? 0), 0),
      pending: allDues.filter((d) => d.status === "Pending").reduce((s, d) => s + Number(d.balance ?? 0), 0),
      partial: allDues.filter((d) => d.status === "Partial").reduce((s, d) => s + Number(d.balance ?? 0), 0),
      overdue: 0,
    }),
    [allDues]
  );

  const { data: historyDuesData } = useQuery({
    queryKey: ["dues", "member-history", historyFor?.memberId],
    queryFn: () => financeService.memberDues({ memberId: historyFor!.memberId, perPage: 50 }),
    enabled: !!historyFor?.memberId,
  });
  const historyDues = historyDuesData?.rows ?? [];

  const columns = useMemo<ColumnDef<MemberDue, any>[]>(
    () => [
      columnHelper.accessor("chargeDate", {
        header: "Charged on",
        cell: (info) => (
          <span className="whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
            {info.getValue() ? formatDate(info.getValue() as string) : "—"}
          </span>
        ),
      }),
      columnHelper.accessor("reason", {
        header: "Reason",
        cell: (info) => (
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{info.getValue() || "—"}</span>
        ),
      }),
      columnHelper.accessor("memberName", {
        header: "Member",
        cell: (info) => (
          <div className="flex items-center gap-2.5">
            <Avatar name={info.getValue() ?? ""} src={info.row.original.avatarUrl ?? undefined} size="sm" />
            <span className="font-semibold text-slate-800 dark:text-slate-100">{info.getValue()}</span>
          </div>
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

  /** Row actions: receive / edit / delete member, plus overflow for charge-level ops. */
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
      {
        label: "Edit amount",
        icon: <Pencil className="h-4 w-4" />,
        onClick: () => {
          setEditDueFor(due);
          setEditDueAmount(due.amount);
        },
      },
      {
        label: "Delete member charge",
        icon: <Trash2 className="h-4 w-4" />,
        danger: true,
        disabled: due.paidAmount > 0,
        onClick: async () => {
          const ok = await confirmDialog({
            title: `Remove ${due.memberName} from this charge?`,
            text: `${due.reason ?? "Charge"} · ${formatCurrency(due.amount, currency)}. Only unpaid member dues can be deleted.`,
            confirmText: "Delete",
          });
          if (ok) deleteDueMutation.mutate(due.dueId);
        },
      },
      {
        label: "Delete whole month charge",
        icon: <Trash2 className="h-4 w-4" />,
        danger: true,
        overflow: true,
        onClick: async () => {
          const ok = await confirmDialog({
            title: `Delete "${due.reason ?? "this charge"}" for every member?`,
            text: "Removes this charge for all members in the batch. Not possible once anyone has paid.",
            confirmText: "Delete charge",
          });
          if (ok) deleteChargeMutation.mutate(due.batchId);
        },
      },
      ...(loanOwed > 0
        ? [
            {
              label: "Repay loan",
              icon: <BadgeDollarSign className="h-4 w-4" />,
              overflow: true,
              onClick: () => openRepay(due),
            },
          ]
        : []),
      {
        label: "Grant loan",
        icon: <BadgeDollarSign className="h-4 w-4" />,
        overflow: true,
        onClick: () => openCredit(due),
      },
      {
        label: "History",
        icon: <History className="h-4 w-4" />,
        overflow: true,
        onClick: () => setHistoryFor(due),
      },
      {
        label: "Edit charge",
        icon: <Pencil className="h-4 w-4" />,
        overflow: true,
        onClick: () => {
          setEditChargeFor(due);
          setEditChargeReason(due.reason ?? "");
          setEditChargeDate(String(due.chargeDate ?? "").slice(0, 10));
        },
      },
    ];
  };

  const deleteAllUnpaidInPeriod = async () => {
    if (!period || unpaidBatchIds.length === 0) return;
    const ok = await confirmDialog({
      title: `Delete unpaid charges in ${periodLabel(year!, monthNum!)}?`,
      text: `${unpaidBatchIds.length} charge(s) with no payments will be removed for all members.`,
      confirmText: "Delete charges",
    });
    if (!ok) return;
    for (const batchId of unpaidBatchIds) {
      await deleteChargeMutation.mutateAsync(batchId);
    }
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
        subtitle="Charges and dues from Madal ICT co-founders."
        actions={
          <>
            {period && unpaidBatchIds.length > 0 && (
              <Button
                variant="secondary"
                leftIcon={<Trash2 className="h-4 w-4" />}
                loading={deleteChargeMutation.isPending}
                onClick={() => void deleteAllUnpaidInPeriod()}
              >
                Delete month charges
              </Button>
            )}
            <Button onClick={() => setChargeOpen(true)} leftIcon={<Receipt className="h-4 w-4" />}>
              Charge Members
            </Button>
          </>
        }
      />

      <StatCardsGrid>
        <StatCard
          index={0}
          loading={isLoading}
          label="Expected"
          value={formatCurrency(batchStats.expected, currency)}
          icon={<Receipt className="h-4 w-4" />}
          iconClassName="bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
        />
        <StatCard
          index={1}
          loading={isLoading}
          label="Collected"
          value={formatCurrency(batchStats.collected, currency)}
          icon={<Wallet className="h-4 w-4" />}
          iconClassName="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
        />
        <StatCard
          index={2}
          loading={isLoading}
          label="Pending"
          value={formatCurrency(batchStats.pending + batchStats.partial, currency)}
          icon={<UsersRound className="h-4 w-4" />}
          iconClassName="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
        />
        <StatCard
          index={3}
          loading={isLoading}
          label="Overdue"
          value={formatCurrency(batchStats.overdue, currency)}
          icon={<AlertTriangle className="h-4 w-4" />}
          iconClassName="bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
        />
      </StatCardsGrid>

      {!isLoading && dues.length === 0 ? (
        <EmptyState
          title={period ? `No charges in ${periodLabel(year!, monthNum!)}` : "No contribution charges yet"}
          description="Charge members for monthly dues or any other reason, at any time."
          action={
            <Button onClick={() => setChargeOpen(true)} leftIcon={<Receipt className="h-4 w-4" />}>
              Charge Members
            </Button>
          }
        />
      ) : (
      <DataTable
        columns={columns}
        data={dues}
        loading={isLoading}
        searchPlaceholder="Search members or reasons…"
        emptyTitle="No dues"
        emptyDescription="No member dues match this filter."
        toolbar={
          <FilterBar>
            <Select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              options={[
                { value: "", label: "All months" },
                ...periods.map((p) => ({
                  value: periodKey(p.year, p.month),
                  label: periodLabel(p.year, p.month),
                })),
              ]}
              className="w-auto min-w-[10rem]"
            />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: "", label: "All statuses" },
                { value: "Pending", label: "Pending" },
                { value: "Partial", label: "Partial" },
                { value: "Paid", label: "Paid" },
                { value: "Overdue", label: "Overdue" },
              ]}
              className="w-auto min-w-[9.5rem]"
            />
          </FilterBar>
        }
        actions={(due) => dueActions(due)}
        renderMobileCard={(due) => (
          <div className="space-y-1">
            <p className="font-semibold text-slate-800 dark:text-slate-100">{due.memberName}</p>
            <p className="text-xs text-slate-500">
              {due.reason ?? "Charge"} · {due.chargeDate ? formatDate(due.chargeDate) : ""}
            </p>
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
          chargeMutation.mutate(data, {
            onSuccess: () => {
              setChargeOpen(false);
              qc.invalidateQueries({ queryKey: ["dues"] });
            },
          })
        }
        loading={chargeMutation.isPending}
      />

      <Modal
        open={!!receiveFor}
        onClose={closeReceive}
        title="Receive Contribution"
        subtitle={
          receiveFor
            ? `${receiveFor.memberName} · ${receiveFor.reason ?? "Charge"}${receiveFor.chargeDate ? ` · ${formatDate(receiveFor.chargeDate)}` : ""}`
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
        open={!!editDueFor}
        onClose={() => setEditDueFor(undefined)}
        title="Edit due amount"
        subtitle={editDueFor ? `${editDueFor.memberName} · ${editDueFor.reason ?? "Charge"}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditDueFor(undefined)}>
              Cancel
            </Button>
            <Button
              loading={updateDueMutation.isPending}
              disabled={!editDueFor || editDueAmount <= 0 || editDueAmount < (editDueFor?.paidAmount ?? 0)}
              onClick={() => editDueFor && updateDueMutation.mutate({ dueId: editDueFor.dueId, amount: editDueAmount })}
            >
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <Input
            label="Amount"
            type="number"
            step="0.01"
            value={editDueAmount}
            onChange={(e) => setEditDueAmount(Number(e.target.value))}
          />
          {editDueFor && editDueFor.paidAmount > 0 && (
            <p className="text-xs text-slate-500">
              Already paid {formatCurrency(editDueFor.paidAmount, currency)}, so the amount can't go below that.
            </p>
          )}
        </div>
      </Modal>

      <Modal
        open={!!editChargeFor}
        onClose={() => setEditChargeFor(undefined)}
        title="Edit charge"
        subtitle="Changes the reason and date for every member in this charge."
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditChargeFor(undefined)}>
              Cancel
            </Button>
            <Button
              loading={updateChargeMutation.isPending}
              disabled={!editChargeReason.trim() || !editChargeDate}
              onClick={() =>
                editChargeFor &&
                updateChargeMutation.mutate({
                  batchId: editChargeFor.batchId,
                  reason: editChargeReason.trim(),
                  chargeDate: editChargeDate,
                })
              }
            >
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Reason" required value={editChargeReason} onChange={(e) => setEditChargeReason(e.target.value)} />
          <Input label="Charge date" type="date" required value={editChargeDate} onChange={(e) => setEditChargeDate(e.target.value)} />
        </div>
      </Modal>

      <Modal
        open={!!historyFor}
        onClose={() => setHistoryFor(undefined)}
        title="Contribution History"
        subtitle={historyFor?.memberName}
      >
        <div className="space-y-2">
          {historyDues.map((due) => {
            return (
              <div
                key={due.dueId}
                className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {due.reason ?? "Charge"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {due.chargeDate ? formatDate(due.chargeDate) : `${monthName(due.month ?? 1)} ${due.year ?? ""}`}
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

function currentPeriodValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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
  onSubmit: (data: {
    reason: string;
    chargeDate: string;
    defaultAmount: number;
    month: number;
    year: number;
    memberIds?: number[];
  }) => void;
  loading: boolean;
}) {
  const { data: members = [] } = useMembers({ enabled: open });
  const activeMembers = members.filter((m) => m.status === "active");
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ChargeForm>({
    defaultValues: {
      reason: "Monthly contribution",
      period: currentPeriodValue(),
      defaultAmount,
    },
  });

  useEffect(() => {
    if (!open) return;
    setExcluded(new Set());
    reset({
      reason: "Monthly contribution",
      period: currentPeriodValue(),
      defaultAmount,
    });
  }, [open, defaultAmount, reset]);

  const amount = Number(watch("defaultAmount") ?? 0);
  const periodValue = watch("period") || currentPeriodValue();
  const [periodYear, periodMonth] = periodValue.split("-").map(Number);
  const chosen = activeMembers.filter((m) => !excluded.has(m.memberId));
  const toggle = (id: number) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = handleSubmit((values) => {
    const [year, month] = values.period.split("-").map(Number);
    onSubmit({
      reason: values.reason.trim(),
      // Charge date = today when in the selected month, else 1st of that month.
      chargeDate: values.period === currentPeriodValue() ? todayISO() : `${values.period}-01`,
      defaultAmount: values.defaultAmount,
      month,
      year,
      memberIds: excluded.size ? chosen.map((m) => m.memberId) : undefined,
    });
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Charge Members"
      subtitle="Same month needs a different reason — duplicates are blocked."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={loading} disabled={chosen.length === 0} onClick={() => void submit()}>
            Charge {chosen.length} × {formatCurrency(amount)}
          </Button>
        </>
      }
    >
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <Input
          label="Reason"
          required
          placeholder="e.g. Monthly contribution, Office rent share, Internet levy"
          error={errors.reason?.message}
          {...register("reason", {
            required: "Give a reason for this charge",
            validate: (v) => !!v.trim() || "Give a reason",
          })}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Month"
            type="month"
            required
            hint={
              periodYear && periodMonth
                ? `Charging for ${periodLabel(periodYear, periodMonth)}`
                : "Select month and year"
            }
            error={errors.period?.message}
            {...register("period", { required: "Select a month" })}
          />
          <Input
            label="Amount per member"
            type="number"
            step="0.01"
            required
            error={errors.defaultAmount?.message}
            {...register("defaultAmount", {
              valueAsNumber: true,
              min: { value: 0.01, message: "Enter an amount" },
            })}
          />
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium text-ink">
            Members ({chosen.length} of {activeMembers.length})
          </p>
          <div className="max-h-48 space-y-1 overflow-y-auto border border-line p-2">
            {activeMembers.map((m) => (
              <label
                key={m.memberId}
                className="flex cursor-pointer items-center gap-2.5 px-2 py-1.5 hover:bg-muted/70"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--brand-primary)]"
                  checked={!excluded.has(m.memberId)}
                  onChange={() => toggle(m.memberId)}
                />
                <Avatar name={m.memberName} src={m.avatarUrl ?? undefined} size="xs" />
                <span className="text-sm text-ink">{m.memberName}</span>
              </label>
            ))}
            {activeMembers.length === 0 && (
              <p className="px-2 py-1 text-xs text-ink-muted">No active members.</p>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}
