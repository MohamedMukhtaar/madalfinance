import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

const COLS_CLASS = {
  4: "grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4",
  5: "grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5",
} as const;

export function StatCardsGrid({
  children,
  className,
  cols = 4,
}: {
  children: ReactNode;
  className?: string;
  cols?: 4 | 5;
}) {
  return <div className={cn(COLS_CLASS[cols], className)}>{children}</div>;
}
