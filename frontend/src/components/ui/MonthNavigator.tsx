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

  const label = new Date(value.year, value.month - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  return (
    <div className={cn("inline-flex max-w-full flex-wrap items-center gap-2", className)}>
      <div className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-none bg-panel text-ink-soft ring-1 ring-inset ring-line transition hover:bg-muted hover:text-ink"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[5.5rem] whitespace-nowrap px-1 text-center text-sm font-semibold text-ink sm:min-w-28">
          {label}
        </span>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          disabled={isCurrentOrFuture}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-none bg-panel text-ink-soft ring-1 ring-inset ring-line transition hover:bg-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      {showAmountToggle ? <AmountVisibilityToggle /> : null}
    </div>
  );
}
