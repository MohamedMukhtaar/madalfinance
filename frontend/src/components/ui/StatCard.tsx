import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAmountVisibility } from "@/context/AmountVisibilityContext";
import { cn } from "@/utils/cn";

const TONES: Record<string, { label: string; box: string }> = {
  emerald: { label: "text-emerald-600", box: "bg-emerald-600" },
  teal: { label: "text-teal-600", box: "bg-teal-600" },
  sky: { label: "text-sky-600", box: "bg-sky-500" },
  cyan: { label: "text-cyan-600", box: "bg-cyan-600" },
  orange: { label: "text-orange-600", box: "bg-orange-500" },
  amber: { label: "text-amber-600", box: "bg-amber-500" },
  rose: { label: "text-rose-600", box: "bg-rose-500" },
  red: { label: "text-red-600", box: "bg-red-500" },
  pink: { label: "text-pink-600", box: "bg-pink-500" },
  violet: { label: "text-violet-600", box: "bg-violet-600" },
  indigo: { label: "text-indigo-600", box: "bg-indigo-600" },
  lime: { label: "text-lime-600", box: "bg-lime-500" },
  brand: { label: "text-primary", box: "bg-primary" },
  primary: { label: "text-primary", box: "bg-primary" },
  navy: { label: "text-primary", box: "bg-primary" },
  secondary: { label: "text-sky-600", box: "bg-sky-500" },
  slate: { label: "text-slate-600", box: "bg-slate-600" },
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
  hint?: string;
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
  hint,
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: "easeOut" }}
      className="h-full"
    >
      <div
        className={cn(
          "stat-hover flex h-full items-center justify-between rounded-2xl bg-card shadow-sm ring-1 ring-line transition-all duration-200",
          compact ? "gap-2 px-3 py-2.5" : "gap-3 px-3.5 py-3"
        )}
      >
        <div className="min-w-0">
          <p className={cn("font-semibold", tone.label, compact ? "text-[11px] leading-tight" : "text-xs")}>
            {label}
          </p>
          {loading ? (
            <Skeleton className={cn(compact ? "mt-1 h-5 w-14" : "mt-1 h-6 w-20")} />
          ) : (
            <p
              className={cn(
                "truncate font-bold tracking-tight text-ink",
                compact ? "mt-0.5 text-base" : "mt-0.5 text-lg"
              )}
            >
              {mask(value)}
            </p>
          )}
          {(hint || trend) && !loading && (
            <p className="mt-0.5 truncate text-[11px] text-slate-400">
              {hint}
              {trend && (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 font-semibold",
                    hint ? "ml-1.5" : "",
                    trend.positive ? "text-emerald-600" : "text-rose-600"
                  )}
                >
                  {trend.positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {mask(trend.value)}
                </span>
              )}
            </p>
          )}
          {children}
        </div>
        <div
          className={cn(
            "stat-hover-icon flex shrink-0 items-center justify-center rounded-xl text-white",
            compact ? "h-8 w-8 [&_svg]:h-4 [&_svg]:w-4" : "h-10 w-10 [&_svg]:h-[18px] [&_svg]:w-[18px]",
            tone.box
          )}
        >
          {icon}
        </div>
      </div>
    </motion.div>
  );
}
