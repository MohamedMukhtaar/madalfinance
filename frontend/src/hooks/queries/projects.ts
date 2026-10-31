import {
  useMutation,
  useQuery,
  useQueryClient,
  financeService,
  qk,
  toastErr,
  toast,
  getErrorMessage,
  splitQuery,
  patchRentalStatus,
  type QueryOpts,
  type ListParams,
} from "./shared";

/* ------------------------------ PROJECTS ------------------------------ */
export function useProjects(params?: QueryOpts) {
  const { enabled, params: query } = splitQuery(params);
  return useQuery({
    queryKey: qk.projects(query),
    queryFn: () => financeService.projects(Object.keys(query).length ? query : { perPage: 100 }),
    enabled,
  });
}

export function useProjectTypes() {
  return useQuery({
    queryKey: ["project-types"],
    queryFn: () => financeService.projectTypes(),
  });
}

export function useProjectTemplates(params?: QueryOpts) {
  const { enabled, params: query } = splitQuery(params);
  return useQuery({
    queryKey: [...qk.projectTemplates, query],
    queryFn: () => financeService.projectTemplates(Object.keys(query).length ? query : undefined),
    enabled,
  });
}

export function useCreateProjectTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => financeService.createProjectTemplate(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.projectTemplates });
      toast.success("Project registered");
    },
    onError: (err) => toastErr(err, "Failed to register project"),
  });
}

export function useUpdateProjectTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Record<string, unknown> }) =>
      financeService.updateProjectTemplate(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.projectTemplates });
      toast.success("Registered project updated");
    },
    onError: (err) => toastErr(err, "Failed to update registered project"),
  });
}

export function useDeleteProjectTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => financeService.deleteProjectTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.projectTemplates });
      toast.success("Registered project deleted");
    },
    onError: (err) => toastErr(err, "Failed to delete registered project"),
  });
}

export function useUploadProjectTemplateLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file, onProgress }: { id: number; file: File; onProgress?: (p: number) => void }) =>
      financeService.uploadProjectTemplateLogo(id, file, onProgress),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.projectTemplates });
      toast.success("Logo uploaded");
    },
    onError: (err) => toastErr(err, "Failed to upload logo"),
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => financeService.createProject(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: qk.projectTemplates });
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Customer project created");
    },
    onError: (err) => toastErr(err, "Failed to create project"),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Record<string, unknown> }) =>
      financeService.updateProject(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Project updated");
    },
    onError: (err) => toastErr(err, "Failed to update project"),
  });
}

export function useUploadProjectLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file, onProgress }: { id: number; file: File; onProgress?: (p: number) => void }) =>
      financeService.uploadProjectLogo(id, file, onProgress),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project logo uploaded");
    },
    onError: (err) => toastErr(err, "Failed to upload logo"),
  });
}

export function useUploadCompanyLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, onProgress }: { file: File; onProgress?: (p: number) => void }) =>
      financeService.uploadCompanyLogo(file, onProgress),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.settings });
      toast.success("Company logo uploaded");
    },
    onError: (err) => toastErr(err, "Failed to upload logo"),
  });
}

export function useRemoveCompanyLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => financeService.removeCompanyLogo(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.settings });
      toast.success("Company logo removed");
    },
    onError: (err) => toastErr(err, "Failed to remove logo"),
  });
}

export function useUploadProjectAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file, onProgress }: { id: number; file: File; onProgress?: (p: number) => void }) =>
      financeService.uploadProjectAttachment(id, file, onProgress),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Attachment uploaded — project marked completed");
    },
    onError: (err) => toastErr(err, "Failed to upload attachment"),
  });
}

