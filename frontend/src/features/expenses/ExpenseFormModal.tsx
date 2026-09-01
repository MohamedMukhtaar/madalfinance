import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Textarea } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { useCreateExpense, useExpenseCategories, useAccounts, useDefaultAccount } from "@/hooks/queries";
import { useAuth } from "@/context/AuthContext";
import { PAYMENT_METHODS } from "@/utils/constants";
import { formatAccountOptionLabel, todayISO } from "@/utils/format";
import { useSettings } from "@/context/SettingsContext";

interface ExpenseForm {
  categoryId: string;
  description: string;
  amount: number;
  accId: string;
  method: string;
  reference: string;
  date: string;
  paidBy: string;
  notes: string;
}

export function ExpenseFormModal({
  open,
  onClose,
  defaults,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  defaults?: {
    categoryId?: number;
    description?: string;
    amount?: number;
    date?: string;
    method?: string;
    reference?: string;
    notes?: string;
  };
  onSuccess?: () => void;
}) {
  const mutation = useCreateExpense();
  const { data: expenseCategories = [] } = useExpenseCategories();
  const { data: accounts = [] } = useAccounts();
  const { data: defaultAccount } = useDefaultAccount();
  const { user } = useAuth();
  const { currency } = useSettings();
  const paidByName = user?.fullName?.trim() || user?.username || "";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ExpenseForm>();

  useEffect(() => {
    if (open) {
      const defAcc = defaultAccount?.accId ?? accounts.find((a) => a.isDefault)?.accId ?? accounts[0]?.accId;
      reset({
        categoryId: defaults?.categoryId
          ? String(defaults.categoryId)
          : expenseCategories[0]
            ? String(expenseCategories[0].id)
            : "",
        description: defaults?.description ?? "",
        amount: defaults?.amount ?? 0,
        accId: defAcc ? String(defAcc) : "",
        method: defaults?.method ?? "Cash",
        reference: defaults?.reference ?? "",
        date: defaults?.date ?? todayISO(),
        paidBy: paidByName,
        notes: defaults?.notes ?? "",
      });
    }
  }, [open, reset, expenseCategories, paidByName, defaults, defaultAccount, accounts]);

  const onSubmit = (data: ExpenseForm) => {
    mutation.mutate(
      {
        expenseCategoryId: Number(data.categoryId),
        description: data.description,
        amount: Number(data.amount),
        paymentMethod: data.method as typeof PAYMENT_METHODS[number],
        referenceNumber: data.reference || "Manual entry",
        expenseDate: data.date,
        paidBy: paidByName || data.paidBy,
        notes: data.notes,
        accId: data.accId ? Number(data.accId) : undefined,
        status: "Verified",
      },
      { onSuccess: () => {
          onSuccess?.();
          onClose();
        } }
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={defaults ? "Pay Expense" : "Record Expense Payment"}
      subtitle="Money is deducted from the selected account."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={mutation.isPending} onClick={handleSubmit(onSubmit)}>
            Record expense
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Pay from account"
            required
            error={errors.accId?.message}
            options={[
              { value: "", label: accounts.length ? "Select account…" : "No accounts" },
              ...accounts.map((a) => ({
                value: String(a.accId),
                label: formatAccountOptionLabel(a, currency),
              })),
            ]}
            {...register("accId", { required: "Account is required" })}
          />
          <Select
            label="Category"
            required
            options={[{ value: "", label: "Select a category…" }, ...expenseCategories.map((c) => ({ value: String(c.id), label: c.name }))]}
            {...register("categoryId", { required: "Category is required" })}
          />
          <Input
            label="Amount"
            required
            type="number"
            step="0.01"
            placeholder="0.00"
            error={errors.amount?.message}
            {...register("amount", {
              required: "Amount is required",
              min: { value: 0.01, message: "Amount must be positive" },
            })}
          />
        </div>
        <Input
          label="Description"
          required
          placeholder="e.g. Office internet bill"
          error={errors.description?.message}
          {...register("description", { required: "Description is required" })}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Select label="Method" options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))} {...register("method")} />
          <Input label="Reference" placeholder="REF-0001" {...register("reference")} />
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Date</label>
            <input type="date" className="h-10 w-full rounded-xl border-0 bg-white px-3.5 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-900 dark:text-white dark:ring-slate-700" {...register("date")} />
          </div>
          <Input
            label="Paid By"
            readOnly
            value={paidByName}
            hint="Filled from your login account"
            className="cursor-not-allowed bg-muted text-ink-soft"
          />
        </div>
        <Textarea label="Notes" placeholder="Optional notes" {...register("notes")} />
      </form>
    </Modal>
  );
}
