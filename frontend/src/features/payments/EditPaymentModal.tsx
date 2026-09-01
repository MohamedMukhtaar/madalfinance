import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { useUpdatePayment, useAccounts } from "@/hooks/queries";
import { PAYMENT_METHODS } from "@/utils/constants";
import { formatCurrency, formatAccountOptionLabel } from "@/utils/format";
import { useSettings } from "@/context/SettingsContext";
import { financeService } from "@/services/finance";
import type { Payment } from "@/types";

interface EditForm {
  amount: number;
  accId: string;
  method: string;
  reference: string;
  date: string;
  notes: string;
}

export function EditPaymentModal({
  open,
  onClose,
  payment,
}: {
  open: boolean;
  onClose: () => void;
  payment?: Payment;
}) {
  const mutation = useUpdatePayment();
  const { currency } = useSettings();
  const { data: accounts = [] } = useAccounts();

  const { data: fullPayment } = useQuery({
    queryKey: ["payments", payment?.paymentId],
    queryFn: () => financeService.payment(payment!.paymentId),
    enabled: open && !!payment?.paymentId,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<EditForm>();

  const amount = watch("amount");

  const maxAmount = useMemo(() => {
    const allocs = fullPayment?.allocations ?? [];
    if (!allocs.length) return undefined;
    return allocs.reduce((sum, a) => {
      const total = Number(a.totalAmount ?? 0);
      const paid = Number(a.paidAmount ?? 0);
      const allocated = Number(a.amountAllocated ?? 0);
      return sum + Math.max(0, total - paid + allocated);
    }, 0);
  }, [fullPayment]);

  useEffect(() => {
    if (open && payment) {
      reset({
        amount: payment.amount,
        accId: payment.accId ? String(payment.accId) : "",
        method: payment.paymentMethod,
        reference: payment.referenceNumber ?? "",
        date: payment.paymentDate?.slice(0, 10) ?? "",
        notes: payment.notes ?? "",
      });
    }
  }, [open, payment, reset]);

  const onSubmit = (data: EditForm) => {
    if (!payment) return;
    mutation.mutate(
      {
        id: payment.paymentId,
        amount: Number(data.amount),
        accId: data.accId ? Number(data.accId) : undefined,
        paymentDate: data.date,
        paymentMethod: data.method,
        referenceNumber: data.reference || null,
        notes: data.notes || null,
      },
      { onSuccess: () => onClose() }
    );
  };

  if (!payment) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={`Edit ${payment.paymentNumber}`}
      subtitle={payment.customerName}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={mutation.isPending} onClick={handleSubmit(onSubmit)}>
            Save changes
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Customer</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white">{payment.customerName}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Amount"
            required
            type="number"
            step="0.01"
            error={errors.amount?.message}
            {...register("amount", {
              required: "Amount is required",
              min: { value: 0.01, message: "Amount must be positive" },
              validate: (v) =>
                maxAmount === undefined || Number(v) <= maxAmount + 0.001 || `Amount cannot exceed ${formatCurrency(maxAmount, currency)}`,
            })}
          />
          <Select
            label="Deposit account"
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
        </div>

        {maxAmount !== undefined && (
          <p className="text-xs text-slate-400">
            Maximum allowed: {formatCurrency(maxAmount, currency)} based on linked invoice balances.
            {amount !== payment.amount && (
              <span className="block mt-1 text-amber-600 dark:text-amber-400">
                Account balance will be adjusted by {formatCurrency(Math.abs(Number(amount || 0) - payment.amount), currency)}
                {Number(amount || 0) > payment.amount ? " (credited)" : " (debited)"}.
              </span>
            )}
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Method"
            required
            options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))}
            {...register("method", { required: true })}
          />
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Date</label>
            <input
              type="date"
              className="h-10 w-full rounded-xl border-0 bg-white px-3.5 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-900 dark:text-white dark:ring-slate-700"
              {...register("date", { required: "Date is required" })}
            />
            {errors.date && <p className="text-xs text-rose-500">{errors.date.message}</p>}
          </div>
        </div>

        <Input label="Reference number" placeholder="e.g. Bank transfer reference" {...register("reference")} />
        <Input label="Notes" placeholder="Optional notes" {...register("notes")} />
      </form>
    </Modal>
  );
}
