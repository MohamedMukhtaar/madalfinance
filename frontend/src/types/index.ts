export interface AppRoleRecord {
  roleId: number;
  roleName: string;
  userCount?: number;
}

export type UserRole = string;

export interface AuditLog {
  logId: number;
  userId?: number | null;
  username?: string | null;
  fullName?: string | null;
  module: string;
  action: string;
  recordId?: number | null;
  ipAddress?: string | null;
  device?: string | null;
  details?: string | null;
  createdAt: string;
}

export interface User {
  userId: number;
  username: string;
  fullName: string;
  role: string;
  phone?: string | null;
  email?: string | null;
  status: "active" | "inactive";
  lastLogin?: string | null;
  createdAt?: string;
  updatedAt?: string;
  /** Derived client-side from username (not sent by the API). */
  avatarColor?: string;
}

export interface Member {
  memberId: number;
  memberCode?: string;
  userId: number;
  memberName: string;
  position: string | null;
  jobTitleId?: number | null;
  phone?: string | null;
  creditBalance?: number;
  joinedDate: string;
  defaultMonthlyDue: number;
  email?: string | null;
  status: "active" | "inactive";
  avatarPath?: string | null;
  avatarName?: string | null;
  avatarUrl?: string | null;
}

export type ChargeStatus = "Pending" | "Partial" | "Paid" | "Cancelled";

export interface Employee {
  employeeId: number;
  employeeCode: string;
  firstName: string;
  lastName?: string | null;
  fullName: string;
  gender?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  branch?: string | null;
  shift?: string | null;
  shiftStart?: string | null;
  shiftEnd?: string | null;
  jobTitleId?: number | null;
  departmentId?: number | null;
  branchId?: number | null;
  shiftId?: number | null;
  hireDate: string;
  basicSalary: number;
  status: "active" | "inactive";
  notes?: string | null;
  createdAt?: string;
}

export type EmployeeOrgKind = "departments" | "titles" | "branches" | "shifts";

export interface EmployeeOrgRecord {
  departmentId?: number;
  jobTitleId?: number;
  branchId?: number;
  shiftId?: number;
  departmentName?: string;
  titleName?: string;
  branchName?: string;
  shiftName?: string;
  startTime?: string | null;
  endTime?: string | null;
  notes?: string | null;
  status: "active" | "inactive";
  employeeCount?: number;
  createdAt?: string;
}

export interface SalaryCharge {
  salaryChargeId: number;
  chargeNumber: string;
  employeeId: number;
  fullName: string;
  employeeCode?: string;
  jobTitle?: string | null;
  department?: string | null;
  chargeDate: string;
  salaryPeriod: string;
  basicSalary: number;
  allowance: number;
  deduction: number;
  netSalary: number;
  paidAmount: number;
  balance: number;
  status: ChargeStatus;
  referenceNumber?: string | null;
  notes?: string | null;
  createdAt?: string;
}

export interface SalaryPayment {
  salaryPaymentId: number;
  paymentNumber: string;
  salaryChargeId: number;
  employeeId: number;
  fullName: string;
  employeeCode?: string;
  chargeNumber?: string;
  salaryPeriod?: string;
  accId: number;
  institution?: string | null;
  number?: string | null;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string | null;
  notes?: string | null;
  status: string;
  createdAt?: string;
}

export interface Customer {
  customerId: number;
  customerCode: string;
  customerName: string;
  companyName?: string | null;
  phone: string;
  email: string;
  address?: string | null;
  city?: string | null;
  notes?: string | null;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt?: string;
  outstandingBalance: number;
  projectCount: number;
}

export type ProjectStatus = "Pending" | "In Progress" | "Completed" | "Cancelled";

export interface ProjectTemplate {
  templateId: number;
  templateName: string;
  projectTypeId: number;
  projectType: string;
  description?: string | null;
  projectPrice: number;
  monthlyAmount: number;
  setupFee: number;
  billingDay: number;
  status: string;
  customerCount?: number;
  logoPath?: string | null;
  logoFileName?: string | null;
}

export interface Project {
  projectId: number;
  customerId: number;
  templateId?: number | null;
  templateName?: string | null;
  projectTypeId?: number;
  projectType: string;
  projectName: string;
  description?: string | null;
  projectPrice: number;
  discount?: number;
  startDate: string;
  createdAt?: string;
  expectedFinish: string | null;
  completedDate?: string | null;
  status: string;
  customerName?: string;
  customerCode?: string;
  outstanding: number;
  paidAmount?: number;
  logoPath?: string | null;
  logoFileName?: string | null;
  attachmentPath?: string | null;
  attachmentFileName?: string | null;
}

export interface Contract {
  contractId: number;
  contractNumber: string;
  customerId: number;
  customerName?: string;
  projectId?: number | null;
  projectName?: string;
  contractDate: string;
  startDate?: string | null;
  endDate?: string | null;
  contractAmount: number;
  remarks?: string | null;
  signedFileName?: string | null;
  status: string;
  createdBy?: number;
  createdAt?: string;
}

export type RentalStatus = "Active" | "Paused" | "Expired";

export interface RentalBilling {
  billingId: number;
  projectId: number;
  projectName: string;
  customerId?: number;
  customerName: string;
  monthlyAmount: number;
  setupFee?: number;
  setupInvoiceId?: number | null;
  setupInvoiceNumber?: string | null;
  setupInvoiceStatus?: string | null;
  setupPaidAmount?: number | null;
  setupTotalAmount?: number | null;
  billingDay: number;
  nextBillingDate: string;
  lastGenerated?: string | null;
  status: string;
}

export type InvoiceStatus = "Draft" | "Issued" | "Partial" | "Paid" | "Cancelled" | "Overdue";

export interface InvoiceItem {
  itemId: number;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface PaymentAllocation {
  allocationId: number;
  paymentId: number;
  paymentNumber: string;
  paymentDate: string;
  amountAllocated: number;
}

export interface Attachment {
  attachmentId: number;
  fileName: string;
  fileType?: string;
  size?: number;
  uploadedAt?: string;
  url?: string;
}

export interface Invoice {
  invoiceId: number;
  invoiceNumber: string;
  customerId: number;
  customerName: string;
  projectId?: number | null;
  projectName?: string;
  firstItemDescription?: string | null;
  contractId?: number | null;
  invoiceDate: string;
  createdAt?: string;
  dueDate: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status: string;
  items: InvoiceItem[];
  attachments: Attachment[];
  allocations?: PaymentAllocation[];
  timeline: InvoiceEvent[];
}

export interface InvoiceEvent {
  id: number;
  title: string;
  description?: string;
  date: string;
  type: "created" | "issued" | "payment" | "reminder" | "attachment" | "cancelled";
}

export type PaymentMethod =
  | "Cash"
  | "Bank"
  | "EVC Plus"
  | "eDahab"
  | "Premier Wallet"
  | "Other";

export interface Payment {
  paymentId: number;
  paymentNumber: string;
  customerId: number;
  customerName: string;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber?: string | null;
  amount: number;
  accId?: number | null;
  accountNumber?: string | null;
  accountInstitution?: string | null;
  notes?: string | null;
  receivedBy?: number;
  receivedByName?: string;
  createdAt?: string;
  allocations?: Array<{
    allocationId: number;
    invoiceId: number;
    invoiceNumber?: string;
    amountAllocated: number;
    totalAmount?: number;
    paidAmount?: number;
  }>;
}

export type DueStatus = "Pending" | "Partial" | "Paid";

/** Row from PostgreSQL statement functions (Date | Time | Type | Reference | Debit | Credit | Loan | Balance). */
export interface StatementRow {
  id?: number;
  name?: string;
  phone?: string | null;
  date: string;
  time: string;
  type: string;
  reference: string;
  debit: number;
  credit: number;
  loan: number;
  due: number;
  paid: number;
  balance: number;
  description?: string;
}

export interface MemberStatementRow extends StatementRow {}

export interface MemberStatement {
  member: {
    memberId: number;
    memberName: string;
    position?: string | null;
    email?: string | null;
    phone?: string | null;
    joinedDate?: string | null;
    loanBalance?: number;
  };
  totals: {
    charged: number;
    loans: number;
    paid: number;
    outstanding: number;
    loanBalance: number;
    closingBalance?: number;
  };
  rows: MemberStatementRow[];
}

export interface CustomerStatement {
  customer: {
    customerId: number;
    customerName: string;
    customerCode?: string;
    companyName?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  totals: {
    invoiced: number;
    paid: number;
    outstanding: number;
    closingBalance?: number;
  };
  rows: StatementRow[];
}

export interface ProjectStatement {
  project: {
    projectId: number;
    projectName: string;
    projectCode?: string;
    status?: string;
  };
  totals: {
    invoiced: number;
    paid: number;
    outstanding: number;
    closingBalance?: number;
  };
  rows: StatementRow[];
}

export interface ExpenseStatement {
  expense: {
    expenseId: number;
    expenseName: string;
    expenseCode?: string;
  };
  totals: {
    charged: number;
    paid: number;
    outstanding: number;
    closingBalance?: number;
  };
  rows: StatementRow[];
}

export interface SalaryStatement {
  employee: {
    employeeId: number;
    employeeCode?: string;
    fullName: string;
    phone?: string | null;
    jobTitle?: string | null;
  };
  totals: {
    charged: number;
    paid: number;
    outstanding: number;
    closingBalance?: number;
  };
  rows: StatementRow[];
}

export interface MemberDue {
  dueId: number;
  batchId: number;
  memberId: number;
  memberName: string;
  amount: number;
  paidAmount: number;
  balance: number;
  status: string;
  paidDate?: string | null;
  position?: string | null;
  attachmentCount?: number;
  creditBalance?: number;
}

export interface DueBatch {
  batchId: number;
  month: number;
  year: number;
  defaultAmount: number;
  generatedDate: string;
  generatedByName?: string;
  totalDues?: number;
  expectedAmount?: number;
  collectedAmount?: number;
  dues: MemberDue[];
}

export interface ExpenseCategory {
  id: number;
  name: string;
}

export interface Account {
  accId: number;
  number: string;
  institution: string;
  balance: number;
  isDefault: boolean;
  createdAt?: string;
}

export interface AccountTransfer {
  transferId: number;
  fromAccId: number;
  toAccId: number;
  amount: number;
  transferDate: string;
  notes?: string | null;
  fromNumber?: string;
  fromInstitution?: string;
  toNumber?: string;
  toInstitution?: string;
  createdByName?: string;
  createdAt?: string;
}

export interface AccountMovement {
  movementDate: string;
  movementType: string;
  amount: number;
  referenceLabel: string;
  description: string;
  /** Cash in (receipt) — increases account balance */
  debit: number;
  /** Cash out (payment) — decreases account balance */
  credit: number;
  loan?: number;
  time?: string;
  balance: number;
}

export interface Expense {
  expenseId: number;
  categoryId: number;
  categoryName: string;
  description: string;
  amount: number;
  accId?: number | null;
  accountNumber?: string | null;
  accountInstitution?: string | null;
  paymentMethod: string;
  referenceNumber?: string | null;
  expenseDate: string;
  paidBy?: string | null;
  notes?: string | null;
  createdByName?: string;
  createdAt?: string;
}

export interface OtherIncome {
  incomeId: number;
  categoryName: string;
  description?: string | null;
  amount: number;
  incomeDate: string;
  accId?: number | null;
  institution?: string | null;
  number?: string | null;
  receivedBy?: number | null;
  notes?: string | null;
}

export type TransactionType = "Income" | "Expense";

export interface LedgerTransaction {
  transactionId: number;
  transactionDate: string;
  transactionType: string;
  referenceType: string | null;
  referenceId: number | null;
  description: string | null;
  income: number;
  expense: number;
  balanceAfter: number;
  createdByName?: string;
  createdAt?: string;
}

export interface AppSettings {
  settingId?: number;
  companyName: string;
  companyPhone: string;
  companyEmail: string;
  companyAddress: string;
  logo?: string | null;
  currency: string;
  defaultMemberDue: number;
  invoicePrefix: string;
  paymentPrefix: string;
  contractPrefix: string;
  timezone: string;
  updatedAt?: string;
}

export interface AppNotification {
  id: number;
  title: string;
  description: string;
  time: string;
  read: boolean;
  type: "info" | "success" | "warning" | "danger";
  link?: string;
}

export interface ChartPoint {
  month: string;
  income: number;
  expense: number;
  profit: number;
}

export interface CashFlowPoint {
  month: string;
  inflow: number;
  outflow: number;
  net: number;
}

export interface DashboardData {
  stats: {
    currentBalance: number;
    monthIncome: number;
    monthExpense: number;
    todayIncome: number;
    weekIncome: number;
    todayExpense: number;
    weekExpense: number;
    totalCustomers: number;
    activeCustomers: number;
    totalProjects: number;
    totalRentalProjects: number;
    totalOneTimeProjects: number;
    activeProjects: number;
    completedProjects: number;
    totalOutstanding: number;
    openInvoices: number;
    overdueInvoices: number;
    totalCollected: number;
    totalDuesBalance: number;
    activeRentals: number;
  };
  invoiceStatusCounts: Array<{ status: string; count: number }>;
  recentTransactions: LedgerTransaction[];
  recentPayments: Payment[];
  recentExpenses: Expense[];
  rentalRenewals: RentalBilling[];
  dueBatches: Array<{
    batchId: number;
    month: number;
    year: number;
    paid: number;
    partial: number;
    pending: number;
  }>;
  chartTransactions?: Array<{
    transactionDate: string;
    income: number;
    expense: number;
    transactionType: string;
  }>;
  period?: {
    year: number;
    month: number;
    from: string;
    to: string;
    chartFrom: string;
  };
}
