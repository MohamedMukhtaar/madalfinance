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

/* ------------------------------ RENTALS ------------------------------ */
export function useRentals(params?: ListParams) {
  return useQuery({
    queryKey: qk.rentals(params),
    queryFn: () => financeService.rentals(params ?? { perPage: 100 }),
  });
}

export function useCreateRental() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      projectId: number;
      monthlyAmount: number;
      setupFee?: number;
      billingDay: number;
      nextBillingDate?: string;
    }) => financeService.createRental(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rentals"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Rental billing created");
    },
    onError: (err) => toastErr(err, "Failed to create rental"),
  });
}

export function useContracts(params?: ListParams) {
  return useQuery({
    queryKey: ["contracts", params],
    queryFn: () => financeService.contracts(params ?? { perPage: 100 }),
  });
}

export function useSetRentalStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      financeService.setRentalStatus(id, status),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["rentals"] });
      const previous = qc.getQueriesData({ queryKey: ["rentals"] });
      qc.setQueriesData({ queryKey: ["rentals"] }, (old) => patchRentalStatus(old, id, status));
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      ctx?.previous?.forEach(([key, data]) => qc.setQueryData(key, data));
      toastErr(err, "Failed to update rental");
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.status === "Paused" ? "Rental paused" : "Rental resumed");
    },
  });
}

/** @deprecated use useSetRentalStatus */
export function usePauseRental() {
  const mutation = useSetRentalStatus();
  return {
    ...mutation,
    mutate: (id: number) => mutation.mutate({ id, status: "Paused" }),
    mutateAsync: (id: number) => mutation.mutateAsync({ id, status: "Paused" }),
  };
}

/** @deprecated use useSetRentalStatus */
export function useResumeRental() {
  const mutation = useSetRentalStatus();
  return {
    ...mutation,
    mutate: (id: number) => mutation.mutate({ id, status: "Active" }),
    mutateAsync: (id: number) => mutation.mutateAsync({ id, status: "Active" }),
  };
}

export function useGenerateRentalInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      force = true,
      month,
      year,
    }: {
      id: number;
      force?: boolean;
      month: number;
      year: number;
    }) => financeService.generateRentalInvoice(id, { force, month, year }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["rentals"] });
      toast.success("Rental invoice generated");
    },
    onError: (err) => toastErr(err, "Failed to generate rental invoice"),
  });
}

export function useChargeAllRentals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (opts: { force?: boolean; month: number; year: number }) =>
      financeService.chargeAllRentals(opts),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["rentals"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      const errCount = result.errors?.length ?? 0;
      if (result.generated > 0 && result.skipped > 0) {
        toast.success(
          `Charged ${result.generated} rental${result.generated === 1 ? "" : "s"}. Same month, no need to charge twice for the rest.`
        );
      } else if (result.generated > 0) {
        toast.success(`Charged ${result.generated} rental${result.generated === 1 ? "" : "s"}`);
      } else if (errCount) {
        toast.error(result.errors[0]?.message || "No invoices generated");
      } else if (result.skipped > 0) {
        toast.success("Same month, no need to charge twice");
      } else {
        toast.success("No due rentals to charge");
      }
    },
    onError: (err) => toastErr(err, "Failed to charge rentals"),
  });
}

export function useCreateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => financeService.createContract(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Contract created");
    },
    onError: (err) => toastErr(err, "Failed to create contract"),
  });
}

export function useUploadContractSigned() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      file,
      onProgress,
    }: {
      id: number;
      file: File;
      onProgress?: (n: number) => void;
    }) => financeService.uploadContractSigned(id, file, onProgress),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Attachment uploaded");
    },
    onError: (err) => toastErr(err, "Failed to upload attachment"),
  });
}

