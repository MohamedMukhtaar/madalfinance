import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { useGenerateInvoice } from "@/hooks/queries";
import { useSettings } from "@/context/SettingsContext";
import { formatCurrency, formatDate, todayISO } from "@/utils/format";
import type { Customer, Project } from "@/types";

interface InvoiceForm {
  customerId: string;
  projectId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  dueDate: string;
}

export function GenerateInvoiceModal({
  open,
  onClose,
  defaultCustomerId,
  defaultProjectId,
  customers,
  projects,
}: {
  open: boolean;
  onClose: () => void;
  defaultCustomerId?: number;
  defaultProjectId?: number;
  customers: Customer[];
  projects: Project[];
}) {
  const mutation = useGenerateInvoice();
  const { currency, settings } = useSettings();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<InvoiceForm>({
    defaultValues: {
      customerId: defaultCustomerId ? String(defaultCustomerId) : "",
      projectId: defaultProjectId ? String(defaultProjectId) : "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      taxRate: 5,
      dueDate: todayISO(),
    },
  });

  const customerId = watch("customerId");
  const quantity = Number(watch("quantity") ?? 0);
  const unitPrice = Number(watch("unitPrice") ?? 0);
  const taxRate = Number(watch("taxRate") ?? 0);

  useEffect(() => {
    if (open) {
      reset({
        customerId: defaultCustomerId ? String(defaultCustomerId) : "",
        projectId: defaultProjectId ? String(defaultProjectId) : "",
        description: "",
        quantity: 1,
        unitPrice: 0,
        taxRate: 5,
        dueDate: todayISO(),
      });
    }
  }, [open, defaultCustomerId, defaultProjectId, reset]);

  const filteredProjects = useMemo(
    () => (customerId ? projects.filter((p) => p.customerId === Number(customerId)) : projects),
    [customerId, projects]
  );

  const subtotal = round2(quantity * unitPrice);
  const tax = round2(subtotal * (taxRate / 100));
  const total = round2(subtotal + tax);

  const onSubmit = (data: InvoiceForm) => {
    mutation.mutate(
      {
        customerId: Number(data.customerId),
        projectId: data.projectId ? Number(data.projectId) : undefined,
        invoiceDate: todayISO(),
        dueDate: data.dueDate,
        discount: 0,
        tax: tax,
        items: [{
          description: data.description,
          quantity: Number(data.quantity),
          unitPrice: Number(data.unitPrice),
        }],
        status: "Issued",
      },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Generate Invoice"
      subtitle={`New invoice will use the ${settings?.invoicePrefix ?? "INV-"} prefix.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={mutation.isPending} onClick={handleSubmit(onSubmit)}>
            Generate invoice
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
            label="Project (optional)"
            options={[{ value: "", label: "No project" }, ...filteredProjects.map((p) => ({ value: String(p.projectId), label: p.projectName }))]}
            {...register("projectId")}
          />
        </div>
        <Input
          label="Description"
          required
          placeholder="e.g. Monthly web hosting fee"
          error={errors.description?.message}
          {...register("description", { required: "Description is required" })}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Input label="Qty" type="number" step="0.01" {...register("quantity", { min: 1 })} />
          <Input label="Unit Price" type="number" step="0.01" {...register("unitPrice", { min: 0 })} />
          <Input label="Tax %" type="number" step="0.1" {...register("taxRate", { min: 0 })} />
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Due Date</label>
            <input type="date" className="h-10 w-full rounded-xl border-0 bg-white px-3.5 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-900 dark:text-white dark:ring-slate-700" {...register("dueDate", { required: true })} />
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
            <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">{formatCurrency(subtotal, currency)}</span>
          </div>
          <div className="mt-1.5 flex justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">Tax ({taxRate}%)</span>
            <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">{formatCurrency(tax, currency)}</span>
          </div>
          <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 dark:border-slate-700">
            <span className="text-sm font-bold text-slate-900 dark:text-white">Total</span>
            <span className="font-mono text-base font-bold text-brand-600 dark:text-brand-400">{formatCurrency(total, currency)}</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">Due {formatDate(watch("dueDate"))}</p>
        </div>
      </form>
    </Modal>
  );
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
