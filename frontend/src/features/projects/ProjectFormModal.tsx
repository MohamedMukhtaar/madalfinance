import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Textarea } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { FileUpload, type UploadedFile } from "@/components/ui";
import { useCreateProject, useGenerateInvoice, useProjectTypes, useUpdateProject, useUploadProjectLogo } from "@/hooks/queries";
import { useSettings } from "@/context/SettingsContext";
import { financeService } from "@/services/finance";
import { formatCurrency, todayISO } from "@/utils/format";
import type { Customer, Project } from "@/types";

interface ProjectForm {
  customerId: string;
  projectTypeId: string;
  projectName: string;
  description: string;
  projectPrice: number;
  monthlyAmount: number;
  setupFee: number;
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
  defaultProjectType,
}: {
  open: boolean;
  onClose: () => void;
  project?: Project;
  customers: Customer[];
  defaultProjectType?: "One Time" | "Rental";
}) {
  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject();
  const generateInvoiceMutation = useGenerateInvoice();
  const uploadLogoMutation = useUploadProjectLogo();
  const { currency } = useSettings();
  const { data: projectTypes = [] } = useProjectTypes();
  const isEdit = !!project;
  const [logoFiles, setLogoFiles] = useState<UploadedFile[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ProjectForm>();

  const projectTypeId = watch("projectTypeId");
  const selectedType = useMemo(
    () => projectTypes.find((t) => String(t.id) === String(projectTypeId)),
    [projectTypes, projectTypeId]
  );
  const isRental = String(selectedType?.name ?? "").toLowerCase() === "rental";
  const isOneTime = String(selectedType?.name ?? "").toLowerCase() === "one time";
  const isOneTimeCreate = !isEdit && isOneTime;
  const typeSelected = Boolean(projectTypeId);
  const showBillingFields = typeSelected || isEdit;

  const projectPrice = Number(watch("projectPrice") ?? 0);
  const taxRate = Number(watch("taxRate") ?? 0);
  const dueDate = watch("dueDate");
  const invoiceSubtotal = round2(projectPrice);
  const invoiceTax = round2(invoiceSubtotal * (taxRate / 100));
  const invoiceTotal = round2(invoiceSubtotal + invoiceTax);

  const defaultTypeId = useMemo(() => {
    if (!defaultProjectType) return "";
    return String(projectTypes.find((t) => t.name === defaultProjectType)?.id ?? "");
  }, [defaultProjectType, projectTypes]);

  useEffect(() => {
    if (open) {
      setLogoFiles([]);
      reset(
        project
          ? {
              customerId: String(project.customerId),
              projectTypeId: String(project.projectTypeId ?? ""),
              projectName: project.projectName,
              description: project.description ?? "",
              projectPrice: project.projectPrice,
              monthlyAmount: project.projectPrice,
              setupFee: 0,
              billingDay: 1,
              startDate: project.startDate ?? "",
              dueDate: todayISO(),
              taxRate: 0,
            }
          : {
              customerId: "",
              projectTypeId: defaultTypeId,
              projectName: "",
              description: "",
              projectPrice: 0,
              monthlyAmount: 0,
              setupFee: 0,
              billingDay: 1,
              startDate: new Date().toISOString().slice(0, 10),
              dueDate: todayISO(),
              taxRate: 0,
            }
      );
    }
  }, [open, project, reset, defaultTypeId]);

  const loading =
    createMutation.isPending ||
    updateMutation.isPending ||
    uploadLogoMutation.isPending ||
    generateInvoiceMutation.isPending;

  const onSubmit = async (data: ProjectForm) => {
    const typeName = projectTypes.find((t) => String(t.id) === data.projectTypeId)?.name;
    if (!typeName) return;

    const rental = String(typeName).toLowerCase() === "rental";

    if (isEdit && project) {
      updateMutation.mutate(
        {
          id: project.projectId,
          patch: {
            projectName: data.projectName,
            description: data.description,
            projectPrice: Number(data.projectPrice),
            startDate: data.startDate || undefined,
          },
        },
        {
          onSuccess: async () => {
            const logoFile = logoFiles[0]?.file;
            if (rental && logoFile) {
              await uploadLogoMutation.mutateAsync({ id: project.projectId, file: logoFile });
            }
            onClose();
          },
        }
      );
      return;
    }

    const payload: Record<string, unknown> = {
      customerId: Number(data.customerId),
      projectType: typeName,
      projectName: data.projectName,
      description: data.description,
      startDate: data.startDate || undefined,
    };

    if (rental) {
      payload.monthlyAmount = Number(data.monthlyAmount);
      payload.setupFee = Number(data.setupFee || 0);
      payload.billingDay = Number(data.billingDay || 1);
    } else {
      payload.projectPrice = Number(data.projectPrice);
    }

    try {
      const created = await createMutation.mutateAsync(payload);
      const logoFile = logoFiles[0]?.file;
      if (rental && logoFile && created.projectId) {
        await uploadLogoMutation.mutateAsync({ id: created.projectId, file: logoFile });
      } else if (!rental && created.projectId) {
        const price = Number(data.projectPrice);
        if (price > 0) {
          await generateInvoiceMutation.mutateAsync({
            customerId: Number(data.customerId),
            projectId: created.projectId,
            invoiceDate: todayISO(),
            dueDate: data.dueDate || todayISO(),
            discount: 0,
            tax: round2(price * (Number(data.taxRate || 0) / 100)),
            items: [
              {
                description: data.description?.trim() || data.projectName,
                quantity: 1,
                unitPrice: price,
              },
            ],
            status: "Issued",
          });
        }
      }
      onClose();
    } catch {
      /* toast handled by mutation */
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? "Edit Project" : "Add Customer Project"}
      subtitle={
        isEdit
          ? project?.projectName
          : !typeSelected
            ? "Choose a project type to show billing fields"
            : isRental
              ? "Rental project — monthly rent, optional setup fee and logo"
              : "One-time project — project and invoice are created together"
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            loading={loading}
            disabled={!isEdit && !typeSelected}
            onClick={handleSubmit(onSubmit)}
          >
            {isEdit ? "Save changes" : !typeSelected ? "Create project" : isRental ? "Create project" : "Create project & invoice"}
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
            label="Project Type"
            required
            disabled={isEdit}
            options={[{ value: "", label: "Select a project type…" }, ...projectTypes.map((type) => ({ value: String(type.id), label: type.name }))]}
            {...register("projectTypeId", { required: "Project type is required" })}
          />
        </div>

        <Input
          label="Project Name"
          required
          placeholder="e.g. Corporate Website"
          error={errors.projectName?.message}
          {...register("projectName", { required: "Project name is required" })}
        />
        <Textarea label="Description" placeholder="Brief description of the project" {...register("description")} />

        {showBillingFields && (
          <>
            {isRental && !isEdit ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Input
                  label="Monthly rent"
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  error={errors.monthlyAmount?.message}
                  {...register("monthlyAmount", {
                    required: "Monthly rent is required",
                    min: { value: 0.01, message: "Must be greater than 0" },
                  })}
                />
                <Input
                  label="Setup fee"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  error={errors.setupFee?.message}
                  {...register("setupFee", { min: { value: 0, message: "Invalid amount" } })}
                />
                <Input
                  label="Billing day"
                  type="number"
                  min={1}
                  max={28}
                  required
                  placeholder="1"
                  error={errors.billingDay?.message}
                  {...register("billingDay", {
                    required: "Billing day is required",
                    min: { value: 1, message: "Min 1" },
                    max: { value: 28, message: "Max 28" },
                  })}
                />
              </div>
            ) : showBillingFields && !isRental ? (
              <>
                <Input
                  label="Project price"
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  error={errors.projectPrice?.message}
                  {...register("projectPrice", {
                    required: "Project price is required",
                    min: { value: 0.01, message: "Must be greater than 0" },
                  })}
                />
                {isOneTimeCreate && (
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
                          Due date <span className="text-rose-500">*</span>
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
                        <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">
                          {formatCurrency(invoiceSubtotal, currency)}
                        </span>
                      </div>
                      <div className="mt-1.5 flex justify-between text-sm">
                        <span className="text-slate-500 dark:text-slate-400">Tax ({taxRate}%)</span>
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">
                          {formatCurrency(invoiceTax, currency)}
                        </span>
                      </div>
                      <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 dark:border-slate-700">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">Invoice total</span>
                        <span className="font-mono text-base font-bold text-brand-600 dark:text-brand-400">
                          {formatCurrency(invoiceTotal, currency)}
                        </span>
                      </div>
                      {dueDate && (
                        <p className="mt-2 text-xs text-slate-400">Invoice due {dueDate}</p>
                      )}
                    </div>
                  </>
                )}
              </>
            ) : showBillingFields && isRental && isEdit ? (
              <Input
                label="Project price"
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                error={errors.projectPrice?.message}
                {...register("projectPrice", {
                  required: "Project price is required",
                  min: { value: 0, message: "Invalid price" },
                })}
              />
            ) : null}

            {showBillingFields && isRental && (
              <FileUpload
                label="Project logo (shown on card)"
                accept="image/png,image/jpeg,image/webp"
                value={logoFiles}
                onChange={setLogoFiles}
                onUpload={
                  isEdit && project
                    ? async (file, onProgress) => {
                        const updated = await uploadLogoMutation.mutateAsync({
                          id: project.projectId,
                          file,
                          onProgress,
                        });
                        return {
                          name: updated.logoFileName || file.name,
                          url: updated.logoPath
                            ? financeService.projectLogoUrl(updated.projectId, updated.logoPath)
                            : URL.createObjectURL(file),
                        };
                      }
                    : undefined
                }
              />
            )}

            {showBillingFields && (
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
            )}

            {showBillingFields && isRental && !isEdit && (
              <p className="rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-800 dark:bg-brand-500/10 dark:text-brand-200">
                Setup fee (if any) becomes an invoice right away. Monthly rent is charged from Invoices → Charge rent.
              </p>
            )}
          </>
        )}
      </form>
    </Modal>
  );
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
