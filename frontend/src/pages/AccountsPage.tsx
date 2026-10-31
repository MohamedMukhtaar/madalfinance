import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { ArrowLeftRight, Landmark, Pencil, Plus, Star, Trash2, TrendingUp } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { DataTable } from "@/components/tables/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal, StatCard, StatCardsGrid, Badge, Tabs, DateRangeFilter, FilterBar, promptDeleteReason, type DateFilterMode } from "@/components/ui";
import { AmountVisibilityToggle } from "@/context/AmountVisibilityContext";
import { confirmDialog } from "@/components/ui/ConfirmDialog";
import { Input, Select } from "@/components/ui/FormField";
import {
  useAccounts,
  useCreateAccount,
  useSetDefaultAccount,
  useTransferAccount,
  useAccountTransfers,
  useInvalidateMoney,
} from "@/hooks/queries";
import { financeService } from "@/services/finance";
import { getErrorMessage } from "@/services/api";
import { useSettings } from "@/context/SettingsContext";
import { formatCurrency, todayISO, formatAccountOptionLabel } from "@/utils/format";
import { dateTimeColumns } from "@/utils/tableHelpers";
import { matchesDateFilter } from "@/utils/dateFilter";
import type { Account, AccountTransfer } from "@/types";
import { OtherIncomePanel } from "@/pages/IncomePage";

type Tab = "list" | "transfer" | "income";

const transferHelper = createColumnHelper<AccountTransfer>();

export default function AccountsPage() {
  const { tab: tabParam } = useParams();
  const navigate = useNavigate();
  const tab: Tab = tabParam === "transfer" ? "transfer" : tabParam === "income" ? "income" : "list";
  const { currency } = useSettings();
  const [dateMode, setDateMode] = useState<DateFilterMode>("all");
  const [day, setDay] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { data: accounts = [], isLoading } = useAccounts();
  const { data: transfers = [], isLoading: transfersLoading } = useAccountTransfers();
  const createMutation = useCreateAccount();
  const setDefaultMutation = useSetDefaultAccount();
  const transferMutation = useTransferAccount();
  const [createOpen, setCreateOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | undefined>();
  const invalidateMoney = useInvalidateMoney();
  const onFail = (fallback: string) => (err: unknown) => toast.error(getErrorMessage(err, fallback));
  const updateAccountMutation = useMutation({
    mutationFn: ({ id, number, institution }: { id: number; number: string; institution: string }) =>
      financeService.updateAccount(id, { number, institution }),
    onSuccess: () => {
      invalidateMoney();
      toast.success("Account updated");
      setEditingAccount(undefined);
    },
    onError: onFail("Failed to update account"),
  });
  const deleteAccountMutation = useMutation({
    mutationFn: (id: number) => financeService.deleteAccount(id),
    onSuccess: () => {
      invalidateMoney();
      toast.success("Account deleted");
    },
    onError: onFail("Failed to delete account"),
  });
  const deleteTransferMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => financeService.deleteTransfer(id, reason),
    onSuccess: () => {
      invalidateMoney();
      toast.success("Transfer reversed — the money is back in the source account");
    },
    onError: onFail("Failed to reverse transfer"),
  });

  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0);
  const filteredTransfers = useMemo(
    () => transfers.filter((t) => matchesDateFilter(t.transferDate, { mode: dateMode, date: day, from, to })),
    [transfers, dateMode, day, from, to]
  );

  const transferColumns = useMemo<ColumnDef<AccountTransfer, any>[]>(
    () => [
      transferHelper.display({
        id: "from",
        header: "From",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-100">{row.original.fromInstitution}</p>
            <p className="font-mono text-xs text-slate-400">{row.original.fromNumber}</p>
          </div>
        ),
      }),
      transferHelper.display({
        id: "to",
        header: "To",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-100">{row.original.toInstitution}</p>
            <p className="font-mono text-xs text-slate-400">{row.original.toNumber}</p>
          </div>
        ),
      }),
      transferHelper.accessor("amount", {
        header: "Amount",
        cell: (info) => <span className="font-mono font-bold">{formatCurrency(info.getValue(), currency)}</span>,
      }),
      ...dateTimeColumns<AccountTransfer>("transferDate", "Date", (t) => t.transferDate, (t) => t.createdAt ?? t.transferDate),
      transferHelper.accessor("notes", {
        header: "Notes",
        cell: (info) => <span className="max-w-[12rem] truncate text-slate-500">{info.getValue() ?? "—"}</span>,
      }),
      transferHelper.accessor("createdByName", {
        header: "By",
        cell: (info) => <span className="text-slate-500">{info.getValue() ?? "—"}</span>,
      }),
    ],
    [currency]
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Accounts"
        subtitle="Bank and cash accounts — income deposits here, expenses pay from here."
        actions={
          <>
            <AmountVisibilityToggle />
            {tab === "list" ? (
              <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
                New account
              </Button>
            ) : tab === "transfer" ? (
              <Button leftIcon={<ArrowLeftRight className="h-4 w-4" />} onClick={() => setTransferOpen(true)}>
                New transfer
              </Button>
            ) : null}
          </>
        }
      />

      <Tabs
        tabs={[
          { label: "Accounts", value: "list", icon: <Landmark className="h-4 w-4" /> },
          { label: "Transfers", value: "transfer", icon: <ArrowLeftRight className="h-4 w-4" />, count: filteredTransfers.length },
          { label: "Other Income", value: "income", icon: <TrendingUp className="h-4 w-4" /> },
        ]}
        active={tab}
        onChange={(v) => navigate(v === "list" ? "/accounts" : `/accounts/${v}`)}
      />

      {tab === "list" && (
        <>
          <StatCardsGrid className="sm:grid-cols-2">
            <StatCard label="Accounts" value={String(accounts.length)} icon={<Landmark className="h-4 w-4" />} iconClassName="bg-brand-50 text-brand-600" loading={isLoading} />
            <StatCard label="Total balance" value={formatCurrency(totalBalance, currency)} icon={<Landmark className="h-4 w-4" />} iconClassName="bg-emerald-50 text-emerald-600" loading={isLoading} />
          </StatCardsGrid>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((a) => (
              <Card key={a.accId} hover>
                <CardBody className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900 dark:text-white">{a.institution}</p>
                      <p className="font-mono text-xs text-slate-400">{a.number}</p>
                    </div>
                    {Boolean(a.isDefault) ? (
                      <Badge className="bg-amber-50 text-amber-700 ring-amber-200">
                        <Star className="mr-1 h-3 w-3" /> Default
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setDefaultMutation.mutate(a.accId)}
                        loading={setDefaultMutation.isPending}
                      >
                        Set default
                      </Button>
                    )}
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-2">
                    <p className="font-mono text-lg font-bold text-emerald-600">{formatCurrency(a.balance, currency)}</p>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        title="Edit account"
                        aria-label={`Edit ${a.institution}`}
                        onClick={() => setEditingAccount(a)}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Delete account"
                        aria-label={`Delete ${a.institution}`}
                        onClick={async () => {
                          const ok = await confirmDialog({
                            title: `Delete ${a.institution}?`,
                            text: "Only accounts that were never used can be deleted. Accounts with payments keep their history.",
                            confirmText: "Delete",
                          });
                          if (ok) deleteAccountMutation.mutate(a.accId);
                        }}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
            {!isLoading && accounts.length === 0 && (
              <Card className="sm:col-span-2 lg:col-span-3">
                <CardBody className="py-8 text-center text-sm text-slate-400">
                  No accounts yet. Create one before recording payments.
                </CardBody>
              </Card>
            )}
          </div>
        </>
      )}

      {tab === "transfer" && (
        <DataTable
          columns={transferColumns}
          data={filteredTransfers}
          loading={transfersLoading}
          searchPlaceholder="Search transfers…"
          emptyTitle="No transfers"
          emptyDescription="No transfers for the selected dates."
          toolbar={
            <FilterBar>
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
            </FilterBar>
          }
          actions={(row) => [
            {
              label: "Delete (reverse)",
              icon: <Trash2 className="h-4 w-4" />,
              danger: true,
              onClick: async () => {
                const reason = await promptDeleteReason({
                  title: "Reverse this transfer?",
                  text: `${formatCurrency(row.amount, currency)} moves back from ${row.toInstitution ?? "the receiving account"} to ${row.fromInstitution ?? "the source account"}.`,
                  confirmText: "Reverse transfer",
                });
                if (reason) deleteTransferMutation.mutate({ id: row.transferId, reason });
              },
            },
          ]}
        />
      )}

      {tab === "income" && <OtherIncomePanel />}

      <CreateAccountModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={(d) => createMutation.mutate(d, { onSuccess: () => setCreateOpen(false) })}
        loading={createMutation.isPending}
      />

      <EditAccountModal
        account={editingAccount}
        onClose={() => setEditingAccount(undefined)}
        loading={updateAccountMutation.isPending}
        onSave={(d) => editingAccount && updateAccountMutation.mutate({ id: editingAccount.accId, ...d })}
      />

      <TransferModal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        accounts={accounts}
        currency={currency}
        loading={transferMutation.isPending}
        onSubmit={(d) =>
          transferMutation.mutate(d, {
            onSuccess: () => setTransferOpen(false),
          })
        }
      />
    </div>
  );
}

function EditAccountModal({
  account,
  onClose,
  onSave,
  loading,
}: {
  account?: Account;
  onClose: () => void;
  onSave: (d: { number: string; institution: string }) => void;
  loading: boolean;
}) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ number: string; institution: string }>();
  useEffect(() => {
    if (account) reset({ number: account.number, institution: account.institution });
  }, [account, reset]);

  return (
    <Modal
      open={!!account}
      onClose={onClose}
      title="Edit account"
      subtitle="The balance changes only through payments, expenses and transfers."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={loading} onClick={handleSubmit((d) => onSave({ number: d.number.trim(), institution: d.institution.trim() }))}>
            Save
          </Button>
        </>
      }
    >
      <form className="space-y-3">
        <Input label="Account number" required error={errors.number?.message} {...register("number", { required: "Required" })} />
        <Input label="Institution" required error={errors.institution?.message} {...register("institution", { required: "Required" })} />
      </form>
    </Modal>
  );
}

function CreateAccountModal({
  open,
  onClose,
  onCreate,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (d: { number: string; institution: string; balance?: number; isDefault?: boolean }) => void;
  loading: boolean;
}) {
  const { register, handleSubmit, reset } = useForm<{ number: string; institution: string; balance: number; isDefault: boolean }>();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New account"
      subtitle="e.g. Salaam Bank, Cash box, EVC wallet"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            loading={loading}
            onClick={handleSubmit(async (d) => {
              const ok = await confirmDialog({
                title: "Ma hubtaa ah?",
                text: `Create account ${d.institution} (${d.number})?`,
                confirmText: "Haa",
                cancelText: "Maya",
                icon: "question",
              });
              if (!ok) return;
              onCreate({ number: d.number, institution: d.institution, balance: Number(d.balance || 0), isDefault: d.isDefault });
              reset();
            })}
          >
            Create
          </Button>
        </>
      }
    >
      <form className="space-y-3">
        <Input label="Account number" required placeholder="e.g. 3012345678" {...register("number", { required: true })} />
        <Input label="Institution" required placeholder="e.g. Salaam Bank" {...register("institution", { required: true })} />
        <Input label="Opening balance" type="number" step="0.01" defaultValue={0} {...register("balance")} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("isDefault")} className="rounded" />
          Set as default for payments
        </label>
      </form>
    </Modal>
  );
}

function TransferModal({
  open,
  onClose,
  accounts,
  currency,
  loading,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  accounts: Account[];
  currency: string;
  loading: boolean;
  onSubmit: (d: { fromAccId: number; toAccId: number; amount: number; transferDate: string; notes?: string }) => void;
}) {
  const { register, handleSubmit, reset } = useForm<{
    fromAccId: string;
    toAccId: string;
    amount: number;
    date: string;
    notes: string;
  }>({ defaultValues: { date: todayISO() } });

  const opts = accounts.map((a) => ({
    value: String(a.accId),
    label: formatAccountOptionLabel(a, currency),
  }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Transfer between accounts"
      subtitle="Move money from one account to another"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            loading={loading}
            onClick={handleSubmit((d) => {
              onSubmit({
                fromAccId: Number(d.fromAccId),
                toAccId: Number(d.toAccId),
                amount: Number(d.amount),
                transferDate: d.date,
                notes: d.notes || undefined,
              });
              reset({ date: todayISO(), fromAccId: "", toAccId: "", amount: 0, notes: "" });
            })}
          >
            Transfer
          </Button>
        </>
      }
    >
      <form className="space-y-3">
        <Select label="From account" required options={[{ value: "", label: "Select…" }, ...opts]} {...register("fromAccId", { required: true })} />
        <Select label="To account" required options={[{ value: "", label: "Select…" }, ...opts]} {...register("toAccId", { required: true })} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Amount" type="number" step="0.01" required {...register("amount", { required: true, min: 0.01 })} />
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Date</label>
            <input type="date" className="h-10 w-full rounded-xl bg-white px-3 text-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700" {...register("date")} />
          </div>
        </div>
        <Input label="Notes" placeholder="Optional" {...register("notes")} />
      </form>
    </Modal>
  );
}
