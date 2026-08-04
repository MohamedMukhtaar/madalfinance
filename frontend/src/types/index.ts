export type UserRole = "Super Admin" | "Finance Admin" | "Member";

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
  userId: number;
  memberName: string;
  position: string | null;
  joinedDate: string;
  defaultMonthlyDue: number;
  email?: string | null;
  status: "active" | "inactive";
  avatarPath?: string | null;
  avatarName?: string | null;
  avatarUrl?: string | null;
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

export interface Project {
  projectId: number;
  customerId: number;
  projectTypeId?: number;
  projectType: string;
  projectName: string;
  description?: string | null;
  projectPrice: number;
  startDate: string;
  createdAt?: string;
  expectedFinish: string | null;
  completedDate?: string | null;
  status: string;
  customerName?: string;
  customerCode?: string;
  outstanding: number;
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
  notes?: string | null;
  receivedBy?: number;
  receivedByName?: string;
  createdAt?: string;
  allocations?: Array<{ allocationId: number; invoiceId: number; amountAllocated: number }>;
}

export type DueStatus = "Pending" | "Partial" | "Paid";

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

export interface Expense {
  expenseId: number;
  categoryId: number;
  categoryName: string;
  description: string;
  amount: number;
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
  categoryId: number;
  categoryName: string;
  description: string;
  amount: number;
  incomeDate: string;
  receivedBy?: string | null;
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
    totalCustomers: number;
    activeCustomers: number;
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
