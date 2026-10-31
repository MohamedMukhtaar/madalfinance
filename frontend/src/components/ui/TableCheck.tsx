import { useEffect, useRef, type InputHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

/** Brand checkbox — primary fill with white check when selected. */
export function TableCheck({
  indeterminate,
  className,
  checked,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { indeterminate?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(indeterminate) && !checked;
  }, [indeterminate, checked]);

  return (
    <span className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center">
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        className={cn(
          "peer h-4 w-4 shrink-0 cursor-pointer appearance-none rounded-[3px] border border-line bg-panel transition",
          "checked:border-[var(--brand-primary)] checked:bg-[var(--brand-primary)]",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/35 focus-visible:ring-offset-1 focus-visible:ring-offset-panel",
          "disabled:cursor-not-allowed disabled:opacity-40",
          className
        )}
        onClick={(e) => e.stopPropagation()}
        {...props}
      />
      <svg
        viewBox="0 0 16 16"
        aria-hidden
        className="pointer-events-none absolute h-3 w-3 text-white opacity-0 peer-checked:opacity-100 peer-indeterminate:opacity-0"
      >
        <path
          fill="currentColor"
          d="M6.4 11.6 3.2 8.4l1.1-1.1 2.1 2.1 5-5.1 1.1 1.1z"
        />
      </svg>
      <span
        aria-hidden
        className="pointer-events-none absolute h-0.5 w-2 rounded-full bg-white opacity-0 peer-indeterminate:opacity-100"
      />
    </span>
  );
}
