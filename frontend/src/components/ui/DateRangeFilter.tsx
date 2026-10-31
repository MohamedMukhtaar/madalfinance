import { cn } from "@/utils/cn";
import { fieldBase } from "./FormField";

export type DateFilterMode = "all" | "day" | "range";

export interface DateRangeFilterProps {
  mode: DateFilterMode;
  onModeChange: (mode: DateFilterMode) => void;
  date?: string;
  from?: string;
  to?: string;
  onDateChange?: (value: string) => void;
  onFromChange?: (value: string) => void;
  onToChange?: (value: string) => void;
  className?: string;
}

const inputClassName = cn(fieldBase, "h-9 px-2.5");

export function DateRangeFilter({
  mode,
  onModeChange,
  date,
  from,
  to,
  onDateChange,
  onFromChange,
  onToChange,
  className,
}: DateRangeFilterProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <select
        value={mode}
        onChange={(event) => onModeChange(event.target.value as DateFilterMode)}
        className={cn(inputClassName, "font-medium")}
        aria-label="Date filter mode"
      >
        <option value="all">All dates</option>
        <option value="day">Day</option>
        <option value="range">Range</option>
      </select>
      {mode === "day" && (
        <input
          type="date"
          value={date ?? ""}
          onChange={(event) => onDateChange?.(event.target.value)}
          className={inputClassName}
          aria-label="Filter date"
        />
      )}
      {mode === "range" && (
        <>
          <input
            type="date"
            value={from ?? ""}
            onChange={(event) => onFromChange?.(event.target.value)}
            className={inputClassName}
            aria-label="Start date"
          />
          <span className="text-xs font-medium text-slate-400">to</span>
          <input
            type="date"
            value={to ?? ""}
            onChange={(event) => onToChange?.(event.target.value)}
            className={inputClassName}
            aria-label="End date"
          />
        </>
      )}
    </div>
  );
}
