import { cn } from "@/utils/cn";

export function Progress({
  value,
  color,
  className,
  size = "md",
}: {
  value: number;
  color?: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800",
        size === "sm" ? "h-1.5" : "h-2",
        className
      )}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          "h-full rounded-full transition-all duration-700 ease-out",
          color ?? "bg-navy"
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
