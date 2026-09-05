import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2, TrendingUp } from "lucide-react";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/Button";
import { DateRangeFilter, type DateFilterMode, Modal, StatCard, StatCardsGrid, promptDeleteReason } from "@/components/ui";
import { Input, Select, Textarea } from "@/components/ui/FormField";
import {
  useAccounts,
  useCreateIncome,
  useDefaultAccount,
  useDeleteIncome,
  useIncome,
  useIncomeCategories,
} from "@/hooks/queries";
import { useSettings } from "@/context/SettingsContext";
import { useAuth } from "@/context/AuthContext";
import { formatAccountOptionLabel, formatCurrency, formatDate, todayISO } from "@/utils/format";
import { canManage } from "@/utils/roles";
import type { OtherIncome } from "@/types";

const columnHelper = createColumnHelper<OtherIncome>();

interface IncomeForm {
  accId: string;
  categoryName: string;
  description: string;
  amount: number;
  incomeDate: string;
  notes: string;
}

export function OtherIncomePanel() {
  const { user } = useAuth();
  const manage = canManage(user?.role);
  const { currency } = useSettings();
  const createMutation = useCreateIncome();
  const deleteMutation = useDeleteIncome();
  const { data: accounts = [] } = useAccounts();

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(12);
  const [modalOpen, setModalOpen] = useState(false);
  const [dateMode, setDateMode] = useState<DateFilterMode>("all");
  const [day, setDay] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const listParams = useMemo(() => {
    const base: Record<string, string | number> = {
      page: pageIndex + 1,
      perPage: pageSize,
      sort: "income_date:desc",
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

  const { data, isLoading, error, refetch } = useIncome(listParams);
  const statsParams = useMemo(() => {
    const base: Record<string, string | number> = { page: 1, perPage: 100, sort: "income_date:desc" };
    if (dateMode === "day" && day) {
      base.fromDate = day;
      base.toDate = day;
    } else if (dateMode === "range") {
      if (from) base.fromDate = from;
      if (to) base.toDate = to;
    }
    return base;
  }, [dateMode, day, from, to]);
  const { data: statsData } = useIncome(statsParams);
  const { data: categories = [] } = useIncomeCategories();
  const rows = data?.rows ?? [];
  const totalCount = data?.total ?? 0;
  const totalAmount = useMemo(
    () => (statsData?.rows ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0),
    [statsData?.rows]
  );

  const columns = useMemo<ColumnDef<OtherIncome, unknown>[]>(
    () => [
      columnHelper.accessor("incomeDate", {
        header: "Date",
        cell: (info) => <span className="text-sm text-slate-600 dark:text-slate-300">{formatDate(info.getValue())}</span>,
      }),
      columnHelper.display({
        id: "account",
        header: "Account",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-100">{row.original.institution || "—"}</p>
            <p className="font-mono text-xs text-slate-400">{row.original.number || ""}</p>
          </div>
        ),
      }),
      columnHelper.accessor("categoryName", {
        header: "Category",
        cell: (info) => <span className="font-semibold text-slate-800 dark:text-slate-100">{info.getValue() || "Other"}</span>,
      }),
      columnHelper.accessor("description", {
        header: "Description",
        cell: (info) => <span className="text-slate-500 dark:text-slate-400">{info.getValue() || "—"}</span>,
      }),
      columnHelper.accessor("amount", {
        header: "Amount",
        cell: (info) => (
          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
            +{formatCurrency(Number(info.getValue()), currency)}
          </span>
        ),
      }),
      columnHelper.accessor("notes", {
        header: "Notes",
        cell: (info) => <span className="text-sm text-slate-400">{info.getValue() || "—"}</span>,
      }),
    ],
    [currency]
  );

  return (
    <div className="space-y-4">
      <StatCardsGrid className="sm:grid-cols-2">
        <StatCard
          index={0}
          loading={isLoading}
          label="Recorded"
          value={formatCurrency(totalAmount, currency)}
          icon={<TrendingUp className="h-4 w-4" />}
          iconClassName="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
        />
        <StatCard
          index={1}
          loading={isLoading}
          label="Entries"
          value={String(totalCount)}
          icon={<TrendingUp className="h-4 w-4" />}
          iconClassName="bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
        />
      </StatCardsGrid>

      <DataTable
        columns={columns}
        data={rows}
        loading={isLoading}
        error={error}
        onRetry={() => void refetch()}
        searchPlaceholder="Search income…"
        serverSide
        totalCount={totalCount}
        pageIndex={pageIndex}
        pageSize={pageSize}
        onPageChange={setPageIndex}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPageIndex(0);
        }}
        emptyTitle="No other income yet"
        emptyDescription="Record a receipt into an account — donations, interest, and other inflows."
        actions={
          manage
            ? (row) => [
                {
                  label: "Delete",
                  icon: <Trash2 className="h-4 w-4" />,
                  danger: true,
                  onClick: async () => {
                    const reason = await promptDeleteReason({
                      title: "Delete this income?",
                      text: "The amount will be reversed from the account and the record moved to Trash.",
                      confirmText: "Delete income",
                    });
                    if (reason) deleteMutation.mutate({ id: row.incomeId, reason });
                  },
                },
              ]
            : undefined
        }
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
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
            {manage && (
              <Button onClick={() => setModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
                Record income
              </Button>
            )}
          </div>
        }
      />

      <RecordIncomeModal
        open={modalOpen}
        accounts={accounts}
        currency={currency}
        categories={categories.map((c) => c.name).filter(Boolean)}
        onClose={() => setModalOpen(false)}
        onCreate={async (payload) => {
          await createMutation.mutateAsync(payload);
          setModalOpen(false);
        }}
      />
    </div>
  );
}

function RecordIncomeModal({
  open,
  accounts,
  currency,
  categories,
  onClose,
  onCreate,
}: {
  open: boolean;
  accounts: Array<{ accId: number; institution: string; number: string; balance?: number; isDefault?: boolean }>;
  currency: string;
  categories: string[];
  onClose: () => void;
  onCreate: (data: {
    accId?: number;
    categoryName?: string;
    description?: string;
    amount: number;
    incomeDate: string;
    notes?: string;
  }) => Promise<void>;
}) {
  const { data: defaultAccount } = useDefaultAccount();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<IncomeForm>();

  const accountOptions = accounts.map((a) => ({
    value: String(a.accId),
    label: formatAccountOptionLabel(a, currency),
  }));

  useEffect(() => {
    if (!open) return;
    const fallback = defaultAccount?.accId ?? accounts.find((a) => a.isDefault)?.accId ?? accounts[0]?.accId;
    reset({
      accId: fallback ? String(fallback) : "",
      categoryName: "Other",
      description: "",
      amount: 0,
      incomeDate: todayISO(),
      notes: "",
    });
  }, [open, reset, defaultAccount, accounts]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record other income"
      subtitle="This deposits money into the selected account and posts to the ledger."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={isSubmitting}
            onClick={handleSubmit(async (d) => {
              await onCreate({
                accId: d.accId ? Number(d.accId) : undefined,
                categoryName: d.categoryName.trim() || "Other",
                description: d.description.trim() || undefined,
                amount: Number(d.amount),
                incomeDate: d.incomeDate,
                notes: d.notes.trim() || undefined,
              });
            })}
          >
            Save
          </Button>
        </>
      }
    >
      <form className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Select
            label="Account"
            required
            error={errors.accId?.message}
            options={[{ value: "", label: "Select account…" }, ...accountOptions]}
            {...register("accId", { required: "Account is required" })}
          />
        </div>
        <div className="sm:col-span-2">
          <Input
            label="Category"
            list="income-category-options"
            placeholder="Other"
            error={errors.categoryName?.message}
            {...register("categoryName")}
          />
          <datalist id="income-category-options">
            {categories.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
        <div className="sm:col-span-2">
          <Input label="Description" {...register("description")} />
        </div>
        <Input
          label="Amount"
          type="number"
          min={0.01}
          step="0.01"
          required
          error={errors.amount?.message}
          {...register("amount", { required: "Required", valueAsNumber: true, min: { value: 0.01, message: "Must be greater than zero" } })}
        />
        <Input
          label="Date"
          type="date"
          required
          error={errors.incomeDate?.message}
          {...register("incomeDate", { required: "Required" })}
        />
        <div className="sm:col-span-2">
          <Textarea label="Notes" {...register("notes")} />
        </div>
      </form>
    </Modal>
  );
}

export default function IncomePage() {
  return <Navigate to="/accounts/income" replace />;
}
