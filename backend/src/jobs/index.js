import fs from 'node:fs';
import path from 'node:path';
import cron from 'node-cron';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import rentalService from '../services/rental.service.js';
import contributionService from '../services/contribution.service.js';
import invoiceRepo from '../repositories/invoice.repo.js';
import refreshTokenRepo from '../repositories/refreshToken.repo.js';
import dayjs from 'dayjs';

/** Flag all overdue invoices once daily. */
async function runOverdueCheck() {
  const today = dayjs().format('YYYY-MM-DD');
  const overdue = await invoiceRepo.overdue(null, today);
  for (const invoice of overdue) {
    if (invoice.status !== 'Overdue') await invoiceRepo.updateStatus(null, invoice.invoice_id, 'Overdue');
  }
  logger.info(`Overdue check: ${overdue.length} invoice(s) marked overdue`);
  return { marked: overdue.length };
}

/** Generate rental invoices for every billing that is due. */
async function runRentalBilling() {
  const result = await rentalService.processDueBillings();
  logger.info(
    `Rental billing run: generated=${result.generated}, skipped=${result.skipped}, errors=${result.errors.length}`
  );
  return result;
}

/** Create this month's member due batch if one does not exist yet. */
async function runMonthlyDues() {
  const now = dayjs();
  const month = now.month() + 1;
  const year = now.year();
  try {
    const batch = await contributionService.generateBatch({ month, year }, null, null);
    logger.info(`Monthly dues generated: batch #${batch.batch_id} (${month}/${year})`);
    return { batch_id: batch.batch_id };
  } catch (err) {
    if (err.statusCode === 409) {
      logger.info('Monthly dues: batch already exists, skipping');
      return { skipped: true };
    }
    throw err;
  }
}

/** Housekeeping: purge old generated report files + expired refresh tokens. */
async function runHousekeeping() {
  try {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const reportsDir = config.dirs.reports;
    if (fs.existsSync(reportsDir)) {
      for (const file of fs.readdirSync(reportsDir)) {
        const fp = path.join(reportsDir, file);
        const stat = fs.statSync(fp);
        if (stat.isFile() && stat.mtimeMs < cutoff) {
          fs.unlinkSync(fp);
        }
      }
    }
    await refreshTokenRepo.cleanupExpired(null);
    logger.info('Housekeeping complete');
  } catch (err) {
    logger.warn(`Housekeeping failed: ${err.message}`);
  }
}

const jobs = [
  ...(config.cron.rentalAutoBillingEnabled
    ? [{ name: 'rentalBilling', schedule: config.cron.rentalBilling, run: runRentalBilling }]
    : []),
  { name: 'overdueCheck', schedule: config.cron.overdueCheck, run: runOverdueCheck },
  { name: 'monthlyDues', schedule: config.cron.monthlyDues, run: runMonthlyDues },
  { name: 'housekeeping', schedule: config.cron.reportCache, run: runHousekeeping },
];

const startJobs = () => {
  if (!config.cron.rentalAutoBillingEnabled) {
    logger.info('Rental auto-billing is disabled — use Rental Billing page (Charge All / Generate)');
  }
  for (const job of jobs) {
    if (!cron.validate(job.schedule)) {
      logger.warn(`Invalid cron schedule for ${job.name}: ${job.schedule}`);
      continue;
    }
    cron.schedule(job.schedule, () => {
      job.run().catch((err) => logger.error(`Scheduled job ${job.name} failed: ${err.message}`));
    });
    logger.info(`Scheduled job '${job.name}' registered (${job.schedule})`);
  }
};

const jobTasks = { runRentalBilling, runOverdueCheck, runMonthlyDues, runHousekeeping };

export { startJobs, jobTasks };
