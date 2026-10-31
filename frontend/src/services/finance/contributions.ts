import { authApi as http, apiUrl } from "../api";
import type { Attachment, DueBatch, MemberDue } from "@/types";
import { unwrap, asPaged, toQuery, toSnakeCase, uploadFile, type ListParams, type Paged } from "./helpers";

export const contributionsApi = {
  /* ------------------------------ CONTRIBUTIONS ------------------------------ */
  async dueBatches(params?: ListParams): Promise<Paged<DueBatch>> {
    const res = await http.get<DueBatch[]>("/contributions/batches", toQuery(params));
    return asPaged(res);
  },

  async dueBatch(id: number): Promise<{ batch: DueBatch; dues: MemberDue[] }> {
    const res = await http.get<{ batch: DueBatch; dues: MemberDue[] } | DueBatch>(
      `/contributions/batches/${id}`
    );
    const data = unwrap(res);
    const normalizeDue = (d: MemberDue): MemberDue => ({
      ...d,
      paidAmount: Number(d.paidAmount ?? 0),
      amount: Number(d.amount ?? 0),
      balance: Math.max(0, Number(d.amount ?? 0) - Number(d.paidAmount ?? 0)),
      attachmentCount: Number(d.attachmentCount ?? 0),
      avatarUrl: d.avatarPath ? apiUrl(`/public/avatars/${encodeURIComponent(d.avatarPath)}`) : null,
    });
    if (data && typeof data === "object" && "batch" in data) {
      const wrapped = data as { batch: DueBatch; dues: MemberDue[] };
      return { batch: wrapped.batch, dues: (wrapped.dues ?? []).map(normalizeDue) };
    }
    const batch = data as DueBatch;
    const dues = (batch.dues ?? []).map(normalizeDue);
    return { batch: { ...batch, dues }, dues };
  },

  async memberDues(params?: ListParams): Promise<Paged<MemberDue>> {
    const res = await http.get<MemberDue[]>("/contributions/dues", toQuery(params));
    const paged = asPaged(res);
    return {
      ...paged,
      rows: paged.rows.map((d) => ({
        ...d,
        paidAmount: Number(d.paidAmount ?? 0),
        amount: Number(d.amount ?? 0),
        balance: Math.max(0, Number(d.amount ?? 0) - Number(d.paidAmount ?? 0)),
        creditBalance: Number((d as MemberDue & { creditBalance?: number }).creditBalance ?? 0),
      })),
    };
  },

  async grantMemberCredit(memberId: number, data: { amount: number; accId?: number; notes?: string; creditDate?: string }) {
    const res = await http.post<{ loanBalance: number; creditBalance: number }>(
      `/contributions/members/${memberId}/credit`,
      toSnakeCase(data)
    );
    return unwrap(res);
  },

  async repayMemberLoan(memberId: number, data: { amount: number; accId?: number; notes?: string; repayDate?: string }) {
    const res = await http.post<{ loanBalance: number; creditBalance: number }>(
      `/contributions/members/${memberId}/loan/repay`,
      toSnakeCase(data)
    );
    return unwrap(res);
  },

  async applyMemberCredit(dueId: number, amount?: number) {
    const res = await http.post<MemberDue>(`/contributions/dues/${dueId}/apply-credit`, {
      ...(amount !== undefined ? { amount } : {}),
    });
    return unwrap(res);
  },

  async chargeMembers(data: {
    reason: string;
    chargeDate: string;
    defaultAmount: number;
    month: number;
    year: number;
    memberIds?: number[];
  }): Promise<DueBatch> {
    const res = await http.post<DueBatch>("/contributions/batches", {
      reason: data.reason,
      charge_date: data.chargeDate,
      default_amount: data.defaultAmount,
      month: data.month,
      year: data.year,
      ...(data.memberIds ? { member_ids: data.memberIds } : {}),
    });
    return unwrap(res);
  },

  async contributionPeriods(): Promise<Array<{ year: number; month: number; batches: number }>> {
    const res = await http.get<Array<{ year: number; month: number; batches: number }>>("/contributions/periods");
    return unwrap(res);
  },

  async updateContributionCharge(batchId: number, data: { reason?: string; chargeDate?: string }): Promise<DueBatch> {
    const res = await http.put<DueBatch>(`/contributions/batches/${batchId}`, {
      ...(data.reason !== undefined ? { reason: data.reason } : {}),
      ...(data.chargeDate ? { charge_date: data.chargeDate } : {}),
    });
    return unwrap(res);
  },

  async deleteContributionCharge(batchId: number): Promise<void> {
    await http.delete(`/contributions/batches/${batchId}`);
  },

  async updateMemberDue(dueId: number, amount: number): Promise<MemberDue> {
    const res = await http.put<MemberDue>(`/contributions/dues/${dueId}`, { amount });
    return unwrap(res);
  },

  async deleteMemberDue(dueId: number): Promise<void> {
    await http.delete(`/contributions/dues/${dueId}`);
  },

  async receiveDue(dueId: number, amount: number, accId?: number): Promise<MemberDue> {
    const res = await http.post<MemberDue>(`/contributions/dues/${dueId}/receive`, {
      amount,
      ...(accId ? { acc_id: accId } : {}),
    });
    return unwrap(res);
  },

  async contributionAttachments(dueId: number) {
    const res = await http.get<Attachment[]>(`/contributions/dues/${dueId}/attachments`);
    return unwrap(res);
  },

  async uploadContributionAttachment(dueId: number, file: File, onProgress?: (p: number) => void) {
    return uploadFile(`/contributions/dues/${dueId}/attachments`, file, onProgress);
  },

};
