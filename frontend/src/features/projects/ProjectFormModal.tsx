import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Textarea } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { FileUpload, type UploadedFile } from "@/components/ui";
import { useCreateProject, useProjectTypes, useUpdateProject, useUploadProjectLogo } from "@/hooks/queries";
import { financeService } from "@/services/finance";
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
  const uploadLogoMutation = useUploadProjectLogo();
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
            }
      );
    }
  }, [open, project, reset, defaultTypeId]);

  const loading = createMutation.isPending || updateMutation.isPending || uploadLogoMutation.isPending;

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
          : isRental
            ? "Rental project — monthly rent, optional setup fee and logo"
            : "One-time project — set the total price, then create an invoice from Invoices"
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={loading} onClick={handleSubmit(onSubmit)}>
            {isEdit ? "Save changes" : "Create project"}
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
        ) : (
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
        )}

        {isRental && (
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

        {isRental && !isEdit && (
          <p className="rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-800 dark:bg-brand-500/10 dark:text-brand-200">
            Setup fee (if any) becomes an invoice right away. Monthly charges are generated from Rental Billing.
          </p>
        )}
      </form>
    </Modal>
  );
}
