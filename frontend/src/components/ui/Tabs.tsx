import { motion } from "framer-motion";
import { cn } from "@/utils/cn";

export interface TabItem {
  label: string;
  value: string;
  icon?: React.ReactNode;
  count?: number;
}

export function Tabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: TabItem[];
  active: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-2xl bg-slate-100 p-1 ring-1 ring-inset ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800",
        className
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const selected = active === tab.value;
        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.value)}
            className={cn(
              "relative inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors",
              selected
                ? "text-slate-900 dark:text-white"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            )}
          >
            {selected && (
              <motion.span
                layoutId="tab-pill"
                className="absolute inset-0 rounded-xl bg-white shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-800 dark:ring-slate-700"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-2">
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                    selected
                      ? "bg-brand-600 text-white"
                      : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                  )}
                >
                  {tab.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
