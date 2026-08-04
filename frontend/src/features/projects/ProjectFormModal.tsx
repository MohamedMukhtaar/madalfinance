import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Textarea } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { useCreateProject, useProjectTypes, useUpdateProject } from "@/hooks/queries";
import type { Customer, Project } from "@/types";

interface ProjectForm {
  customerId: string;
  projectTypeId: string;
  projectName: string;
  description: string;
  projectPrice: number;
  startDate: string;
  expectedFinish: string;
  status: Project["status"];
}

export function ProjectFormModal({
  open,
  onClose,
  project,
  customers,
}: {
  open: boolean;
  onClose: () => void;
  project?: Project;
  customers: Customer[];
}) {
  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject();
  const { data: projectTypes = [] } = useProjectTypes();
  const isEdit = !!project;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProjectForm>();

  useEffect(() => {
    if (open) {
      reset(
        project
          ? {
              customerId: String(project.customerId),
              projectTypeId: String(project.projectTypeId ?? ""),
              projectName: project.projectName,
              description: project.description ?? "",
              projectPrice: project.projectPrice,
              startDate: project.startDate,
              expectedFinish: project.expectedFinish ?? "",
              status: project.status,
            }
          : {
              customerId: "",
              projectTypeId: "",
              projectName: "",
              description: "",
              projectPrice: 0,
              startDate: new Date().toISOString().slice(0, 10),
              expectedFinish: "",
              status: "Pending",
            }
      );
    }
  }, [open, project, reset]);

  const loading = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (data: ProjectForm) => {
    const payload = {
      customerId: Number(data.customerId),
      projectTypeId: Number(data.projectTypeId),
      projectName: data.projectName,
      description: data.description,
      projectPrice: Number(data.projectPrice),
      startDate: data.startDate,
      expectedFinish: data.expectedFinish,
      status: data.status,
    };
    if (isEdit && project) {
      updateMutation.mutate({ id: project.projectId, patch: payload }, { onSuccess: () => onClose() });
    } else {
      createMutation.mutate(payload, { onSuccess: () => onClose() });
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? "Edit Project" : "Add New Project"}
      subtitle={isEdit ? project?.projectName : "Create a one-time or rental project"}
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
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Input label="Price" type="number" step="0.01" required placeholder="0.00" error={errors.projectPrice?.message} {...register("projectPrice", { required: "Price is required", min: { value: 0, message: "Invalid price" } })} />
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Start Date</label>
            <input type="date" className="h-10 w-full rounded-xl border-0 bg-white px-3.5 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-900 dark:text-white dark:ring-slate-700" {...register("startDate")} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Expected Finish</label>
            <input type="date" className="h-10 w-full rounded-xl border-0 bg-white px-3.5 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-900 dark:text-white dark:ring-slate-700" {...register("expectedFinish")} />
          </div>
          <Select
            label="Status"
            options={["Pending", "In Progress", "Completed", "Cancelled"].map((s) => ({ value: s, label: s }))}
            {...register("status")}
          />
        </div>
      </form>
    </Modal>
  );
}
