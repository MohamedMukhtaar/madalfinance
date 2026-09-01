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
    <div className={cn("border-b border-slate-200 dark:border-slate-800", className)} role="tablist">
      <div className="-mb-px flex gap-0 overflow-x-auto scrollbar-thin">
        {tabs.map((tab) => {
          const selected = active === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(tab.value)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
                selected
                  ? "border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-200"
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                    selected
                      ? "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
