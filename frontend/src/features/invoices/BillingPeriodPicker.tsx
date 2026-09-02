import { useMemo } from "react";
import { Select } from "@/components/ui";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
].map((label, i) => ({ value: String(i + 1), label }));

export { MONTHS };

export function BillingPeriodPicker({
  month,
  year,
  onMonthChange,
  onYearChange,
}: {
  month: string;
  year: string;
  onMonthChange: (v: string) => void;
  onYearChange: (v: string) => void;
}) {
  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 16 }, (_, i) => current - 10 + i);
  }, []);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Select
        label="Billing month"
        required
        value={month}
        onChange={(e) => onMonthChange(e.target.value)}
        options={MONTHS}
      />
      <Select
        label="Billing year"
        required
        value={year}
        onChange={(e) => onYearChange(e.target.value)}
        options={years.map((y) => ({ value: String(y), label: String(y) }))}
      />
    </div>
  );
}
