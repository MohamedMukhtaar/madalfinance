import { cn } from "@/utils/cn";

export function Switch({
  checked,
  onChange,
  disabled,
  label,
  size = "md",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label?: string;
  size?: "sm" | "md";
}) {
  const dims = size === "sm" ? "h-5 w-9" : "h-6 w-11";
  const knob = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const knobOn = size === "sm" ? "translate-x-[1.15rem]" : "translate-x-[1.35rem]";

  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-2.5", disabled && "cursor-not-allowed opacity-50")}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex shrink-0 items-center rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950",
          dims,
          checked ? "bg-brand-600" : "bg-slate-200 dark:bg-slate-700"
        )}
      >
        <span
          className={cn(
            "inline-block transform rounded-full bg-white shadow transition-transform duration-300",
            knob,
            checked ? knobOn : "translate-x-1"
          )}
        />
      </button>
      {label && <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>}
    </label>
  );
}
