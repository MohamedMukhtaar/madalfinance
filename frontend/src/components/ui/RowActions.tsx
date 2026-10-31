import type { ButtonHTMLAttributes, ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { Tooltip } from "./Tooltip";
import { Dropdown, type DropdownItem } from "./Dropdown";
import { cn } from "@/utils/cn";

export type RowAction = {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  /** Keep in the overflow "More" menu even if under the visible cap. */
  overflow?: boolean;
};

/** DreamPOS bordered square icon button. */
export function ActionIconButton({
  className,
  danger,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-none border border-line bg-panel p-2 text-ink transition",
        "hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/25",
        "disabled:cursor-not-allowed disabled:opacity-40",
        danger &&
          "hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:hover:border-rose-500/40 dark:hover:bg-rose-500/10 dark:hover:text-rose-400",
        className
      )}
      {...props}
    >
      <span className="inline-flex leading-none [&>svg]:h-3.5 [&>svg]:w-3.5">{children}</span>
    </button>
  );
}

/**
 * DreamPOS-style row actions: up to `maxVisible` icons, rest in a ⋯ menu
 * (matches View / Edit / Delete pattern).
 */
export function RowActions({
  actions,
  className,
  maxVisible = 3,
}: {
  actions: RowAction[];
  className?: string;
  maxVisible?: number;
}) {
  const usable = actions.filter((a) => a.label);
  const forcedOverflow = usable.filter((a) => a.overflow);
  const primaryCandidates = usable.filter((a) => !a.overflow);
  const visible = primaryCandidates.slice(0, maxVisible);
  const overflow: RowAction[] = [
    ...primaryCandidates.slice(maxVisible),
    ...forcedOverflow,
  ];

  const menuItems: DropdownItem[] = overflow.map((action) => ({
    label: action.label,
    icon: action.icon,
    danger: action.danger,
    disabled: action.disabled,
    onClick: action.onClick,
  }));

  return (
    <div className={cn("inline-flex items-center justify-center gap-2", className)}>
      {visible.map((action) => (
        <Tooltip key={action.label} content={action.label}>
          <ActionIconButton
            aria-label={action.label}
            title={action.label}
            danger={action.danger}
            disabled={action.disabled}
            onClick={(event) => {
              event.stopPropagation();
              if (action.disabled) return;
              action.onClick();
            }}
          >
            {action.icon}
          </ActionIconButton>
        </Tooltip>
      ))}
      {menuItems.length > 0 && (
        <Dropdown
          align="right"
          width="w-52"
          trigger={
            <ActionIconButton aria-label="More actions" title="More" onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal className="h-3.5 w-3.5" />
            </ActionIconButton>
          }
          items={menuItems}
        />
      )}
    </div>
  );
}
