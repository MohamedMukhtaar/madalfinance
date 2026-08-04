import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <label className="inline-flex cursor-pointer items-center gap-2.5 select-none">
        <input
          ref={ref}
          type="checkbox"
          className={cn(
            "h-4 w-4 rounded border-line text-navy shadow-sm accent-navy transition focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-app",
            className
          )}
          {...props}
        />
        {label && (
          <span className="text-sm text-ink-soft">{label}</span>
        )}
      </label>
    );
  }
);
Checkbox.displayName = "Checkbox";
