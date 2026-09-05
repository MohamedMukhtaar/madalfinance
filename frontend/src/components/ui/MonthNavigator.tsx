import { ChevronLeft, ChevronRight } from "lucide-react";
import { AmountVisibilityToggle } from "@/context/AmountVisibilityContext";
import { cn } from "@/utils/cn";

export interface MonthValue {
  year: number;
  month: number;
}

export function MonthNavigator({
  value,
  onChange,
  className,
  showAmountToggle = true,
}: {
  value: MonthValue;
  onChange: (next: MonthValue) => void;
  className?: string;
  showAmountToggle?: boolean;
}) {
  const today = new Date();
  const currentMonth = { year: today.getFullYear(), month: today.getMonth() + 1 };
  const isCurrentOrFuture =
    value.year > currentMonth.year ||
    (value.year === currentMonth.year && value.month >= currentMonth.month);

  const changeMonth = (offset: number) => {
    const date = new Date(value.year, value.month - 1 + offset, 1);
    const next = { year: date.getFullYear(), month: date.getMonth() + 1 };
    if (
      next.year < currentMonth.year ||
      (next.year === currentMonth.year && next.month <= currentMonth.month)
    ) {
      onChange(next);
    }
  };

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <div className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 hover:text-slate-900 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-28 text-center text-sm font-semibold text-slate-700 dark:text-slate-200">
          {new Date(value.year, value.month - 1, 1).toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          })}
        </span>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          disabled={isCurrentOrFuture}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      {showAmountToggle ? <AmountVisibilityToggle /> : null}
    </div>
  );
}
