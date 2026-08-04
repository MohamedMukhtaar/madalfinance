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
  children,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: "easeOut" }}
    >
      <Card hover className="group relative overflow-hidden p-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {label}
            </p>
            {loading ? (
              <Skeleton className="mt-2.5 h-8 w-28" />
            ) : (
              <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
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
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110",
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
