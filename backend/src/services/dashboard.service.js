import dashboardRepo from '../repositories/dashboard.repo.js';

export const dashboardService = {
  async getStats({ year, month } = {}) {
    const { start, end } = dashboardRepo.monthBounds(year, month);
    // Chart window: selected month + 5 months prior
    const endDate = new Date(end);
    const chartStartDate = new Date(endDate.getFullYear(), endDate.getMonth() - 5, 1);
    const chartFrom = `${chartStartDate.getFullYear()}-${String(chartStartDate.getMonth() + 1).padStart(2, '0')}-01`;

    const stats = await dashboardRepo.dashboardStats(null, { year, month });
    const [
      invoiceStatusCounts,
      recentTransactions,
      recentPayments,
      recentExpenses,
      rentalRenewals,
      dueBatches,
      chartTransactions,
    ] = await Promise.all([
      dashboardRepo.invoiceStatusCounts(null),
      dashboardRepo.recentTransactions(null, { limit: 8, fromDate: start, toDate: end }),
      dashboardRepo.recentPayments(null, { limit: 6, fromDate: start, toDate: end }),
      dashboardRepo.recentExpenses(null, { limit: 100, fromDate: start, toDate: end }),
      dashboardRepo.rentalRenewals(null),
      dashboardRepo.dueStatusSummary(null),
      dashboardRepo.chartTransactions(null, { fromDate: chartFrom, toDate: end }),
    ]);

    return {
      stats,
      invoiceStatusCounts,
      recentTransactions,
      recentPayments,
      recentExpenses,
      rentalRenewals,
      dueBatches,
      chartTransactions,
      period: { year: year || Number(start.slice(0, 4)), month: month || Number(start.slice(5, 7)), from: start, to: end, chartFrom },
    };
  },
};

export default dashboardService;
