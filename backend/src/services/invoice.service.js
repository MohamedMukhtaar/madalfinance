import invoiceRepo from '../repositories/invoice.repo.js';
import customerRepo from '../repositories/customer.repo.js';
import projectRepo from '../repositories/project.repo.js';
import settingsRepo from '../repositories/settings.repo.js';
import trashRepo from '../repositories/trash.repo.js';
import auditService from './audit.service.js';
import ApiError from '../utils/ApiError.js';
import { INVOICE_STATUS } from '../utils/constants.js';
import { withTransaction, query } from '../config/db.js';
import { generateNumber } from '../helpers/numberGenerator.js';
import { generateInvoicePdf } from '../helpers/pdf.js';
import { deleteStoredFile } from '../helpers/fileHelper.js';
import { requireDeleteReason } from '../helpers/deleteReason.js';

const validStatuses = Object.values(INVOICE_STATUS);

const computeTotals = ({ items, discount = 0, tax = 0 }) => {
  const subtotal = items.reduce((s, it) => s + Number(it.quantity || 1) * Number(it.unit_price || 0), 0);
  const discountN = Number(discount) || 0;
  const taxN = Number(tax) || 0;
  const total = subtotal - discountN + taxN;
  if (total < 0) throw ApiError.badRequest('Invoice total cannot be negative');
  return { subtotal, discount: discountN, tax: taxN, total };
};

export const invoiceService = {
  async list(filters) {
    const rows = await invoiceRepo.list(null, filters);
    const total = await invoiceRepo.count(null, filters);
    return { rows, total };
  },

  async getById(id) {
    const invoice = await invoiceRepo.findById(null, id);
    if (!invoice) throw ApiError.notFound('Invoice not found');
    const [items, attachments, allocations] = await Promise.all([
      invoiceRepo.items(null, id),
      invoiceRepo.attachments(null, id),
      query(
        `SELECT a.*, p.payment_number, p.payment_date
           FROM payment_allocations a JOIN payments p ON p.payment_id = a.payment_id
          WHERE a.invoice_id = ? ORDER BY a.allocation_id`,
        [id]
      ),
    ]);
    const customer = await customerRepo.findById(null, invoice.customer_id);
    return {
      ...invoice,
      customer_name: customer?.customer_name ?? '',
      customer_company: customer?.company_name ?? '',
      items,
      attachments,
      allocations,
    };
  },

  async create(data, userId, ip) {
    return withTransaction(async (conn) => {
      const customer = await customerRepo.findById(conn, data.customer_id);
      if (!customer) throw ApiError.notFound('Customer not found');

      const items = (data.items || []).map((it) => ({
        description: it.description,
        quantity: Number(it.quantity || 1),
        unit_price: Number(it.unit_price || 0),
      }));
      if (!items.length) throw ApiError.badRequest('At least one invoice item is required');

      if (data.project_id) {
        const project = await projectRepo.findById(conn, data.project_id);
        if (!project) throw ApiError.notFound('Project not found');
      }

      const { subtotal, discount, tax, total } = computeTotals({
        items,
        discount: data.discount,
        tax: data.tax,
      });

      const invoice_number = await generateNumber(conn, 'invoices', 'invoice_number', data.prefix || 'INV-');

      const id = await invoiceRepo.create(conn, {
        invoice_number,
        customer_id: data.customer_id,
        project_id: data.project_id ?? null,
        contract_id: data.contract_id ?? null,
        invoice_date: data.invoice_date,
        due_date: data.due_date ?? null,
        subtotal,
        discount,
        tax,
        total_amount: total,
        status: data.status || 'Draft',
        created_by: userId,
      });

      await invoiceRepo.replaceItems(conn, id, items);
      await auditService.log({ module: 'Invoice', action: 'CREATE', userId, recordId: id, ip });
      return invoiceRepo.findById(conn, id);
    });
  },

  async update(id, data, userId, ip) {
    return withTransaction(async (conn) => {
      const invoice = await invoiceRepo.findById(conn, id);
      if (!invoice) throw ApiError.notFound('Invoice not found');
      if (Number(invoice.paid_amount) > 0) {
        throw ApiError.conflict('Cannot edit an invoice that has payments applied');
      }
      if (invoice.status === 'Cancelled') throw ApiError.conflict('Cannot edit a cancelled invoice');

      let updateData = { ...data };
      if (data.items?.length) {
        const items = data.items.map((it) => ({
          description: it.description,
          quantity: Number(it.quantity || 1),
          unit_price: Number(it.unit_price || 0),
        }));
        const { subtotal, discount, tax, total } = computeTotals({ items, discount: data.discount, tax: data.tax });
        await invoiceRepo.replaceItems(conn, id, items);
        updateData = { ...updateData, subtotal, discount, tax, total_amount: total };
      }

      await invoiceRepo.update(conn, id, updateData);
      await auditService.log({ module: 'Invoice', action: 'UPDATE', userId, recordId: id, ip });
      return invoiceRepo.findById(conn, id);
    });
  },

  async setStatus(id, status, userId, ip) {
    if (!validStatuses.includes(status)) throw ApiError.badRequest('Invalid invoice status');
    return withTransaction(async (conn) => {
      const invoice = await invoiceRepo.findById(conn, id);
      if (!invoice) throw ApiError.notFound('Invoice not found');

      if (status === 'Cancelled') {
        if (Number(invoice.paid_amount) > 0) {
          throw ApiError.conflict('Cannot cancel an invoice with payments applied');
        }
      }

      await invoiceRepo.updateStatus(conn, id, status);
      await auditService.log({ module: 'Invoice', action: `SET_STATUS_${status.toUpperCase()}`, userId, recordId: id, ip });
      return invoiceRepo.findById(conn, id);
    });
  },

  async remove(id, reason, userId, ip) {
    const deleteReason = requireDeleteReason(reason);
    return withTransaction(async (conn) => {
      const invoice = await invoiceRepo.findById(conn, id);
      if (!invoice) throw ApiError.notFound('Invoice not found');
      if (Number(invoice.paid_amount) > 0) {
        throw ApiError.conflict('Cannot delete an invoice that has payments');
      }
      await invoiceRepo.softDelete(conn, id, { reason: deleteReason, deletedBy: userId });
      await trashRepo.add(conn, {
        entity_type: 'invoice',
        entity_id: id,
        entity_label: invoice.invoice_number || `Invoice #${id}`,
        delete_reason: deleteReason,
        deleted_by: userId,
      });
      await auditService.log({ module: 'Invoice', action: 'DELETE', userId, recordId: id, ip });
      return { invoice_id: id };
    });
  },

  /** Generate + persist a PDF invoice into the reports directory. */
  async generatePdf(id) {
    const invoice = await invoiceRepo.findById(null, id);
    if (!invoice) throw ApiError.notFound('Invoice not found');

    const [items, customer, settings] = await Promise.all([
      invoiceRepo.items(null, id),
      customerRepo.findById(null, invoice.customer_id),
      settingsRepo.get(null),
    ]);
    invoice.balance = Number(invoice.total_amount) - Number(invoice.paid_amount);
    const { filename, filePath } = await generateInvoicePdf({
      invoice,
      items,
      customer,
      settings,
    });
    return { filename, filePath };
  },

  async addAttachment(id, file, userId, ip) {
    const invoice = await invoiceRepo.findById(null, id);
    if (!invoice) throw ApiError.notFound('Invoice not found');
    await invoiceRepo.addAttachment(null, id, {
      file_name: file.originalname,
      file_path: file.filename,
      file_type: file.mimetype,
      uploaded_by: userId,
    });
    await auditService.log({ module: 'Invoice', action: 'UPLOAD_ATTACHMENT', userId, recordId: id, ip });
    return invoiceRepo.attachments(null, id);
  },

  async deleteAttachment(invoiceId, attachmentId, userId, ip) {
    const attachment = await invoiceRepo.findAttachment(null, attachmentId);
    if (!attachment || attachment.invoice_id !== Number(invoiceId)) {
      throw ApiError.notFound('Attachment not found');
    }
    deleteStoredFile('invoices', attachment.file_path);
    await invoiceRepo.deleteAttachment(null, attachmentId);
    await auditService.log({ module: 'Invoice', action: 'DELETE_ATTACHMENT', userId, recordId: invoiceId, ip });
  },
};

export default invoiceService;
