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

/* ------------------------------ EMPLOYEES / SALARY ------------------------------ */
export function useEmployees(params?: QueryOpts) {
  const { enabled, params: query } = splitQuery(params);
  return useQuery({
    queryKey: qk.employees(query),
    queryFn: () => financeService.employees({ perPage: 100, sort: "first_name:asc", ...query }),
    enabled,
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof financeService.createEmployee>[0]) => financeService.createEmployee(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee created");
    },
    onError: (err) => toastErr(err, "Failed to create employee"),
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Parameters<typeof financeService.updateEmployee>[1] }) =>
      financeService.updateEmployee(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee updated");
    },
    onError: (err) => toastErr(err, "Failed to update employee"),
  });
}

export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => financeService.deleteEmployee(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee removed");
    },
    onError: (err) => toastErr(err, "Failed to remove employee"),
  });
}

export function useEmployeeOrg(kind: import("@/types").EmployeeOrgKind, enabled = true) {
  return useQuery({
    queryKey: qk.employeeOrg(kind),
    queryFn: () => financeService.employeeOrg(kind),
    enabled,
  });
}

export function useCreateEmployeeOrg(kind: import("@/types").EmployeeOrgKind) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof financeService.createEmployeeOrg>[1]) =>
      financeService.createEmployeeOrg(kind, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-org"] });
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: qk.members });
      toast.success("Created");
    },
    onError: (err) => toastErr(err, "Failed to create"),
  });
}

export function useUpdateEmployeeOrg(kind: import("@/types").EmployeeOrgKind) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Parameters<typeof financeService.updateEmployeeOrg>[2] }) =>
      financeService.updateEmployeeOrg(kind, id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-org"] });
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: qk.members });
      toast.success("Updated");
    },
    onError: (err) => toastErr(err, "Failed to update"),
  });
}

export function useDeleteEmployeeOrg(kind: import("@/types").EmployeeOrgKind) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => financeService.deleteEmployeeOrg(kind, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-org"] });
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: qk.members });
      toast.success("Deleted");
    },
    onError: (err) => toastErr(err, "Failed to delete"),
  });
}

export function useSalaryCharges(params?: QueryOpts) {
  const { enabled, params: query } = splitQuery(params);
  return useQuery({
    queryKey: qk.salaryCharges(query),
    queryFn: () => financeService.salaryCharges({ perPage: 100, ...query }),
    enabled,
  });
}

export function useCreateSalaryCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof financeService.createSalaryCharge>[0]) =>
      financeService.createSalaryCharge(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salary-charges"] });
      toast.success("Salary charge created");
    },
    onError: (err) => toastErr(err, "Failed to create salary charge"),
  });
}

export function useGenerateSalaryCharges() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { year: number; month: number }) => financeService.generateSalaryCharges(data),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["salary-charges"] });
      toast.success(
        result.created
          ? `Generated ${result.created} salary charge${result.created === 1 ? "" : "s"}`
          : "No new charges — all active employees already billed"
      );
    },
    onError: (err) => toastErr(err, "Failed to generate salary charges"),
  });
}

export function useDeleteSalaryCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => financeService.deleteSalaryCharge(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salary-charges"] });
      toast.success("Salary charge deleted");
    },
    onError: (err) => toastErr(err, "Failed to delete salary charge"),
  });
}

export function usePaySalaryCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Parameters<typeof financeService.paySalaryCharge>[1];
    }) => financeService.paySalaryCharge(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salary-charges"] });
      qc.invalidateQueries({ queryKey: ["salary-payments"] });
      qc.invalidateQueries({ queryKey: qk.accounts });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Salary payment recorded");
    },
    onError: (err) => toastErr(err, "Failed to record salary payment"),
  });
}

export function useSalaryPayments(params?: QueryOpts) {
  const { enabled, params: query } = splitQuery(params);
  return useQuery({
    queryKey: qk.salaryPayments(query),
    queryFn: () => financeService.salaryPayments({ perPage: 100, sort: "payment_date:desc", ...query }),
    enabled,
  });
}

