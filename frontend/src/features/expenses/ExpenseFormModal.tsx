import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Textarea } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { useCreateExpense, useExpenseCategories } from "@/hooks/queries";
import { useAuth } from "@/context/AuthContext";
import { PAYMENT_METHODS } from "@/utils/constants";
import { todayISO } from "@/utils/format";

interface ExpenseForm {
  categoryId: string;
  description: string;
  amount: number;
  method: string;
  reference: string;
  date: string;
  paidBy: string;
  notes: string;
}

export function ExpenseFormModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const mutation = useCreateExpense();
  const { data: expenseCategories = [] } = useExpenseCategories();
  const { user } = useAuth();
  const paidByName = user?.fullName?.trim() || user?.username || "";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ExpenseForm>();

  useEffect(() => {
    if (open) {
      reset({
        categoryId: expenseCategories[0] ? String(expenseCategories[0].id) : "",
        description: "",
        amount: 0,
        method: "Cash",
        reference: "",
        date: todayISO(),
        paidBy: paidByName,
        notes: "",
      });
    }
  }, [open, reset, expenseCategories, paidByName]);

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
        status: "Verified",
      },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Add Expense"
      subtitle="Record an expense with category and payment method."
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
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
