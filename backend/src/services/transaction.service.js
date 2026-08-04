import transactionRepo from '../repositories/transaction.repo.js';

export const transactionService = {
  async list(filters) {
    const rows = await transactionRepo.list(null, filters);
    const total = await transactionRepo.count(null, filters);
    const currentBalance = await transactionRepo.currentBalance(null);
    return { rows, total, currentBalance };
  },

  async summary({ fromDate, toDate }) {
    const [income, expense, balance] = await Promise.all([
      transactionRepo.sumByType(null, { type: 'Income', fromDate, toDate }),
      transactionRepo.sumByType(null, { type: 'Expense', fromDate, toDate }),
      transactionRepo.currentBalance(null),
    ]);
    return {
      income,
      expense,
      net: income - expense,
      balance,
    };
  },
};

export default transactionService;
