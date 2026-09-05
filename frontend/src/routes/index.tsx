import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { PageLoader } from "@/components/PageLoader";
import { ProtectedRoute, PublicOnlyRoute, SuperAdminRoute } from "./ProtectedRoute";

const withLoader = (Component: React.LazyExoticComponent<React.ComponentType>) => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
);

const LoginPage = lazy(() => import("@/pages/LoginPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const MembersPage = lazy(() => import("@/pages/MembersPage"));
const UsersPage = lazy(() => import("@/pages/UsersPage"));
const CustomersPage = lazy(() => import("@/pages/CustomersPage"));
const CustomerDetailPage = lazy(() => import("@/pages/CustomerDetailPage"));
const ProjectsPage = lazy(() => import("@/pages/ProjectsPage"));
const InvoicesPage = lazy(() => import("@/pages/InvoicesPage"));
const PaymentsPage = lazy(() => import("@/pages/PaymentsPage"));
const IncomePage = lazy(() => import("@/pages/IncomePage"));
const ContributionsPage = lazy(() => import("@/pages/ContributionsPage"));
const AccountsPage = lazy(() => import("@/pages/AccountsPage"));
const ExpenseChargesPage = lazy(() => import("@/pages/ExpenseChargesPage"));
const ExpensesPage = lazy(() => import("@/pages/ExpensesPage"));
const ExpenseCategoriesPage = lazy(() => import("@/pages/ExpenseCategoriesPage"));
const EmployeesPage = lazy(() => import("@/pages/EmployeesPage"));
const SalaryChargesPage = lazy(() => import("@/pages/SalaryChargesPage"));
const SalaryPaymentsPage = lazy(() => import("@/pages/SalaryPaymentsPage"));
const TransactionsPage = lazy(() => import("@/pages/TransactionsPage"));
const ReportsPage = lazy(() => import("@/pages/ReportsPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const LogsPage = lazy(() => import("@/pages/LogsPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

export const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <PublicOnlyRoute>
        <AuthLayout>
          <LoginPage />
        </AuthLayout>
      </PublicOnlyRoute>
    ),
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: withLoader(DashboardPage) },
      { path: "members", element: withLoader(MembersPage) },
      { path: "contributions", element: withLoader(ContributionsPage) },
      { path: "customers", element: withLoader(CustomersPage) },
      { path: "customers/:id", element: withLoader(CustomerDetailPage) },
      { path: "projects", element: withLoader(ProjectsPage) },
      { path: "projects/customers", element: withLoader(ProjectsPage) },
      { path: "projects/one-time", element: <Navigate to="/projects/customers" replace /> },
      { path: "projects/rental", element: <Navigate to="/projects/customers" replace /> },
      { path: "rentals", element: <Navigate to="/projects/customers" replace /> },
      { path: "invoices", element: withLoader(InvoicesPage) },
      { path: "invoices/:id", element: <Navigate to="/invoices" replace /> },
      { path: "payments", element: withLoader(PaymentsPage) },
      { path: "income", element: withLoader(IncomePage) },
      { path: "accounts", element: withLoader(AccountsPage) },
      { path: "accounts/:tab", element: withLoader(AccountsPage) },
      { path: "employees", element: withLoader(EmployeesPage) },
      { path: "employees/charges", element: withLoader(SalaryChargesPage) },
      { path: "employees/payments", element: withLoader(SalaryPaymentsPage) },
      { path: "employees/:tab", element: withLoader(EmployeesPage) },
      { path: "salary/charges", element: <Navigate to="/employees/charges" replace /> },
      { path: "salary/payments", element: <Navigate to="/employees/payments" replace /> },
      { path: "expenses/categories", element: withLoader(ExpenseCategoriesPage) },
      { path: "expenses/charges", element: withLoader(ExpenseChargesPage) },
      { path: "expenses", element: withLoader(ExpensesPage) },
      { path: "transactions", element: withLoader(TransactionsPage) },
      { path: "reports", element: <Navigate to="/reports/customers" replace /> },
      { path: "reports/:view", element: withLoader(ReportsPage) },
      { path: "settings", element: withLoader(SettingsPage) },
      { path: "users", element: <SuperAdminRoute>{withLoader(UsersPage)}</SuperAdminRoute> },
      { path: "logs", element: <SuperAdminRoute>{withLoader(LogsPage)}</SuperAdminRoute> },
      { path: "logs/:tab", element: <SuperAdminRoute>{withLoader(LogsPage)}</SuperAdminRoute> },
      { path: "audit-logs", element: <Navigate to="/logs" replace /> },
      { path: "trash", element: <Navigate to="/logs/trash" replace /> },
      { path: "logout", element: <Navigate to="/login" replace /> },
      { path: "*", element: withLoader(NotFoundPage) },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
