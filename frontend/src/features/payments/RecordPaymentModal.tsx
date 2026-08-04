import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { useRecordPayment } from "@/hooks/queries";
import { useSettings } from "@/context/SettingsContext";
import { PAYMENT_METHODS } from "@/utils/constants";
import { formatCurrency, todayISO } from "@/utils/format";
import type { Customer, Invoice } from "@/types";

interface PaymentForm {
  customerId: string;
  invoiceId: string;
  amount: number;
  method: string;
  reference: string;
  date: string;
}

export function RecordPaymentModal({
  open,
  onClose,
  defaultCustomerId,
  defaultInvoiceId,
  customers,
  invoices,
}: {
  open: boolean;
  onClose: () => void;
  defaultCustomerId?: number;
  defaultInvoiceId?: number;
  customers: Customer[];
  invoices: Invoice[];
}) {
  const mutation = useRecordPayment();
  const { currency, settings } = useSettings();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<PaymentForm>({
    defaultValues: {
      customerId: defaultCustomerId ? String(defaultCustomerId) : "",
      invoiceId: defaultInvoiceId ? String(defaultInvoiceId) : "",
      amount: 0,
      method: "Cash",
      reference: "",
      date: todayISO(),
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        customerId: defaultCustomerId ? String(defaultCustomerId) : "",
        invoiceId: defaultInvoiceId ? String(defaultInvoiceId) : "",
        amount: 0,
        method: "Cash",
        reference: "",
        date: todayISO(),
      });
    }
  }, [open, defaultCustomerId, defaultInvoiceId, reset]);

  const customerId = watch("customerId");
  const invoiceId = watch("invoiceId");

  const filteredInvoices = useMemo(
    () =>
      (customerId
        ? invoices.filter((i) => i.customerId === Number(customerId) && i.status !== "Paid" && i.status !== "Cancelled")
        : invoices.filter((i) => i.status !== "Paid" && i.status !== "Cancelled")),
    [customerId, invoices]
  );

  const selectedInvoice = useMemo(
    () => filteredInvoices.find((i) => String(i.invoiceId) === invoiceId),
    [filteredInvoices, invoiceId]
  );

  const onSubmit = (data: PaymentForm) => {
    mutation.mutate(
      {
        customerId: Number(data.customerId),
        paymentDate: data.date,
        paymentMethod: data.method as typeof PAYMENT_METHODS[number],
        amount: Number(data.amount),
        referenceNumber: data.reference || `${data.method} · manual`,
        allocations: data.invoiceId
          ? [{ invoiceId: Number(data.invoiceId), amount: Number(data.amount) }]
          : [],
      },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Record Payment"
      subtitle={`Payment number will use the ${settings?.paymentPrefix ?? "PAY-"} prefix.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={mutation.isPending} onClick={handleSubmit(onSubmit)}>
            Record payment
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Customer"
            required
            error={errors.customerId?.message}
            options={[{ value: "", label: "Select a customer…" }, ...customers.map((c) => ({ value: String(c.customerId), label: c.customerName }))]}
            {...register("customerId", { required: "Customer is required" })}
          />
          <Select
            label="Invoice"
            required
            error={errors.invoiceId?.message}
            options={[{ value: "", label: "Select an invoice…" }, ...filteredInvoices.map((i) => ({ value: String(i.invoiceId), label: `${i.invoiceNumber} · ${formatCurrency(i.balance, currency)}` }))]}
            {...register("invoiceId", { required: "Invoice is required" })}
          />
        </div>

        {selectedInvoice && (
          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-3 dark:bg-slate-800/50">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Total</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(selectedInvoice.totalAmount, currency)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Paid</p>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(selectedInvoice.paidAmount, currency)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Balance</p>
              <p className="text-sm font-bold text-rose-600 dark:text-rose-400">{formatCurrency(selectedInvoice.balance, currency)}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
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
              validate: (v) => !selectedInvoice || Number(v) <= selectedInvoice.balance + 0.001 || "Amount exceeds invoice balance",
            })}
          />
          <Select
            label="Method"
            required
            options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))}
            {...register("method")}
          />
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Date</label>
            <input type="date" className="h-10 w-full rounded-xl border-0 bg-white px-3.5 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-900 dark:text-white dark:ring-slate-700" {...register("date", { required: true })} />
          </div>
        </div>
        <Input
          label="Reference Number"
          placeholder="e.g. Bank transfer reference"
          {...register("reference")}
        />
        <p className="text-xs text-slate-400">
          This payment will be allocated to the selected invoice and recorded in the ledger.
        </p>
      </form>
    </Modal>
  );
}
