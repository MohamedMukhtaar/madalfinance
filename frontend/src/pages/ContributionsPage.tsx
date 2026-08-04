import { useMemo, useState, startTransition } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { History, Paperclip, Receipt, UsersRound, Wallet, AlertTriangle } from "lucide-react";
import { DataTable } from "@/components/tables/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import {
  Badge,
  StatCard,
  Modal,
  Input,
  Select,
  EmptyState,
  ErrorState,
  FileUpload,
  type UploadedFile,
} from "@/components/ui";
import { useChargeMembers, useDueBatch, useDues, useReceiveDue } from "@/hooks/queries";
import { useSettings } from "@/context/SettingsContext";
import { financeService } from "@/services/finance";
import { DUE_STATUS_STYLES } from "@/utils/constants";
import { formatCurrency, monthName } from "@/utils/format";
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
  const { currency, settings } = useSettings();

  const [selectedBatch, setSelectedBatch] = useState<string>("latest");
  const [chargeOpen, setChargeOpen] = useState(false);
  const [receiveFor, setReceiveFor] = useState<MemberDue | undefined>();
  const [receiveAmount, setReceiveAmount] = useState<number>(0);
  const [receiptFiles, setReceiptFiles] = useState<UploadedFile[]>([]);
  const [historyFor, setHistoryFor] = useState<MemberDue | undefined>();

  const activeBatchMeta = useMemo(() => {
    if (!batches.length) return undefined;
    if (selectedBatch === "latest") return batches[0];
    return batches.find((b) => String(b.batchId) === selectedBatch) ?? batches[0];
  }, [batches, selectedBatch]);

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
        cell: (info) => {
          const due = info.row.original;
          const paid = due.balance <= 0;
          return (
            <div className="flex items-center justify-end gap-1.5">
              <Button
                size="sm"
                variant={paid ? "secondary" : "success"}
                disabled={paid}
                onClick={() => {
                  setReceiveFor(due);
                  setReceiveAmount(due.balance);
                  setReceiptFiles([]);
                }}
                leftIcon={<Wallet className="h-3.5 w-3.5" />}
              >
                {paid ? "Paid" : "Receive"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setHistoryFor(due)}>
                <History className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        },
      }),
    ],
    [currency]
  );

  const closeReceive = () => {
    setReceiveFor(undefined);
    setReceiptFiles([]);
  };

  const handleReceive = () => {
    if (!receiveFor) return;
    receiveMutation.mutate(
      {
        dueId: receiveFor.dueId,
        amount: receiveAmount,
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
          <Button onClick={() => setChargeOpen(true)} leftIcon={<Receipt className="h-4 w-4" />}>
            Charge Members
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          index={0}
          loading={isLoading || duesLoading}
          label="Expected"
          value={formatCurrency(batchStats.expected || Number(activeBatchMeta?.expectedAmount ?? 0), currency)}
          icon={<Receipt className="h-5 w-5" />}
          iconClassName="bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
        />
        <StatCard
          index={1}
          loading={isLoading || duesLoading}
          label="Collected"
          value={formatCurrency(batchStats.collected || Number(activeBatchMeta?.collectedAmount ?? 0), currency)}
          icon={<Wallet className="h-5 w-5" />}
          iconClassName="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
        />
        <StatCard
          index={2}
          loading={isLoading || duesLoading}
          label="Pending"
          value={formatCurrency(batchStats.pending + batchStats.partial, currency)}
          icon={<UsersRound className="h-5 w-5" />}
          iconClassName="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
        />
        <StatCard
          index={3}
          loading={isLoading || duesLoading}
          label="Overdue"
          value={formatCurrency(batchStats.overdue, currency)}
          icon={<AlertTriangle className="h-5 w-5" />}
          iconClassName="bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
        />
      </div>

      <DataTable
        columns={columns}
        data={activeBatch?.dues ?? []}
        loading={isLoading || duesLoading}
        searchPlaceholder="Search members…"
        toolbar={
          <Select
            value={selectedBatch}
            onChange={(e) => startTransition(() => setSelectedBatch(e.target.value))}
            options={[
              { value: "latest", label: "Latest month" },
              ...batches.map((b: DueBatch) => ({
                value: String(b.batchId),
                label: `${monthName(b.month)} ${b.year}`,
              })),
            ]}
            className="w-44"
          />
        }
        emptyTitle="No contributions"
        emptyDescription="Charge members to generate this month's dues."
      />

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
              disabled={!receiveFor || receiveAmount <= 0 || receiveAmount > (receiveFor?.balance ?? 0)}
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
        <div className="grid grid-cols-2 gap-4">
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
