import paymentRepo from '../repositories/payment.repo.js';
import customerRepo from '../repositories/customer.repo.js';
import invoiceRepo from '../repositories/invoice.repo.js';
import transactionRepo from '../repositories/transaction.repo.js';
import accountRepo from '../repositories/account.repo.js';
import accountService from './account.service.js';
import trashRepo from '../repositories/trash.repo.js';
import settingsRepo from '../repositories/settings.repo.js';
import auditService from './audit.service.js';
import ApiError from '../utils/ApiError.js';
import { withTransaction } from '../config/db.js';
import { generateNumber } from '../helpers/numberGenerator.js';
import { deleteStoredFile } from '../helpers/fileHelper.js';
import { requireDeleteReason } from '../helpers/deleteReason.js';
import { generatePaymentPdf } from '../helpers/pdf.js';
import dayjs from 'dayjs';

import { deriveInvoiceStatus, distributeAllocationAmounts } from '../helpers/paymentAllocation.js';

const reverseAllocationOnInvoice = async (conn, alloc) => {
  const invoice = await invoiceRepo.findById(conn, alloc.invoice_id);
  const newPaid = Number(invoice.paid_amount) - Number(alloc.amount_allocated);
  let status = invoice.status;
  if (invoice.status === 'Paid') {
    status = newPaid <= 0 ? 'Issued' : 'Partial';
  } else if (invoice.status === 'Partial') {
    status = newPaid <= 0 ? 'Issued' : 'Partial';
  }
  await invoiceRepo.applyPaidAmount(conn, alloc.invoice_id, Math.max(0, newPaid), status);
};

export const paymentService = {
  async list(filters) {
    const rows = await paymentRepo.list(null, filters);
    const total = await paymentRepo.count(null, filters);
    return { rows, total };
  },

  async getById(id) {
    const payment = await paymentRepo.findById(null, id);
    if (!payment) throw ApiError.notFound('Payment not found');
    const [allocs, atts] = await Promise.all([
      paymentRepo.allocations(null, id),
      paymentRepo.attachments(null, id),
    ]);
    return { ...payment, allocations: allocs, attachments: atts };
  },

  /**
   * Record a payment and allocate it to one or more invoices in a single
   * transaction: payment + allocations + invoice balances/status + ledger.
   */
  async create(data, userId, ip) {
    return withTransaction(async (conn) => {
      const customer = await customerRepo.findById(conn, data.customer_id);
      if (!customer) throw ApiError.notFound('Customer not found');

      const amount = Number(data.amount);
      if (!amount || amount <= 0) throw ApiError.badRequest('Payment amount must be greater than zero');

      const allocations = (data.allocations || []).map((a) => ({
        invoice_id: Number(a.invoice_id),
        amount: Number(a.amount),
      }));
      if (!allocations.length) throw ApiError.badRequest('Allocate the payment to at least one invoice');

      const allocatedSum = allocations.reduce((s, a) => s + a.amount, 0);
      if (Math.abs(allocatedSum - amount) > 0.01) {
        throw ApiError.badRequest('Allocated amounts must equal the payment amount');
      }

      // Validate each invoice, must belong to the customer and have room.
      for (const alloc of allocations) {
        const invoice = await invoiceRepo.findByIdForUpdate(conn, alloc.invoice_id);
        if (!invoice) throw ApiError.notFound(`Invoice ${alloc.invoice_id} not found`);
        if (invoice.customer_id !== customer.customer_id) {
          throw ApiError.badRequest(`Invoice ${invoice.invoice_number} does not belong to this customer`);
        }
        if (invoice.status === 'Cancelled') {
          throw ApiError.badRequest(`Cannot pay a cancelled invoice (${invoice.invoice_number})`);
        }
        const remaining = Number(invoice.total_amount) - Number(invoice.paid_amount);
        if (alloc.amount > remaining + 0.01) {
          throw ApiError.badRequest(
            `Allocated amount exceeds the balance of invoice ${invoice.invoice_number} (${remaining.toFixed(2)})`
          );
        }
      }

      const payment_number = await generateNumber(conn, 'payments', 'payment_number', data.prefix || 'PAY-');

      let accId = data.acc_id ? Number(data.acc_id) : null;
      if (!accId) {
        const def = await accountRepo.findDefault(conn);
        if (def) accId = def.acc_id;
      }
      if (!accId) throw ApiError.badRequest('Account is required. Create an account or set a default account.');

      const paymentId = await paymentRepo.create(conn, {
        payment_number,
        customer_id: data.customer_id,
        payment_date: data.payment_date,
        payment_method: data.payment_method,
        reference_number: data.reference_number ?? null,
        amount,
        acc_id: accId,
        notes: data.notes ?? null,
        received_by: userId,
      });

      // Apply allocations and update invoice balances + status.
      for (const alloc of allocations) {
        await paymentRepo.addAllocation(conn, paymentId, alloc.invoice_id, alloc.amount);
        const invoice = await invoiceRepo.findByIdForUpdate(conn, alloc.invoice_id);
        const { paid, status } = deriveInvoiceStatus(invoice, alloc.amount);
        await invoiceRepo.applyPaidAmount(conn, alloc.invoice_id, paid, status);
      }

      // Ledger entry (append-only income).
      await transactionRepo.create(conn, {
        transaction_date: data.payment_date,
        transaction_type: 'Income',
        reference_type: 'Payment',
        reference_id: paymentId,
        description: `Payment ${payment_number} from ${customer.customer_name}`,
        income: amount,
        expense: 0,
        created_by: userId,
      });

      await accountService.credit(conn, accId, amount);

      await auditService.log({ module: 'Payment', action: 'CREATE', userId, recordId: paymentId, ip });
      return paymentRepo.findById(conn, paymentId);
    });
  },

  async update(id, data, userId, ip) {
    return withTransaction(async (conn) => {
      const payment = await paymentRepo.findById(conn, id);
      if (!payment) throw ApiError.notFound('Payment not found');

      const oldAmount = Number(payment.amount);
      const newAmount = data.amount !== undefined ? Number(data.amount) : oldAmount;
      const oldAccId = payment.acc_id ? Number(payment.acc_id) : null;
      const newAccId = data.acc_id !== undefined ? Number(data.acc_id) : oldAccId;

      if (data.amount !== undefined && (!newAmount || newAmount <= 0)) {
        throw ApiError.badRequest('Payment amount must be greater than zero');
      }

      const patch = {};
      if (data.payment_date !== undefined) patch.payment_date = data.payment_date;
      if (data.payment_method !== undefined) patch.payment_method = data.payment_method;
      if (data.reference_number !== undefined) patch.reference_number = data.reference_number || null;
      if (data.notes !== undefined) patch.notes = data.notes || null;

      const amountChanged = data.amount !== undefined && Math.abs(newAmount - oldAmount) > 0.001;
      const accChanged = data.acc_id !== undefined && newAccId !== oldAccId;

      if (amountChanged) {
        const allocs = await paymentRepo.allocations(conn, id);
        if (!allocs.length) throw ApiError.badRequest('Payment has no invoice allocations');

        for (const alloc of allocs) {
          await reverseAllocationOnInvoice(conn, alloc);
        }

        const newAllocAmounts = distributeAllocationAmounts(allocs, oldAmount, newAmount);

        for (let i = 0; i < allocs.length; i++) {
          const alloc = allocs[i];
          const invoice = await invoiceRepo.findById(conn, alloc.invoice_id);
          const remaining = Number(invoice.total_amount) - Number(invoice.paid_amount);
          if (newAllocAmounts[i] > remaining + 0.01) {
            throw ApiError.badRequest(
              `Amount exceeds the balance of invoice ${invoice.invoice_number} (${remaining.toFixed(2)})`
            );
          }
        }

        for (let i = 0; i < allocs.length; i++) {
          await paymentRepo.updateAllocation(conn, allocs[i].allocation_id, newAllocAmounts[i]);
          const invoice = await invoiceRepo.findById(conn, allocs[i].invoice_id);
          const { paid, status } = deriveInvoiceStatus(invoice, newAllocAmounts[i]);
          await invoiceRepo.applyPaidAmount(conn, allocs[i].invoice_id, paid, status);
        }

        patch.amount = newAmount;

        const delta = newAmount - oldAmount;
        const customer = await customerRepo.findById(conn, payment.customer_id);
        const txnDate = patch.payment_date ?? payment.payment_date;
        if (delta > 0) {
          await transactionRepo.create(conn, {
            transaction_date: txnDate,
            transaction_type: 'Income',
            reference_type: 'Payment',
            reference_id: id,
            description: `Payment ${payment.payment_number} adjustment (+${delta.toFixed(2)}) from ${customer?.customer_name || 'customer'}`,
            income: delta,
            expense: 0,
            created_by: userId,
          });
        } else if (delta < 0) {
          await transactionRepo.create(conn, {
            transaction_date: txnDate,
            transaction_type: 'Expense',
            reference_type: 'Payment',
            reference_id: id,
            description: `Payment ${payment.payment_number} adjustment (${delta.toFixed(2)})`,
            income: 0,
            expense: Math.abs(delta),
            created_by: userId,
          });
        }
      }

      if (accChanged && amountChanged) {
        if (oldAccId) await accountService.debit(conn, oldAccId, oldAmount);
        if (newAccId) await accountService.credit(conn, newAccId, newAmount);
        patch.acc_id = newAccId;
      } else if (accChanged) {
        if (oldAccId) await accountService.debit(conn, oldAccId, oldAmount);
        if (newAccId) await accountService.credit(conn, newAccId, oldAmount);
        patch.acc_id = newAccId;
      } else if (amountChanged && oldAccId) {
        const delta = newAmount - oldAmount;
        if (delta > 0) await accountService.credit(conn, oldAccId, delta);
        else await accountService.debit(conn, oldAccId, Math.abs(delta));
      }

      if (!Object.keys(patch).length) throw ApiError.badRequest('No fields to update');

      await paymentRepo.update(conn, id, patch);

      if (patch.payment_date) {
        await transactionRepo.updateIncomeDateByReference(conn, 'Payment', id, patch.payment_date);
      }

      await auditService.log({ module: 'Payment', action: 'UPDATE', userId, recordId: id, ip });
      return paymentRepo.findById(conn, id);
    });
  },

  /**
   * Void a payment: reverse allocations, restore invoice balances/status,
   * and post a reversing ledger entry so the running balance stays correct.
   */
  async void(id, reason, userId, ip) {
    const deleteReason = requireDeleteReason(reason);
    return withTransaction(async (conn) => {
      const payment = await paymentRepo.findById(conn, id);
      if (!payment) throw ApiError.notFound('Payment not found');

      const allocs = await paymentRepo.allocations(conn, id);

      for (const alloc of allocs) {
        const invoice = await invoiceRepo.findById(conn, alloc.invoice_id);
        const newPaid = Number(invoice.paid_amount) - Number(alloc.amount_allocated);
        let status = invoice.status;
        if (invoice.status === 'Paid') {
          status = newPaid <= 0 ? 'Issued' : 'Partial';
        } else if (invoice.status === 'Partial') {
          status = newPaid <= 0 ? 'Issued' : 'Partial';
        }
        const paid = Math.max(0, newPaid);
        await invoiceRepo.applyPaidAmount(conn, alloc.invoice_id, paid, status);
      }

      // Keep allocations rows (audit trail) but mark payment deleted.
      await paymentRepo.softDelete(conn, id, { reason: deleteReason, deletedBy: userId });
      await trashRepo.add(conn, {
        entity_type: 'payment',
        entity_id: id,
        entity_label: payment.payment_number || `Payment #${id}`,
        delete_reason: deleteReason,
        deleted_by: userId,
      });

      await transactionRepo.create(conn, {
        transaction_date: dayjs().format('YYYY-MM-DD'),
        transaction_type: 'Expense',
        reference_type: 'Payment',
        reference_id: id,
        description: `Voided payment ${payment.payment_number}`,
        income: 0,
        expense: Number(payment.amount),
        created_by: userId,
      });

      if (payment.acc_id) {
        await accountService.debit(conn, payment.acc_id, Number(payment.amount));
      }

      await auditService.log({ module: 'Payment', action: 'DELETE', userId, recordId: id, ip, details: deleteReason });
      return { payment_id: id, voided: true };
    });
  },

  async addAttachment(id, file, userId, ip) {
    const payment = await paymentRepo.findById(null, id);
    if (!payment) throw ApiError.notFound('Payment not found');
    await paymentRepo.addAttachment(null, id, {
      file_name: file.originalname,
      file_path: file.filename,
      file_type: file.mimetype,
    });
    await auditService.log({ module: 'Payment', action: 'UPLOAD', userId, recordId: id, ip });
    return paymentRepo.attachments(null, id);
  },

  async deleteAttachment(paymentId, attachmentId, userId, ip) {
    const attachment = await paymentRepo.findAttachment(null, attachmentId);
    if (!attachment || attachment.payment_id !== Number(paymentId)) {
      throw ApiError.notFound('Attachment not found');
    }
    deleteStoredFile('payments', attachment.file_path);
    await paymentRepo.deleteAttachment(null, attachmentId);
    await auditService.log({ module: 'Payment', action: 'DELETE_ATTACHMENT', userId, recordId: paymentId, ip });
  },

  async generatePdf(id) {
    const payment = await paymentRepo.findById(null, id);
    if (!payment) throw ApiError.notFound('Payment not found');
    const [allocations, customer, settings] = await Promise.all([
      paymentRepo.allocations(null, id),
      customerRepo.findById(null, payment.customer_id),
      settingsRepo.get(null),
    ]);
    return generatePaymentPdf({ payment, customer, allocations, settings });
  },
};

export default paymentService;
