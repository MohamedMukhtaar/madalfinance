import dayjs from 'dayjs';
import salaryRepo from '../repositories/salary.repo.js';
import employeeRepo from '../repositories/employee.repo.js';
import accountRepo from '../repositories/account.repo.js';
import transactionRepo from '../repositories/transaction.repo.js';
import accountService from './account.service.js';
import auditService from './audit.service.js';
import ApiError from '../utils/ApiError.js';
import { withTransaction } from '../config/db.js';
import { PAYMENT_METHODS } from '../utils/constants.js';

const periodDate = (year, month, fallback) => {
  if (fallback) {
    const d = dayjs(fallback);
    if (d.isValid()) return d.startOf('month').format('YYYY-MM-DD');
  }
  const y = Number(year);
  const m = Number(month);
  if (!y || !m || m < 1 || m > 12) return null;
  return dayjs(`${y}-${String(m).padStart(2, '0')}-01`).format('YYYY-MM-DD');
};

const chargeStatus = (paid, net) => {
  if (paid <= 0.001) return 'Pending';
  if (paid >= Number(net) - 0.001) return 'Paid';
  return 'Partial';
};

export const salaryService = {
  async listCharges(filters) {
    const period = periodDate(filters.year, filters.month, filters.salary_period || filters.period);
    const rows = await salaryRepo.listCharges(null, { ...filters, period });
    const total = await salaryRepo.countCharges(null, { ...filters, period });
    return { rows, total };
  },

  async getCharge(id) {
    const charge = await salaryRepo.findChargeById(null, id);
    if (!charge) throw ApiError.notFound('Salary charge not found');
    return charge;
  },

  async createCharge(data, userId, ip) {
    return withTransaction(async (conn) => {
      const employeeId = Number(data.employee_id);
      const employee = await employeeRepo.findById(conn, employeeId);
      if (!employee) throw ApiError.notFound('Employee not found');
      if (employee.status !== 'active') throw ApiError.badRequest('Employee is not active');

      const period = periodDate(data.year, data.month, data.salary_period);
      if (!period) throw ApiError.badRequest('Salary period (year and month) is required');

      const existing = await salaryRepo.findChargeByEmployeePeriod(conn, employeeId, period);
      if (existing) throw ApiError.conflict('A salary charge already exists for this employee and period');

      const basic = data.basic_salary !== undefined ? Number(data.basic_salary) : Number(employee.basic_salary);
      const allowance = Number(data.allowance ?? 0);
      const deduction = Number(data.deduction ?? 0);
      if (basic < 0 || allowance < 0 || deduction < 0) throw ApiError.badRequest('Amounts cannot be negative');
      if (deduction > basic + allowance) throw ApiError.badRequest('Deduction cannot exceed basic salary plus allowance');
      if (basic + allowance - deduction <= 0) throw ApiError.badRequest('Net salary must be greater than zero');

      const id = await salaryRepo.createCharge(conn, {
        employee_id: employeeId,
        charge_date: data.charge_date || new Date(),
        salary_period: period,
        basic_salary: basic,
        allowance,
        deduction,
        reference_number: data.reference_number ?? null,
        notes: data.notes ?? null,
        created_by: userId,
      });

      await auditService.log({ module: 'Salary', action: 'CREATE', userId, recordId: id, ip });
      return salaryRepo.findChargeById(conn, id);
    });
  },

  async generate(data, userId, ip) {
    return withTransaction(async (conn) => {
      const period = periodDate(data.year, data.month, data.salary_period);
      if (!period) throw ApiError.badRequest('Salary period (year and month) is required');

      const employees = await employeeRepo.listActive(conn);
      if (!employees.length) throw ApiError.badRequest('No active employees to charge');

      let created = 0;
      let skipped = 0;
      const charges = [];

      for (const employee of employees) {
        const existing = await salaryRepo.findChargeByEmployeePeriod(conn, employee.employee_id, period);
        if (existing) {
          skipped += 1;
          continue;
        }
        const basic = Number(employee.basic_salary);
        if (basic <= 0) {
          skipped += 1;
          continue;
        }
        const id = await salaryRepo.createCharge(conn, {
          employee_id: employee.employee_id,
          charge_date: new Date(),
          salary_period: period,
          basic_salary: basic,
          allowance: 0,
          deduction: 0,
          created_by: userId,
        });
        created += 1;
        charges.push(await salaryRepo.findChargeById(conn, id));
      }

      await auditService.log({ module: 'Salary', action: 'GENERATE', userId, recordId: null, ip });
      return { created, skipped, period, charges };
    });
  },

  async removeCharge(id, userId, ip) {
    return withTransaction(async (conn) => {
      const charge = await salaryRepo.findChargeById(conn, id);
      if (!charge) throw ApiError.notFound('Salary charge not found');
      if (Number(charge.paid_amount) > 0) {
        throw ApiError.badRequest('Cannot delete a charge that already has payments');
      }
      await salaryRepo.deleteCharge(conn, id);
      await auditService.log({ module: 'Salary', action: 'DELETE', userId, recordId: id, ip });
      return { salary_charge_id: id, deleted: true };
    });
  },

  async listPayments(filters) {
    const rows = await salaryRepo.listPayments(null, filters);
    const total = await salaryRepo.countPayments(null, filters);
    return { rows, total };
  },

  async pay(chargeId, data, userId, ip) {
    return withTransaction(async (conn) => {
      const charge = await salaryRepo.findChargeById(conn, chargeId);
      if (!charge) throw ApiError.notFound('Salary charge not found');
      if (charge.status === 'Cancelled') throw ApiError.conflict('This salary charge is cancelled');
      if (charge.status === 'Paid') throw ApiError.conflict('This salary charge is already fully paid');

      const amount = Number(data.amount);
      if (!amount || amount <= 0) throw ApiError.badRequest('Amount must be greater than zero');
      const remaining = Number(charge.balance);
      if (amount > remaining + 0.01) {
        throw ApiError.badRequest(`Amount exceeds the outstanding balance of ${remaining.toFixed(2)}`);
      }

      const method = data.payment_method || data.method || 'Cash';
      if (!PAYMENT_METHODS.includes(method)) throw ApiError.badRequest('Invalid payment method');

      let accId = data.account_id ? Number(data.account_id) : data.acc_id ? Number(data.acc_id) : null;
      if (!accId) {
        const def = await accountRepo.findDefault(conn);
        if (def) accId = def.acc_id || def.account_id;
      }
      if (!accId) throw ApiError.badRequest('Account is required. Create an account or set a default account.');

      const paidOn = data.payment_date || data.paid_date || new Date();
      const paymentId = await salaryRepo.createPayment(conn, {
        salary_charge_id: chargeId,
        employee_id: charge.employee_id,
        account_id: accId,
        payment_date: paidOn,
        amount,
        payment_method: method,
        reference_number: data.reference_number ?? data.reference ?? null,
        notes: data.notes ?? null,
        paid_by: userId,
      });

      const newPaid = Number(charge.paid_amount) + amount;
      await salaryRepo.applyChargePayment(conn, chargeId, newPaid, chargeStatus(newPaid, charge.net_salary));

      const periodLabel = dayjs(charge.salary_period).format('MMMM YYYY');
      await transactionRepo.create(conn, {
        transaction_date: paidOn,
        transaction_type: 'Expense',
        reference_type: 'Salary',
        reference_id: paymentId,
        description: `Salary — ${charge.full_name} (${periodLabel})`,
        income: 0,
        expense: amount,
        acc_id: accId,
        created_by: userId,
      });

      await accountService.debit(conn, accId, amount);
      await auditService.log({ module: 'Salary', action: 'PAYMENT', userId, recordId: paymentId, ip });
      return salaryRepo.findPaymentById(conn, paymentId);
    });
  },
};

export default salaryService;
