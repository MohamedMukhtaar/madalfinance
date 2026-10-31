import { useEffect, useRef, type InputHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

/** DreamPOS-style table checkbox — checked state uses system primary color. */
export function TableCheck({
  indeterminate,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { indeterminate?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(indeterminate) && !props.checked;
  }, [indeterminate, props.checked]);

  return (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        "h-4 w-4 shrink-0 cursor-pointer rounded-[4px] border border-line bg-panel text-[var(--brand-primary)]",
        "accent-[var(--brand-primary)] shadow-sm transition",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/30 focus-visible:ring-offset-1 focus-visible:ring-offset-panel",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className
      )}
      onClick={(e) => e.stopPropagation()}
      {...props}
    />
  );
}
