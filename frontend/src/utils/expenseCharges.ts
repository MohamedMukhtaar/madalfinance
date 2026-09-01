export interface ExpenseCharge {
  id: string;
  categoryId: number;
  categoryName: string;
  description: string;
  amount: number;
  dueDate: string;
  createdAt: string;
}

const STORAGE_KEY = "madal_expense_charges";

export function loadExpenseCharges(): ExpenseCharge[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ExpenseCharge[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveExpenseCharges(charges: ExpenseCharge[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(charges));
}

export function addExpenseCharge(charge: Omit<ExpenseCharge, "id" | "createdAt">) {
  const charges = loadExpenseCharges();
  const next: ExpenseCharge = {
    ...charge,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  saveExpenseCharges([next, ...charges]);
  return next;
}

export function removeExpenseCharge(id: string) {
  saveExpenseCharges(loadExpenseCharges().filter((c) => c.id !== id));
}
