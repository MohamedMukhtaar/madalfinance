import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Textarea } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { useCreateProject, useGenerateInvoice, useProjectTemplates, useUpdateProject } from "@/hooks/queries";
import { useSettings } from "@/context/SettingsContext";
import { formatCurrency, todayISO } from "@/utils/format";
import type { Customer, Project } from "@/types";

interface ProjectForm {
  customerId: string;
  templateId: string;
  description: string;
  discount: number;
  billingDay: number;
  startDate: string;
  dueDate: string;
  taxRate: number;
}

export function ProjectFormModal({
  open,
  onClose,
  project,
  customers,
  defaultTemplateId,
  onAssigned,
}: {
  open: boolean;
  onClose: () => void;
  project?: Project;
  customers: Customer[];
  defaultTemplateId?: number;
  onAssigned?: () => void;
}) {
  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject();
  const generateInvoiceMutation = useGenerateInvoice();
  const { currency } = useSettings();
  const { data: templates = [] } = useProjectTemplates();
  const isEdit = !!project;

  const activeTemplates = useMemo(
    () => templates.filter((t) => String(t.status).toLowerCase() === "active"),
    [templates]
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProjectForm>();

  const templateId = watch("templateId");
  const selected = useMemo(
    () => templates.find((t) => String(t.templateId) === String(templateId)),
    [templates, templateId]
  );
  const isRental = String(selected?.projectType ?? "").toLowerCase() === "rental";
  const isOneTime = String(selected?.projectType ?? "").toLowerCase() === "one time";
  const templateSelected = Boolean(templateId) || isEdit;

  const taxRate = Number(watch("taxRate") ?? 0);
  const discount = Math.max(0, Number(watch("discount") ?? 0));
  const dueDate = watch("dueDate");
  const listPrice = isRental
    ? Number(selected?.monthlyAmount ?? 0)
    : Number(selected?.projectPrice ?? 0);
  const netPrice = round2(Math.max(0, listPrice - discount));
  const invoiceSubtotal = listPrice;
  const invoiceTax = round2(netPrice * (taxRate / 100));
  const invoiceTotal = round2(netPrice + invoiceTax);

  useEffect(() => {
    if (!open) return;
    reset(
      project
        ? {
            customerId: String(project.customerId),
            templateId: String(project.templateId ?? ""),
            description: project.description ?? "",
            discount: Number(project.discount ?? 0),
            billingDay: 1,
            startDate: project.startDate ?? "",
            dueDate: todayISO(),
            taxRate: 0,
          }
        : {
            customerId: "",
            templateId: defaultTemplateId ? String(defaultTemplateId) : "",
            description: "",
            discount: 0,
            billingDay: 1,
            startDate: new Date().toISOString().slice(0, 10),
            dueDate: todayISO(),
            taxRate: 0,
          }
    );
  }, [open, project, reset, defaultTemplateId]);

  useEffect(() => {
    if (!selected || isEdit) return;
    setValue("billingDay", selected.billingDay || 1);
  }, [selected, isEdit, setValue]);

  const loading =
    createMutation.isPending || updateMutation.isPending || generateInvoiceMutation.isPending;

  const onSubmit = async (data: ProjectForm) => {
    if (isEdit && project) {
      updateMutation.mutate(
        {
          id: project.projectId,
          patch: {
            description: data.description,
            startDate: data.startDate || undefined,
          },
        },
        { onSuccess: () => onClose() }
      );
      return;
    }

    const tpl = templates.find((t) => String(t.templateId) === data.templateId);
    if (!tpl) return;
    const rental = String(tpl.projectType).toLowerCase() === "rental";

    try {
      const created = await createMutation.mutateAsync({
        customerId: Number(data.customerId),
        templateId: Number(data.templateId),
        description: data.description,
        discount: Number(data.discount || 0),
        startDate: data.startDate || undefined,
        billingDay: rental ? Number(data.billingDay || tpl.billingDay || 1) : undefined,
      });
      if (!rental && created.projectId && netPrice > 0) {
        await generateInvoiceMutation.mutateAsync({
          customerId: Number(data.customerId),
          projectId: created.projectId,
          invoiceDate: todayISO(),
          dueDate: data.dueDate || todayISO(),
          discount: Number(data.discount || 0),
          tax: round2(netPrice * (Number(data.taxRate || 0) / 100)),
          items: [
            {
              description: data.description?.trim() || tpl.templateName,
              quantity: 1,
              unitPrice: Number(tpl.projectPrice),
            },
          ],
          status: "Issued",
        });
      }
      onClose();
      onAssigned?.();
    } catch {
      /* toast handled by mutation */
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? "Edit customer project" : "Assign customer project"}
      subtitle={
        isEdit
          ? project?.projectName
          : activeTemplates.length === 0
            ? "Register a project first, then assign it to a customer."
            : "Pick a customer and a registered project. Optional discount comes off the list price."
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={loading}
            disabled={!isEdit && (!templateSelected || activeTemplates.length === 0)}
            onClick={handleSubmit(onSubmit)}
          >
            {isEdit ? "Save changes" : isOneTime ? "Assign & invoice" : "Assign to customer"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Customer"
            required
            disabled={isEdit}
            error={errors.customerId?.message}
            options={[
              { value: "", label: "Select a customer…" },
              ...customers.map((c) => ({ value: String(c.customerId), label: c.customerName })),
            ]}
            {...register("customerId", { required: "Customer is required" })}
          />
          {isEdit ? (
            <Input label="Registered project" value={project?.projectName ?? ""} readOnly />
          ) : (
            <Select
              label="Registered project"
              required
              error={errors.templateId?.message}
              options={[
                { value: "", label: activeTemplates.length ? "Select a project…" : "No projects registered" },
                ...activeTemplates.map((t) => ({
                  value: String(t.templateId),
                  label: `${t.templateName} · ${t.projectType}`,
                })),
              ]}
              {...register("templateId", { required: "Registered project is required" })}
            />
          )}
        </div>

        {selected && !isEdit && (
          <div className="space-y-3">
            <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/50">
              <p className="font-semibold text-slate-800 dark:text-slate-100">
                {selected.templateName}
                <span className="ml-2 text-xs font-medium text-slate-400">{selected.projectType}</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {isRental
                  ? `List rent ${formatCurrency(selected.monthlyAmount, currency)}${
                      Number(selected.setupFee) > 0
                        ? ` · setup ${formatCurrency(selected.setupFee, currency)}`
                        : ""
                    }`
                  : `List price ${formatCurrency(selected.projectPrice, currency)}`}
              </p>
            </div>
            <Input
              label="Discount"
              type="number"
              step="0.01"
              min={0}
              hint={`Charged: ${formatCurrency(netPrice, currency)} (list ${formatCurrency(listPrice, currency)} − discount)`}
              error={errors.discount?.message}
              {...register("discount", {
                min: { value: 0, message: "Discount cannot be negative" },
                validate: (value) =>
                  Number(value || 0) <= listPrice || "Discount cannot be greater than the project price",
              })}
            />
          </div>
        )}

        <Textarea label="Notes" placeholder="Optional note for this customer" {...register("description")} />

        {templateSelected && isRental && !isEdit && (
          <Input
            label="Billing day"
            type="number"
            min={1}
            max={28}
            required
            error={errors.billingDay?.message}
            {...register("billingDay", {
              required: "Billing day is required",
              min: { value: 1, message: "Min 1" },
              max: { value: 28, message: "Max 28" },
            })}
          />
        )}

        {templateSelected && isOneTime && !isEdit && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Tax %"
                type="number"
                step="0.1"
                min={0}
                {...register("taxRate", { min: { value: 0, message: "Invalid tax" } })}
              />
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Invoice due date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  className="h-10 w-full rounded-xl border-0 bg-white px-3.5 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-900 dark:text-white dark:ring-slate-700"
                  {...register("dueDate", { required: "Due date is required" })}
                />
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">List price</span>
                <span className="font-mono font-semibold">{formatCurrency(invoiceSubtotal, currency)}</span>
              </div>
              {discount > 0 && (
                <div className="mt-1.5 flex justify-between text-sm">
                  <span className="text-slate-500">Discount</span>
                  <span className="font-mono font-semibold text-rose-600">
                    −{formatCurrency(discount, currency)}
                  </span>
                </div>
              )}
              <div className="mt-1.5 flex justify-between text-sm">
                <span className="text-slate-500">Tax ({taxRate}%)</span>
                <span className="font-mono font-semibold">{formatCurrency(invoiceTax, currency)}</span>
              </div>
              <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 dark:border-slate-700">
                <span className="text-sm font-bold">Invoice total</span>
                <span className="font-mono text-base font-bold text-brand-600">
                  {formatCurrency(invoiceTotal, currency)}
                </span>
              </div>
              {dueDate && <p className="mt-2 text-xs text-slate-400">Invoice due {dueDate}</p>}
            </div>
          </>
        )}

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Start date <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            type="date"
            className="h-10 w-full rounded-xl border-0 bg-white px-3.5 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-900 dark:text-white dark:ring-slate-700"
            {...register("startDate")}
          />
        </div>

        {templateSelected && isRental && !isEdit && (
          <p className="rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-800 dark:bg-brand-500/10 dark:text-brand-200">
            Setup fee (if any) becomes an invoice right away. Monthly rent is charged from Invoices → Charge rent.
          </p>
        )}
      </form>
    </Modal>
  );
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
