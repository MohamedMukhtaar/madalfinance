import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Textarea } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { FileUpload, type UploadedFile } from "@/components/ui";
import {
  useCreateProjectTemplate,
  useProjectTypes,
  useUpdateProjectTemplate,
  useUploadProjectTemplateLogo,
} from "@/hooks/queries";
import { useSettings } from "@/context/SettingsContext";
import { financeService } from "@/services/finance";
import type { ProjectTemplate } from "@/types";

interface TemplateForm {
  templateName: string;
  projectTypeId: string;
  description: string;
  projectPrice: number;
  monthlyAmount: number;
  setupFee: number;
  billingDay: number;
}

export function ProjectTemplateFormModal({
  open,
  onClose,
  template,
  defaultProjectType,
}: {
  open: boolean;
  onClose: () => void;
  template?: ProjectTemplate;
  defaultProjectType?: "One Time" | "Rental";
}) {
  const createMutation = useCreateProjectTemplate();
  const updateMutation = useUpdateProjectTemplate();
  const uploadLogoMutation = useUploadProjectTemplateLogo();
  const { data: projectTypes = [] } = useProjectTypes();
  const { currency } = useSettings();
  const isEdit = !!template;
  const [logoFiles, setLogoFiles] = useState<UploadedFile[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<TemplateForm>();

  const projectTypeId = watch("projectTypeId");
  const selectedType = useMemo(
    () => projectTypes.find((t) => String(t.id) === String(projectTypeId)),
    [projectTypes, projectTypeId]
  );
  const isRental = String(selectedType?.name ?? "").toLowerCase() === "rental";
  const typeSelected = Boolean(projectTypeId);

  const defaultTypeId = useMemo(() => {
    if (template) return String(template.projectTypeId ?? "");
    if (!defaultProjectType) return "";
    return String(projectTypes.find((t) => t.name === defaultProjectType)?.id ?? "");
  }, [template, defaultProjectType, projectTypes]);

  useEffect(() => {
    if (!open) return;
    setLogoFiles([]);
    reset(
      template
        ? {
            templateName: template.templateName,
            projectTypeId: String(template.projectTypeId ?? ""),
            description: template.description ?? "",
            projectPrice: template.projectPrice,
            monthlyAmount: template.monthlyAmount,
            setupFee: template.setupFee,
            billingDay: template.billingDay || 1,
          }
        : {
            templateName: "",
            projectTypeId: defaultTypeId,
            description: "",
            projectPrice: 0,
            monthlyAmount: 0,
            setupFee: 0,
            billingDay: 1,
          }
    );
  }, [open, template, reset, defaultTypeId]);

  const loading = createMutation.isPending || updateMutation.isPending || uploadLogoMutation.isPending;

  const onSubmit = async (data: TemplateForm) => {
    const typeName = projectTypes.find((t) => String(t.id) === data.projectTypeId)?.name;
    if (!typeName) return;
    const rental = String(typeName).toLowerCase() === "rental";

    const payload: Record<string, unknown> = {
      templateName: data.templateName,
      projectType: typeName,
      description: data.description,
    };
    if (rental) {
      payload.monthlyAmount = Number(data.monthlyAmount);
      payload.setupFee = Number(data.setupFee || 0);
      payload.billingDay = Number(data.billingDay || 1);
    } else {
      payload.projectPrice = Number(data.projectPrice);
    }

    try {
      if (isEdit && template) {
        await updateMutation.mutateAsync({ id: template.templateId, patch: payload });
        const logoFile = logoFiles[0]?.file;
        if (rental && logoFile) {
          await uploadLogoMutation.mutateAsync({ id: template.templateId, file: logoFile });
        }
      } else {
        const created = await createMutation.mutateAsync(payload);
        const logoFile = logoFiles[0]?.file;
        if (rental && logoFile && created.templateId) {
          await uploadLogoMutation.mutateAsync({ id: created.templateId, file: logoFile });
        }
      }
      onClose();
    } catch {
      /* toast from mutation */
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? "Edit registered project" : "Register project"}
      subtitle={
        isEdit
          ? template?.templateName
          : "Name the offering and set its type and price. Customers are assigned later."
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={loading} disabled={!isEdit && !typeSelected} onClick={handleSubmit(onSubmit)}>
            {isEdit ? "Save changes" : "Register project"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Project name"
            required
            placeholder="e.g. KeydMaal"
            error={errors.templateName?.message}
            {...register("templateName", { required: "Name is required" })}
          />
          <Select
            label="Type"
            required
            disabled={isEdit}
            options={[
              { value: "", label: "Select type…" },
              ...projectTypes.map((type) => ({ value: String(type.id), label: type.name })),
            ]}
            {...register("projectTypeId", { required: "Type is required" })}
          />
        </div>
        <Textarea label="Description" placeholder="What this project is" {...register("description")} />

        {typeSelected && isRental && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              label={`Monthly rent (${currency})`}
              type="number"
              step="0.01"
              required
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
              {...register("setupFee", { min: { value: 0, message: "Invalid amount" } })}
            />
            <Input
              label="Default billing day"
              type="number"
              min={1}
              max={28}
              required
              {...register("billingDay", {
                required: "Billing day is required",
                min: { value: 1, message: "Min 1" },
                max: { value: 28, message: "Max 28" },
              })}
            />
          </div>
        )}

        {typeSelected && !isRental && (
          <Input
            label={`Project price (${currency})`}
            type="number"
            step="0.01"
            required
            error={errors.projectPrice?.message}
            {...register("projectPrice", {
              required: "Price is required",
              min: { value: 0.01, message: "Must be greater than 0" },
            })}
          />
        )}

        {typeSelected && isRental && (
          <FileUpload
            label="Logo (shown on rental cards)"
            accept="image/png,image/jpeg,image/webp"
            value={logoFiles}
            onChange={setLogoFiles}
            onUpload={
              isEdit && template
                ? async (file, onProgress) => {
                    const updated = await uploadLogoMutation.mutateAsync({
                      id: template.templateId,
                      file,
                      onProgress,
                    });
                    return {
                      name: updated.logoFileName || file.name,
                      url: updated.logoPath
                        ? financeService.projectLogoUrl(updated.templateId, updated.logoPath)
                        : URL.createObjectURL(file),
                    };
                  }
                : undefined
            }
          />
        )}
      </form>
    </Modal>
  );
}
