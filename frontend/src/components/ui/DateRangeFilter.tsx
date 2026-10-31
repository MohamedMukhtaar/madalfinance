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

const inputClassName = cn(fieldBase, "h-9 min-w-0 shrink-0 px-2.5");

/** Always keeps mode + date controls on one horizontal line. */
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
    <div className={cn("inline-flex flex-nowrap items-center gap-2", className)}>
      <select
        value={mode}
        onChange={(event) => onModeChange(event.target.value as DateFilterMode)}
        className={cn(inputClassName, "w-auto min-w-[7.5rem] font-medium")}
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
          className={cn(inputClassName, "w-auto")}
          aria-label="Filter date"
        />
      )}
      {mode === "range" && (
        <>
          <input
            type="date"
            value={from ?? ""}
            onChange={(event) => onFromChange?.(event.target.value)}
            className={cn(inputClassName, "w-auto")}
            aria-label="Start date"
          />
          <span className="shrink-0 text-xs font-medium text-ink-muted">to</span>
          <input
            type="date"
            value={to ?? ""}
            onChange={(event) => onToChange?.(event.target.value)}
            className={cn(inputClassName, "w-auto")}
            aria-label="End date"
          />
        </>
      )}
    </div>
  );
}
