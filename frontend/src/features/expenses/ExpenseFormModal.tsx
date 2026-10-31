import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Textarea } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { useExpenseCategories, useAccounts, useDefaultAccount, useInvalidateExpenses } from "@/hooks/queries";
import { useAuth } from "@/context/AuthContext";
import { financeService, type ExpenseChargeRecord } from "@/services/finance";
import { getErrorMessage } from "@/services/api";
import { PAYMENT_METHODS } from "@/utils/constants";
import { formatAccountOptionLabel, formatCurrency, todayISO } from "@/utils/format";
import { useSettings } from "@/context/SettingsContext";
import type { Expense } from "@/types";

interface ExpenseForm {
  categoryId: string;
  description: string;
  amount: number;
  accId: string;
  method: string;
  reference: string;
  date: string;
  notes: string;
}

/**
 * Record an expense straight away, pay a bill from the Charges tab (`charge`), or edit a
 * recorded payment (`expense`). Amount/account edits are booked as ledger corrections.
 */
export function ExpenseFormModal({
  open,
  onClose,
  charge,
  expense,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  charge?: ExpenseChargeRecord;
  expense?: Expense;
  onSuccess?: () => void;
}) {
  const mode: "create" | "pay" | "edit" = expense ? "edit" : charge ? "pay" : "create";
  const invalidate = useInvalidateExpenses();
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
    if (!open) return;
    const defAcc = defaultAccount?.accId ?? accounts.find((a) => a.isDefault)?.accId ?? accounts[0]?.accId;
    if (expense) {
      reset({
        categoryId: String(expense.expenseCategoryId ?? expense.categoryId ?? ""),
        description: expense.description ?? "",
        amount: Number(expense.amount),
        accId: expense.accId ? String(expense.accId) : defAcc ? String(defAcc) : "",
        method: expense.paymentMethod ?? "Cash",
        reference: expense.referenceNumber ?? "",
        date: String(expense.expenseDate ?? "").slice(0, 10) || todayISO(),
        notes: expense.notes ?? "",
      });
      return;
    }
    reset({
      categoryId: charge ? String(charge.expenseCategoryId) : expenseCategories[0] ? String(expenseCategories[0].id) : "",
      description: charge?.description ?? "",
      amount: charge ? charge.balance : 0,
      accId: defAcc ? String(defAcc) : "",
      method: "Cash",
      reference: "",
      date: todayISO(),
      notes: "",
    });
  }, [open, reset, expenseCategories, defaultAccount, accounts, charge, expense]);

  const mutation = useMutation({
    mutationFn: (data: ExpenseForm) => {
      const common = {
        amount: Number(data.amount),
        accId: data.accId ? Number(data.accId) : undefined,
        paymentMethod: data.method,
        referenceNumber: data.reference || undefined,
        expenseDate: data.date,
        paidBy: paidByName,
        notes: data.notes || undefined,
      };
      if (mode === "edit" && expense) {
        return financeService.updateExpense(expense.expenseId, {
          ...common,
          expenseCategoryId: Number(data.categoryId),
          description: data.description,
        });
      }
      if (mode === "pay" && charge) return financeService.payExpenseCharge(charge.expenseChargeId, common);
      return financeService.createExpense({
        ...common,
        expenseCategoryId: Number(data.categoryId),
        description: data.description,
        referenceNumber: data.reference || "Manual entry",
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success(mode === "edit" ? "Expense updated" : mode === "pay" ? "Charge paid" : "Expense recorded");
      onSuccess?.();
      onClose();
    },
    onError: (err) => toast.error(getErrorMessage(err, "Failed to save expense")),
  });

  const title = mode === "edit" ? "Edit Expense" : mode === "pay" ? "Pay Expense Charge" : "Record Expense Payment";
  const subtitle =
    mode === "edit"
      ? "Changing the amount or account posts a correction to the ledger."
      : mode === "pay" && charge
        ? `${charge.categoryName} · ${formatCurrency(charge.balance, currency)} still to pay`
        : "Money is deducted from the selected account.";

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={title}
      subtitle={subtitle}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={mutation.isPending} onClick={handleSubmit((d) => mutation.mutate(d))}>
            {mode === "edit" ? "Save changes" : mode === "pay" ? "Pay" : "Record expense"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
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
            disabled={mode === "pay"}
            options={[
              { value: "", label: "Select a category…" },
              ...expenseCategories.map((c) => ({ value: String(c.id), label: c.name })),
            ]}
            {...register("categoryId", { required: "Category is required" })}
          />
          <Input
            label={mode === "pay" ? "Amount to pay" : "Amount"}
            required
            type="number"
            step="0.01"
            placeholder="0.00"
            error={errors.amount?.message}
            hint={mode === "pay" && charge ? `Up to ${formatCurrency(charge.balance, currency)} — pay less for a part payment` : undefined}
            {...register("amount", {
              required: "Amount is required",
              valueAsNumber: true,
              min: { value: 0.01, message: "Amount must be positive" },
              ...(mode === "pay" && charge
                ? { max: { value: charge.balance, message: `No more than ${formatCurrency(charge.balance, currency)}` } }
                : {}),
            })}
          />
        </div>
        <Input
          label="Description"
          required={mode !== "pay"}
          disabled={mode === "pay"}
          placeholder="e.g. Office internet bill"
          error={errors.description?.message}
          {...register("description", mode === "pay" ? {} : { required: "Description is required" })}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Select label="Method" options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))} {...register("method")} />
          <Input label="Reference" placeholder="REF-0001" {...register("reference")} />
          <Input label="Date" type="date" {...register("date")} />
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
