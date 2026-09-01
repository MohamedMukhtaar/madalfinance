import customerRepo from '../repositories/customer.repo.js';
import invoiceRepo from '../repositories/invoice.repo.js';
import trashRepo from '../repositories/trash.repo.js';
import auditService from './audit.service.js';
import ApiError from '../utils/ApiError.js';
import { withTransaction } from '../config/db.js';
import { requireDeleteReason } from '../helpers/deleteReason.js';

export const customerService = {
  async list(filters) {
    const rows = await customerRepo.list(null, filters);
    const total = await customerRepo.count(null, filters);
    return { rows, total };
  },

  async getById(id) {
    const customer = await customerRepo.findById(null, id);
    if (!customer) throw ApiError.notFound('Customer not found');
    const [invoices, payments, contactList] = await Promise.all([
      customerRepo.statementInvoices(null, id),
      customerRepo.statementPayments(null, id),
      customerRepo.contacts(null, id),
    ]);
    return { ...customer, invoices, payments, contacts: contactList };
  },

  async create(data, userId, ip) {
    return withTransaction(async (conn) => {
      const customer_code = await customerRepo.nextCode(conn);
      const id = await customerRepo.create(conn, { ...data, customer_code });
      await auditService.log({
        module: 'Customer', action: 'CREATE', userId, recordId: id, ip,
      });
      return customerRepo.findById(conn, id);
    });
  },

  async update(id, data, userId, ip) {
    return withTransaction(async (conn) => {
      await customerRepo.findById(conn, id).then((c) => {
        if (!c) throw ApiError.notFound('Customer not found');
      });
      await customerRepo.update(conn, id, data);
      await auditService.log({ module: 'Customer', action: 'UPDATE', userId, recordId: id, ip });
      return customerRepo.findById(conn, id);
    });
  },

  async remove(id, reason, userId, ip) {
    const deleteReason = requireDeleteReason(reason);
    return withTransaction(async (conn) => {
      const customer = await customerRepo.findById(conn, id);
      if (!customer) throw ApiError.notFound('Customer not found');

      const outstanding = await invoiceRepo.outstandingForCustomer(conn, id);
      if (outstanding > 0) {
        throw ApiError.conflict('Cannot delete a customer with an outstanding balance');
      }

      await customerRepo.softDelete(conn, id, { reason: deleteReason, deletedBy: userId });
      await trashRepo.add(conn, {
        entity_type: 'customer',
        entity_id: id,
        entity_label: customer.customer_name || customer.customer_code || `Customer #${id}`,
        delete_reason: deleteReason,
        deleted_by: userId,
      });
      await auditService.log({ module: 'Customer', action: 'DELETE', userId, recordId: id, ip, details: deleteReason });
      return { customer_id: id };
    });
  },

  async statement(id, fromDate, toDate) {
    const customer = await customerRepo.findById(null, id);
    if (!customer) throw ApiError.notFound('Customer not found');
    const [invoices, payments, history] = await Promise.all([
      customerRepo.statementInvoices(null, id),
      customerRepo.statementPayments(null, id),
      customerRepo.transactionHistory(null, id),
    ]);
    const filteredInvoices = fromDate
      ? invoices.filter((i) => !fromDate || i.invoice_date >= fromDate)
      : invoices;
    const filteredHistory = fromDate ? history.filter((t) => t.transaction_date >= fromDate) : history;
    return {
      customer,
      invoices: filteredInvoices,
      payments,
      transactions: filteredHistory,
      totals: {
        invoiced: filteredInvoices.reduce((s, i) => s + Number(i.total_amount), 0),
        paid: filteredInvoices.reduce((s, i) => s + Number(i.paid_amount), 0),
        outstanding: filteredInvoices.reduce((s, i) => s + Number(i.balance), 0),
      },
    };
  },

  async addContact(id, data, userId, ip) {
    const customer = await customerRepo.findById(null, id);
    if (!customer) throw ApiError.notFound('Customer not found');
    const contactId = await customerRepo.addContact(null, id, data);
    await auditService.log({ module: 'Customer', action: 'ADD_CONTACT', userId, recordId: id, ip });
    return customerRepo.contacts(null, id);
  },
};

export default customerService;
