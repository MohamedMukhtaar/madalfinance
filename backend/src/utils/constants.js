export const ROLES = Object.freeze({
  SUPER_ADMIN: 'Super Admin',
  FINANCE_ADMIN: 'Finance Admin',
  MEMBER: 'Member',
});

/** Module names used by the audit log. */
export const MODULES = Object.freeze({
  AUTH: 'auth',
  USER: 'user',
  CUSTOMER: 'customer',
  PROJECT: 'project',
  CONTRACT: 'contract',
  INVOICE: 'invoice',
  PAYMENT: 'payment',
  RENTAL: 'rental',
  CONTRIBUTION: 'contribution',
  EXPENSE: 'expense',
  INCOME: 'other income',
  TRANSACTION: 'transaction',
  REPORT: 'report',
  SETTING: 'setting',
});

export const AUDIT_ACTIONS = Object.freeze({
  LOGIN: 'login',
  LOGOUT: 'logout',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  PAYMENT: 'payment',
  EXPENSE: 'expense',
  UPLOAD: 'upload',
  DOWNLOAD: 'download',
  GENERATE: 'generate',
  STATUS: 'status_change',
  USERNAME_CHANGE: 'username_change',
  PASSWORD_CHANGE: 'password_change',
});

export const PROJECT_STATUS = Object.freeze(['Pending', 'In Progress', 'Completed', 'Cancelled']);
export const CONTRACT_STATUS = Object.freeze(['active', 'completed', 'terminated']);
export const INVOICE_STATUS = Object.freeze(['Draft', 'Issued', 'Partial', 'Paid', 'Cancelled', 'Overdue']);
export const PAYMENT_METHODS = Object.freeze(['Cash', 'Bank', 'EVC Plus', 'eDahab', 'Premier Wallet', 'Other']);
export const DUE_STATUS = Object.freeze(['Pending', 'Partial', 'Paid']);
export const RENTAL_STATUS = Object.freeze(['Active', 'Paused', 'Expired']);
export const TRANSACTION_TYPES = Object.freeze(['Income', 'Expense']);

export const REFERENCE_TYPES = Object.freeze({
  PAYMENT: 'Payment',
  EXPENSE: 'Expense',
  OTHER_INCOME: 'Other Income',
  MEMBER_DUE: 'Member Due',
  INVOICE_ADJUSTMENT: 'Invoice Adjustment',
  RENTAL_BILLING: 'Rental Billing',
});

export const CONTRACT_SIGNED_MIMES = Object.freeze([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);

export const RECEIPT_MIMES = Object.freeze([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

/** Zero-pad width used by document number generators. */
export const NUMBER_PAD = 6;
