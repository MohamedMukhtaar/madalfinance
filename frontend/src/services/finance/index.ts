import { uploadFile, fileUrl, fetchFileBlob } from "./helpers";
import { authApi } from "./auth";
import { dashboardApi } from "./dashboard";
import { usersApi } from "./users";
import { employeesApi } from "./employees";
import { customersApi } from "./customers";
import { projectsApi } from "./projects";
import { invoicesApi } from "./invoices";
import { accountsApi } from "./accounts";
import { paymentsApi } from "./payments";
import { expensesApi } from "./expenses";
import { incomeApi } from "./income";
import { contributionsApi } from "./contributions";
import { transactionsApi } from "./transactions";
import { reportsApi } from "./reports";
import { settingsApi } from "./settings";
import { tasksApi } from "./tasks";

export type {
  Paged,
  ListParams,
  TrashItem,
  PasswordStep,
  UserDevice,
  ExpenseChargeRecord,
  DeviceOptionsResult,
  LoginResult,
} from "./helpers";
export { toSnakeCase } from "./helpers";

export const financeService = {
  ...authApi,
  ...dashboardApi,
  ...usersApi,
  ...employeesApi,
  ...customersApi,
  ...projectsApi,
  ...invoicesApi,
  ...accountsApi,
  ...paymentsApi,
  ...expensesApi,
  ...incomeApi,
  ...contributionsApi,
  ...transactionsApi,
  ...reportsApi,
  ...settingsApi,
  ...tasksApi,
  upload: uploadFile,
  fileUrl,
  fetchFileBlob,
  companyLogoUrl(filename: string): string {
    return fileUrl("logos", filename);
  },
};

export type FinanceService = typeof financeService;
