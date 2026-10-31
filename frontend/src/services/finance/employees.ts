import { authApi as http } from "../api";
import type { Employee, EmployeeOrgKind, EmployeeOrgRecord, SalaryCharge, SalaryPayment } from "@/types";
import { unwrap, asPaged, toQuery, toSnakeCase, type ListParams, type Paged } from "./helpers";

export const employeesApi = {
  /* ------------------------------ EMPLOYEES / SALARY ------------------------------ */
  async employees(params?: ListParams): Promise<Paged<Employee>> {
    const res = await http.get<Employee[]>("/employees", toQuery(params));
    return asPaged(res);
  },

  async createEmployee(data: {
    firstName: string;
    lastName?: string;
    gender?: string;
    phone?: string;
    email?: string;
    address?: string;
    jobTitle?: string;
    department?: string;
    jobTitleId?: number | null;
    departmentId?: number | null;
    branchId?: number | null;
    shiftId?: number | null;
    hireDate?: string;
    basicSalary?: number;
    notes?: string;
  }): Promise<Employee> {
    const res = await http.post<Employee>("/employees", toSnakeCase(data));
    return unwrap(res);
  },

  async updateEmployee(
    id: number,
    patch: Partial<{
      firstName: string;
      lastName: string;
      gender: string;
      phone: string;
      email: string;
      address: string;
      jobTitle: string;
      department: string;
      jobTitleId: number | null;
      departmentId: number | null;
      branchId: number | null;
      shiftId: number | null;
      hireDate: string;
      basicSalary: number;
      status: string;
      notes: string;
    }>
  ): Promise<Employee> {
    const res = await http.put<Employee>(`/employees/${id}`, toSnakeCase(patch));
    return unwrap(res);
  },

  async deleteEmployee(id: number): Promise<void> {
    await http.delete(`/employees/${id}`);
  },

  async employeeOrg(kind: EmployeeOrgKind): Promise<EmployeeOrgRecord[]> {
    const res = await http.get<EmployeeOrgRecord[]>(`/employees/${kind}`);
    return unwrap(res);
  },

  async createEmployeeOrg(
    kind: EmployeeOrgKind,
    data: { name: string; notes?: string; status?: string; startTime?: string; endTime?: string }
  ): Promise<EmployeeOrgRecord> {
    const res = await http.post<EmployeeOrgRecord>(`/employees/${kind}`, toSnakeCase(data));
    return unwrap(res);
  },

  async updateEmployeeOrg(
    kind: EmployeeOrgKind,
    id: number,
    data: Partial<{ name: string; notes: string; status: string; startTime: string; endTime: string }>
  ): Promise<EmployeeOrgRecord> {
    const res = await http.put<EmployeeOrgRecord>(`/employees/${kind}/${id}`, toSnakeCase(data));
    return unwrap(res);
  },

  async deleteEmployeeOrg(kind: EmployeeOrgKind, id: number): Promise<void> {
    await http.delete(`/employees/${kind}/${id}`);
  },

  async salaryCharges(params?: ListParams): Promise<Paged<SalaryCharge>> {
    const res = await http.get<SalaryCharge[]>("/salary/charges", toQuery(params));
    return asPaged(res);
  },

  async createSalaryCharge(data: {
    employeeId: number;
    year?: number;
    month?: number;
    salaryPeriod?: string;
    basicSalary?: number;
    allowance?: number;
    deduction?: number;
    notes?: string;
  }): Promise<SalaryCharge> {
    const res = await http.post<SalaryCharge>("/salary/charges", toSnakeCase(data));
    return unwrap(res);
  },

  async generateSalaryCharges(data: { year: number; month: number }): Promise<{
    created: number;
    skipped: number;
    period: string;
    charges: SalaryCharge[];
  }> {
    const res = await http.post<{
      created: number;
      skipped: number;
      period: string;
      charges: SalaryCharge[];
    }>("/salary/charges/generate", toSnakeCase(data));
    return unwrap(res);
  },

  async deleteSalaryCharge(id: number): Promise<void> {
    await http.delete(`/salary/charges/${id}`);
  },

  async paySalaryCharge(
    id: number,
    data: {
      amount: number;
      accId?: number;
      paymentMethod?: string;
      paymentDate?: string;
      referenceNumber?: string;
      notes?: string;
    }
  ): Promise<SalaryPayment> {
    const res = await http.post<SalaryPayment>(`/salary/charges/${id}/pay`, toSnakeCase(data));
    return unwrap(res);
  },

  async salaryPayments(params?: ListParams): Promise<Paged<SalaryPayment>> {
    const res = await http.get<SalaryPayment[]>("/salary/payments", toQuery(params));
    return asPaged(res);
  },

};
