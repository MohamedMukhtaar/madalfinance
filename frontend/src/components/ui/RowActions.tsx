import type { ReactNode } from "react";
import { Tooltip } from "./Tooltip";
import { cn } from "@/utils/cn";

export type RowAction = {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
};

export function RowActions({ actions }: { actions: RowAction[] }) {
  return (
    <div className="inline-flex items-center justify-end gap-1">
      {actions.map((action) => (
        <Tooltip key={action.label} content={action.label}>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (action.disabled) return;
              action.onClick();
            }}
            disabled={action.disabled}
            aria-label={action.label}
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-lg text-primary transition hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-40 dark:text-secondary-300 dark:hover:bg-secondary-500/15 dark:hover:text-secondary-200",
              action.danger &&
                "text-primary hover:bg-rose-50 hover:text-rose-600 focus:ring-rose-500/40 dark:text-secondary-300 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
            )}
          >
            {action.icon}
          </button>
        </Tooltip>
      ))}
    </div>
  );
}
