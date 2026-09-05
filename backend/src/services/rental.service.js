import rentalRepo from '../repositories/rental.repo.js';
import projectRepo from '../repositories/project.repo.js';
import invoiceRepo from '../repositories/invoice.repo.js';
import userRepo from '../repositories/user.repo.js';
import auditService from './audit.service.js';
import ApiError from '../utils/ApiError.js';
import { RENTAL_STATUS } from '../utils/constants.js';
import { withTransaction } from '../config/db.js';
import { generateNumber } from '../helpers/numberGenerator.js';
import config from '../config/index.js';
import dayjs from 'dayjs';

const { rentalDueDays } = config.cron;

const nextBillingDate = (billingDay, from) => {
  let next = dayjs(from).date(Math.min(billingDay, 28));
  if (next.isBefore(dayjs(from), 'day')) next = next.add(1, 'month');
  return next.format('YYYY-MM-DD');
};

const periodBillingDate = (year, month, billingDay) => {
  const day = Math.min(Number(billingDay) || 1, 28);
  return dayjs(`${year}-${String(month).padStart(2, '0')}-01`)
    .date(day)
    .format('YYYY-MM-DD');
};

export const rentalService = {
  async list(filters) {
    const rows = await rentalRepo.list(null, filters);
    const total = await rentalRepo.count(null, filters);
    return { rows, total };
  },

  async getById(id) {
    const billing = await rentalRepo.findById(null, id);
    if (!billing) throw ApiError.notFound('Rental billing not found');
    const project = await projectRepo.findById(null, billing.project_id);
    const invoices = await invoiceRepo.list(null, {
      search: '',
      status: '',
      customerId: project.customer_id,
      fromDate: '',
      toDate: '',
      offset: 0,
      perPage: 100,
      order: 'invoice_date DESC',
    });
    return {
      ...billing,
      project_name: project.project_name,
      customer_id: project.customer_id,
      customer_name: project.customer_name,
      invoices: invoices.rows,
    };
  },

  async create(data, userId, ip, existingConn = null) {
    const runInTx = async (conn) => {
      const project = await projectRepo.findById(conn, data.project_id);
      if (!project) throw ApiError.notFound('Project not found');
      if (project.project_type !== 'Rental') {
        throw ApiError.badRequest('Rental billing can only be created for Rental projects');
      }

      const existing = await rentalRepo.findByProject(conn, data.project_id);
      if (existing) throw ApiError.conflict('This project already has a rental billing');

      const billingDay = Number(data.billing_day) || 1;
      const next = data.next_billing_date || nextBillingDate(billingDay, dayjs().format('YYYY-MM-DD'));
      const setupFee = Number(data.setup_fee ?? 0);

      const id = await rentalRepo.create(conn, {
        project_id: data.project_id,
        monthly_amount: Number(data.monthly_amount),
        setup_fee: setupFee,
        billing_day: billingDay,
        next_billing_date: next,
        status: 'Active',
      });

      if (setupFee > 0) {
        const today = dayjs().format('YYYY-MM-DD');
        const invoice_number = await generateNumber(conn, 'invoices', 'invoice_number', 'INV-');
        const invoiceId = await invoiceRepo.create(conn, {
          invoice_number,
          customer_id: project.customer_id,
          project_id: project.project_id,
          contract_id: null,
          invoice_date: today,
          due_date: dayjs(today).add(rentalDueDays, 'day').format('YYYY-MM-DD'),
          subtotal: setupFee,
          discount: 0,
          tax: 0,
          total_amount: setupFee,
          status: 'Issued',
          created_by: userId,
        });
        await invoiceRepo.replaceItems(conn, invoiceId, [
          {
            description: `Setup / installation fee — ${project.project_name}`,
            quantity: 1,
            unit_price: setupFee,
          },
        ]);
        await rentalRepo.setSetupInvoice(conn, id, invoiceId);
      }

      await auditService.log({ module: 'Rental', action: 'CREATE', userId, recordId: id, ip });
      return rentalRepo.findById(conn, id);
    };

    if (existingConn) return runInTx(existingConn);
    return withTransaction(runInTx);
  },

  async update(id, data, userId, ip) {
    return withTransaction(async (conn) => {
      const billing = await rentalRepo.findById(conn, id);
      if (!billing) throw ApiError.notFound('Rental billing not found');
      const next = data.next_billing_date || (data.billing_day ? nextBillingDate(Number(data.billing_day), dayjs().format('YYYY-MM-DD')) : undefined);
      await rentalRepo.update(conn, id, { ...data, next_billing_date: next });
      await auditService.log({ module: 'Rental', action: 'UPDATE', userId, recordId: id, ip });
      return rentalRepo.findById(conn, id);
    });
  },

  async setStatus(id, status, userId, ip) {
    if (!RENTAL_STATUS.includes(status)) throw ApiError.badRequest('Invalid rental status');
    return withTransaction(async (conn) => {
      const billing = await rentalRepo.findById(conn, id);
      if (!billing) throw ApiError.notFound('Rental billing not found');
      await rentalRepo.setStatus(conn, id, status);
      await auditService.log({ module: 'Rental', action: 'STATUS', userId, recordId: id, ip });
      return rentalRepo.findById(conn, id);
    });
  },

  /**
   * Generate this month's rental invoice for a billing. Idempotent: advances
   * the schedule after creation so the same month is never billed twice.
   * Pass `{ force: true }` to bill immediately even when not yet due (manual UI).
   */
  async generateMonthlyInvoice(billingId, userId, options = {}) {
    return withTransaction(async (conn) => {
      const billing = await rentalRepo.findById(conn, billingId);
      if (!billing) throw ApiError.notFound('Rental billing not found');
      if (billing.status !== 'Active') throw ApiError.badRequest('Rental billing is not active — resume it first');

      const today = dayjs().format('YYYY-MM-DD');
      const force = Boolean(options.force);
      const hasPeriod = options.month && options.year;
      const periodDate = hasPeriod
        ? periodBillingDate(options.year, options.month, billing.billing_day)
        : null;

      if (!force && !hasPeriod && billing.next_billing_date > today) {
        throw ApiError.badRequest('This billing is not due yet');
      }

      let actorId = userId;
      if (!actorId) {
        const admin = await userRepo.findByUsername(conn, 'admin');
        actorId = admin?.user_id ?? null;
      }
      if (!actorId) throw ApiError.internal('No system user available to generate invoices');

      const project = await projectRepo.findById(conn, billing.project_id);
      if (!project) throw ApiError.notFound('Project not found');

      const billingPeriodDate = periodDate ?? billing.next_billing_date;
      const periodLabel = dayjs(billingPeriodDate).format('MMM YYYY');

      const existing = await invoiceRepo.findRentalMonthlyForPeriod(conn, project.project_id, periodLabel);
      if (existing) {
        throw ApiError.conflict('Same month, no need to charge twice');
      }

      const billDate =
        hasPeriod && periodDate
          ? periodDate
          : force && billing.next_billing_date > today
            ? today
            : billing.next_billing_date;

      const invoice_number = await generateNumber(conn, 'invoices', 'invoice_number', 'INV-');

      const invoiceId = await invoiceRepo.create(conn, {
        invoice_number,
        customer_id: project.customer_id,
        project_id: project.project_id,
        contract_id: null,
        invoice_date: billDate,
        due_date: dayjs(billDate).add(rentalDueDays, 'day').format('YYYY-MM-DD'),
        subtotal: Number(billing.monthly_amount),
        discount: 0,
        tax: 0,
        total_amount: Number(billing.monthly_amount),
        status: 'Issued',
        created_by: actorId,
      });
      await invoiceRepo.replaceItems(conn, invoiceId, [
        {
          description: `Monthly rental — ${project.project_name} (${periodLabel})`,
          quantity: 1,
          unit_price: Number(billing.monthly_amount),
        },
      ]);

      const periodMonth = dayjs(billingPeriodDate).startOf('month');
      const nextMonth = dayjs(billing.next_billing_date).startOf('month');
      if (!periodMonth.isBefore(nextMonth)) {
        await rentalRepo.advanceBilling(conn, billingId, {
          next_billing_date: nextBillingDate(billing.billing_day, billing.next_billing_date),
          last_generated: billingPeriodDate,
        });
      }

      await auditService.log({ module: 'Rental', action: 'BILLING', userId, recordId: billingId, ip: null });
      return invoiceRepo.findById(conn, invoiceId);
    });
  },

  /** Used by the cron job / Charge All: generate invoices for active billings for a billing period. */
  async processDueBillings(userId = null, { force = false, month, year } = {}) {
    const today = dayjs().format('YYYY-MM-DD');
    const due =
      force || (month && year)
        ? await rentalRepo.list(null, { status: 'Active', offset: 0, perPage: 10000, order: 'next_billing_date ASC' })
        : await rentalRepo.dueForBilling(null, today);
    const results = { generated: 0, skipped: 0, errors: [] };
    for (const billing of due) {
      try {
        await this.generateMonthlyInvoice(billing.billing_id, userId, {
          force: true,
          month: month ?? undefined,
          year: year ?? undefined,
        });
        results.generated += 1;
      } catch (err) {
        if (err instanceof ApiError && err.statusCode === 409) {
          results.skipped += 1;
        } else {
          results.errors.push({ billingId: billing.billing_id, message: err.message });
        }
      }
    }
    return results;
  },
};

export default rentalService;
