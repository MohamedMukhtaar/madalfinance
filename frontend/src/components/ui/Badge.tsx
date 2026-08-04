import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

export interface BadgeProps {
  children: ReactNode;
  className?: string;
  dot?: boolean;
  dotClassName?: string;
}

export function Badge({ children, className, dot, dotClassName }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        className
      )}
    >
      {dot && (
        <span className={cn("h-1.5 w-1.5 rounded-full", dotClassName ?? "bg-current opacity-80")} />
      )}
      {children}
    </span>
  );
}

export function StatusBadge({ status, styles, ...props }: BadgeProps & { status: string; styles?: Record<string, string> }) {
  const s = status as string;
  return (
    <Badge {...props} className={cn(styles?.[s], props.className)}>
      {s}
    </Badge>
  );
}
