import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  FileText,
  CreditCard,
  UsersRound,
  Receipt,
  ArrowLeftRight,
  BarChart3,
  Settings,
  Wallet,
  Landmark,
  Briefcase,
  ClipboardList,
} from "lucide-react";

export interface NavChild {
  label: string;
  path: string;
  icon?: LucideIcon;
  badgeKey?: string;
  permissions?: string[];
}

export interface NavItem {
  label: string;
  path?: string;
  icon: LucideIcon;
  children?: NavChild[];
  badgeKey?: string;
  /** @deprecated Prefer permissions */
  superAdminOnly?: boolean;
  permissions?: string[];
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard, permissions: ["view dashboard"] },
  {
    label: "Members",
    icon: UsersRound,
    permissions: ["view members", "view contributions"],
    children: [
      { label: "Members", path: "/members", icon: UsersRound, permissions: ["view members"] },
      { label: "Contributions", path: "/contributions", icon: Receipt, permissions: ["view contributions"] },
    ],
  },
  {
    label: "Customers",
    icon: Users,
    badgeKey: "customers",
    permissions: ["view customers", "view invoices"],
    children: [
      { label: "Customers", path: "/customers", icon: Users, badgeKey: "customers", permissions: ["view customers"] },
      { label: "Invoices", path: "/invoices", icon: FileText, badgeKey: "invoices", permissions: ["view invoices"] },
    ],
  },
  { label: "Projects", path: "/projects", icon: FolderKanban, badgeKey: "projects", permissions: ["view projects"] },
  { label: "Payments", path: "/payments", icon: CreditCard, permissions: ["view payments"] },
  { label: "Accounts", path: "/accounts", icon: Landmark, permissions: ["view accounts"] },
  { label: "Employees", path: "/employees", icon: Briefcase, permissions: ["view employees", "view salary"] },
  {
    label: "Tasks",
    path: "/tasks",
    icon: ClipboardList,
    permissions: ["view tasks", "create tasks", "edit tasks", "delete tasks"],
  },
  { label: "Expenses", path: "/expenses", icon: Wallet, permissions: ["view expenses"] },
  { label: "Transactions", path: "/transactions", icon: ArrowLeftRight, permissions: ["view transactions"] },
  { label: "Reports", path: "/reports", icon: BarChart3, permissions: ["view reports"] },
  {
    label: "Settings",
    path: "/settings",
    icon: Settings,
    permissions: [
      "view organizations",
      "edit organizations",
      "manage settings",
      "view roles",
      "view users",
      "view logs",
      "view trash items",
      "view dashboard",
    ],
  },
];

export const PAYMENT_METHODS = [
  "Cash",
  "Bank",
  "EVC Plus",
  "eDahab",
  "Premier Wallet",
  "Other",
] as const;

export const EXPENSE_CATEGORY_COLORS: Record<string, string> = {
  Hosting: "#74bcf8",
  Domain: "#4aa6ef",
  Internet: "#8ecaf9",
  Transport: "#f59e0b",
  Marketing: "#ec4899",
  Office: "#10b981",
  Software: "#101848",
  Equipment: "#f97316",
  Salary: "#22c55e",
  Utilities: "#14b8a6",
  Other: "#64748b",
};

export const PROJECT_STATUS_STYLES: Record<
  string,
  { badge: string; dot: string; bar: string }
> = {
  Pending: {
    badge: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
  },
  "In Progress": {
    badge: "bg-secondary-50 text-primary ring-secondary-200 dark:bg-secondary-500/10 dark:text-secondary-300 dark:ring-secondary-500/30",
    dot: "bg-secondary-400",
    bar: "bg-secondary-400",
  },
  Completed: {
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
  },
  Cancelled: {
    badge: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30",
    dot: "bg-rose-500",
    bar: "bg-rose-500",
  },
};

export const CUSTOMER_STATUS_STYLES: Record<string, string> = {
  active:
    "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
  inactive:
    "bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:ring-slate-500/30",
};

export const INVOICE_STATUS_STYLES: Record<string, string> = {
  Draft:
    "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-500/30",
  Issued:
    "bg-secondary-50 text-primary ring-secondary-200 dark:bg-secondary-500/10 dark:text-secondary-300 dark:ring-secondary-500/30",
  Partial:
    "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30",
  Paid: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
  Cancelled:
    "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30",
  Overdue:
    "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30",
};

export const DUE_STATUS_STYLES: Record<string, string> = {
  Paid: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
  Partial:
    "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30",
  Pending:
    "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-500/30",
};

export const RENTAL_STATUS_STYLES: Record<string, string> = {
  Active:
    "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
  Paused:
    "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30",
  Expired:
    "bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:ring-slate-500/30",
};

export const PAYMENT_STATUS_STYLES: Record<string, string> = {
  Completed:
    "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
  Voided:
    "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30",
};
