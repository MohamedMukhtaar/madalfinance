import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAmountVisibility } from "@/context/AmountVisibilityContext";
import { cn } from "@/utils/cn";

/** DreamPOS-style soft icon tones (tinted chip, not solid fill). */
const TONES: Record<string, { icon: string }> = {
  emerald: { icon: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400" },
  teal: { icon: "bg-teal-50 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400" },
  sky: { icon: "bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400" },
  cyan: { icon: "bg-cyan-50 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-400" },
  orange: { icon: "bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400" },
  amber: { icon: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400" },
  rose: { icon: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400" },
  red: { icon: "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400" },
  pink: { icon: "bg-pink-50 text-pink-600 dark:bg-pink-500/15 dark:text-pink-400" },
  violet: { icon: "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400" },
  indigo: { icon: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400" },
  lime: { icon: "bg-lime-50 text-lime-600 dark:bg-lime-500/15 dark:text-lime-400" },
  brand: {
    icon: "bg-[color-mix(in_srgb,var(--brand-primary)_12%,white)] text-[var(--brand-primary)] dark:bg-[color-mix(in_srgb,var(--brand-primary)_28%,transparent)]",
  },
  primary: {
    icon: "bg-[color-mix(in_srgb,var(--brand-primary)_12%,white)] text-[var(--brand-primary)] dark:bg-[color-mix(in_srgb,var(--brand-primary)_28%,transparent)]",
  },
  navy: {
    icon: "bg-[color-mix(in_srgb,var(--brand-primary)_12%,white)] text-[var(--brand-primary)] dark:bg-[color-mix(in_srgb,var(--brand-primary)_28%,transparent)]",
  },
  secondary: {
    icon: "bg-[color-mix(in_srgb,var(--brand-secondary)_18%,white)] text-[var(--brand-secondary)] dark:bg-[color-mix(in_srgb,var(--brand-secondary)_28%,transparent)]",
  },
  slate: { icon: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300" },
};

function toneFromClass(iconClassName?: string) {
  const s = iconClassName ?? "";
  const found = Object.keys(TONES).find((key) => s.includes(key));
  return TONES[found ?? "brand"];
}

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
  const { mask } = useAmountVisibility();
  const tone = toneFromClass(iconClassName);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: index * 0.03, ease: "easeOut" }}
      className="h-full"
    >
      <div
        className={cn(
          "stat-hover flex h-full items-start justify-between bg-card shadow-sm ring-1 ring-line transition-all duration-200",
          compact ? "gap-3 p-3.5" : "gap-3.5 p-4"
        )}
      >
        <div className="min-w-0 flex-1">
          {loading ? (
            <Skeleton className={cn(compact ? "h-6 w-16" : "h-7 w-20")} />
          ) : (
            <p
              className={cn(
                "truncate font-bold tracking-tight text-ink",
                compact ? "text-lg" : "text-xl"
              )}
            >
              {mask(value)}
            </p>
          )}
          <p className={cn("mt-1 font-medium text-ink-muted", compact ? "text-xs" : "text-sm")}>
            {label}
          </p>
          {trend && !loading && (
            <span
              className={cn(
                "mt-1 inline-flex items-center gap-0.5 text-[11px] font-semibold",
                trend.positive ? "text-emerald-600" : "text-rose-600"
              )}
            >
              {trend.positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {mask(trend.value)}
            </span>
          )}
          {children}
        </div>
        <div
          className={cn(
            "stat-hover-icon flex shrink-0 items-center justify-center",
            compact ? "h-9 w-9 [&_svg]:h-4 [&_svg]:w-4" : "h-10 w-10 [&_svg]:h-[18px] [&_svg]:w-[18px]",
            tone.icon
          )}
        >
          {icon}
        </div>
      </div>
    </motion.div>
  );
}
