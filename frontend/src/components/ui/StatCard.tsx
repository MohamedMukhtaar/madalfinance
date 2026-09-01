import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/utils/cn";

export interface StatCardProps {
  label: string;
  value: string;
  icon: ReactNode;
  iconClassName?: string;
  trend?: { value: string; positive: boolean };
  loading?: boolean;
  index?: number;
  compact?: boolean;
  children?: ReactNode;
}

export function StatCard({
  label,
  value,
  icon,
  iconClassName,
  trend,
  loading,
  index = 0,
  compact = false,
  children,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: "easeOut" }}
    >
      <Card hover className={cn("group relative overflow-hidden", compact ? "p-2.5" : "p-3.5")}>
        <div className={cn("flex items-start justify-between", compact ? "gap-2" : "gap-3")}>
          <div className="min-w-0">
            <p
              className={cn(
                "font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500",
                compact ? "text-[10px] leading-tight" : "text-[11px]"
              )}
            >
              {label}
            </p>
            {loading ? (
              <Skeleton className={cn(compact ? "mt-1 h-5 w-16" : "mt-1.5 h-6 w-24")} />
            ) : (
              <p
                className={cn(
                  "font-bold tracking-tight text-slate-900 dark:text-white",
                  compact ? "mt-0.5 truncate text-sm" : "mt-1 text-lg"
                )}
              >
                {value}
              </p>
            )}
            {trend && !loading && (
              <span
                className={cn(
                  "mt-2 inline-flex items-center gap-1 text-xs font-semibold",
                  trend.positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                )}
              >
                {trend.positive ? (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                )}
                {trend.value}
              </span>
            )}
          </div>
          <div
            className={cn(
              "flex shrink-0 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-105",
              compact ? "h-7 w-7 [&_svg]:h-3.5 [&_svg]:w-3.5" : "h-9 w-9 [&_svg]:h-4 [&_svg]:w-4",
              iconClassName ?? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
            )}
          >
            {icon}
          </div>
        </div>
        {children}
      </Card>
    </motion.div>
  );
}
