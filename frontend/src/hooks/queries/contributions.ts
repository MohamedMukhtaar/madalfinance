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

/* ------------------------------ CONTRIBUTIONS ------------------------------ */
export function useDues(params?: QueryOpts) {
  const { enabled, params: query } = splitQuery(params);
  return useQuery({
    queryKey: qk.dues(query),
    queryFn: () => financeService.dueBatches({ perPage: 100, sort: "batch_id:desc", ...query }),
    enabled,
  });
}

export function useDueBatch(id: number | undefined) {
  return useQuery({
    queryKey: qk.duesDetail(id ?? 0),
    queryFn: () => financeService.dueBatch(id as number),
    enabled: !!id,
  });
}

export function useChargeMembers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      reason: string;
      chargeDate: string;
      defaultAmount: number;
      month: number;
      year: number;
      memberIds?: number[];
    }) => financeService.chargeMembers(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dues"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Member contributions generated");
    },
    onError: (err) => toastErr(err, "Failed to generate contributions"),
  });
}

export function useReceiveDue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      dueId,
      amount,
      accId,
      receipt,
    }: {
      dueId: number;
      amount: number;
      accId?: number;
      receipt?: File | null;
    }) => {
      const due = await financeService.receiveDue(dueId, amount, accId);
      if (receipt) {
        await financeService.uploadContributionAttachment(dueId, receipt);
      }
      return due;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dues"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: qk.accounts });
      toast.success("Contribution received");
    },
    onError: (err) => toastErr(err, "Failed to receive contribution"),
  });
}

export function useGrantMemberCredit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      memberId,
      amount,
      accId,
      notes,
      creditDate,
    }: {
      memberId: number;
      amount: number;
      accId?: number;
      notes?: string;
      creditDate?: string;
    }) => financeService.grantMemberCredit(memberId, { amount, accId, notes, creditDate }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dues"] });
      qc.invalidateQueries({ queryKey: qk.members });
      qc.invalidateQueries({ queryKey: qk.accounts });
      qc.invalidateQueries({ queryKey: qk.reports.cashFlow });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["reports", "member-statement"] });
      toast.success("Member loan recorded");
    },
    onError: (err) => toastErr(err, "Failed to record loan"),
  });
}

export function useRepayMemberLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      memberId,
      amount,
      accId,
      notes,
      repayDate,
    }: {
      memberId: number;
      amount: number;
      accId?: number;
      notes?: string;
      repayDate?: string;
    }) => financeService.repayMemberLoan(memberId, { amount, accId, notes, repayDate }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dues"] });
      qc.invalidateQueries({ queryKey: qk.members });
      qc.invalidateQueries({ queryKey: qk.accounts });
      qc.invalidateQueries({ queryKey: qk.reports.cashFlow });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["reports", "member-statement"] });
      toast.success("Loan repayment recorded");
    },
    onError: (err) => toastErr(err, "Failed to record repayment"),
  });
}

export function useApplyMemberCredit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dueId, amount }: { dueId: number; amount?: number }) =>
      financeService.applyMemberCredit(dueId, amount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dues"] });
      toast.success("Member credit applied");
    },
    onError: (err) => toastErr(err, "Failed to apply credit"),
  });
}

