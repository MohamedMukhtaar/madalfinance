import { authApi as http } from "../api";
import { unwrap } from "./helpers";

export const dashboardApi = {
  /* ------------------------------ DASHBOARD ------------------------------ */
  async dashboard(params?: { year?: number; month?: number }) {
    const res = await http.get<import("@/types").DashboardData>(
      "/settings/dashboard",
      params ? { year: params.year, month: params.month } : undefined
    );
    const data = unwrap(res);
    const s = data.stats ?? ({} as import("@/types").DashboardData["stats"]);
    const n = (v: unknown) => Number(v) || 0;
    return {
      ...data,
      stats: {
        ...s,
        currentBalance: n(s.currentBalance),
        monthIncome: n(s.monthIncome),
        monthExpense: n(s.monthExpense),
        todayIncome: n(s.todayIncome),
        weekIncome: n(s.weekIncome),
        todayExpense: n(s.todayExpense),
        weekExpense: n(s.weekExpense),
        totalCustomers: n(s.totalCustomers),
        activeCustomers: n(s.activeCustomers),
        totalProjects: n(s.totalProjects),
        totalRentalProjects: n(s.totalRentalProjects),
        totalOneTimeProjects: n(s.totalOneTimeProjects),
        activeProjects: n(s.activeProjects),
        completedProjects: n(s.completedProjects),
        totalOutstanding: n(s.totalOutstanding),
        openInvoices: n(s.openInvoices),
        overdueInvoices: n(s.overdueInvoices),
        totalCollected: n(s.totalCollected),
        totalDuesBalance: n(s.totalDuesBalance),
        activeRentals: n(s.activeRentals),
      },
    };
  },

};
