import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/utils/cn";

/**
 * DreamPOS form control base — thin border, soft radius, brand focus ring.
 * Shared by Input / Select / Textarea and any raw fields that import it.
 */
export const fieldBase = cn(
  "w-full rounded-none border border-line bg-panel px-3 text-sm text-ink",
  "placeholder:text-ink-muted transition",
  "focus:outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]",
  "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70",
  "aria-[invalid=true]:border-rose-400 aria-[invalid=true]:focus:border-rose-500 aria-[invalid=true]:focus:ring-rose-400"
);

interface FieldWrapperProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}

export function Field({ label, error, hint, required, children, className, htmlFor }: FieldWrapperProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label htmlFor={htmlFor} className="mb-0 block text-sm font-medium text-ink">
          {label}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>
      ) : hint ? (
        <p className="text-xs text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}

/** DreamPOS-style section header inside modals / cards */
export function FormSection({
  title,
  subtitle,
  icon,
  className,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5 border-b border-line pb-3", className)}>
      {icon && (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-[color-mix(in_srgb,var(--brand-primary)_12%,white)] text-[var(--brand-primary)] [&_svg]:h-4 [&_svg]:w-4">
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <p className="text-sm font-bold text-ink">{title}</p>
        {subtitle && <p className="text-[11px] text-ink-muted">{subtitle}</p>}
      </div>
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, required, icon, id: idProp, ...props }, ref) => {
    const autoId = useId();
    const id = idProp ?? autoId;
    return (
      <Field label={label} error={error} hint={hint} required={required} htmlFor={id}>
        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-ink-muted">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={id}
            aria-invalid={error ? true : undefined}
            className={cn(fieldBase, "h-10", icon && "pl-10", className)}
            {...props}
          />
        </div>
      </Field>
    );
  }
);
Input.displayName = "Input";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[] | string[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, required, options, children, id: idProp, ...props }, ref) => {
    const autoId = useId();
    const id = idProp ?? autoId;
    return (
      <Field label={label} error={error} hint={hint} required={required} htmlFor={id}>
        <div className="relative">
          <select
            ref={ref}
            id={id}
            aria-invalid={error ? true : undefined}
            className={cn(fieldBase, "h-10 cursor-pointer appearance-none pr-9", className)}
            {...props}
          >
            {options.map((opt, i) =>
              typeof opt === "string" ? (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ) : (
                <option key={`${opt.value}-${i}`} value={opt.value}>
                  {opt.label}
                </option>
              )
            )}
            {children}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
        </div>
      </Field>
    );
  }
);
Select.displayName = "Select";

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, required, id: idProp, ...props }, ref) => {
    const autoId = useId();
    const id = idProp ?? autoId;
    return (
      <Field label={label} error={error} hint={hint} required={required} htmlFor={id}>
        <textarea
          ref={ref}
          id={id}
          rows={3}
          aria-invalid={error ? true : undefined}
          className={cn(fieldBase, "min-h-[88px] py-2.5", className)}
          {...props}
        />
      </Field>
    );
  }
);
Textarea.displayName = "Textarea";

export interface MultiSelectProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  options: { value: string; label: string }[];
  value: string[];
  onChange: (next: string[]) => void;
  className?: string;
  emptyText?: string;
}

/** Checkbox list for picking multiple values (DreamPOS square controls). */
export function MultiSelect({
  label,
  error,
  hint,
  required,
  options,
  value,
  onChange,
  className,
  emptyText = "No options",
}: MultiSelectProps) {
  const selected = new Set(value);
  const toggle = (v: string) => {
    if (selected.has(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
  };

  return (
    <Field label={label} error={error} hint={hint} required={required} className={className}>
      <div
        className={cn(
          fieldBase,
          "max-h-40 space-y-0.5 overflow-y-auto py-1.5",
          error && "border-rose-400"
        )}
        role="group"
        aria-invalid={error ? true : undefined}
      >
        {options.length === 0 ? (
          <p className="px-2 py-1.5 text-xs text-ink-muted">{emptyText}</p>
        ) : (
          options.map((opt) => {
            const checked = selected.has(opt.value);
            return (
              <label
                key={opt.value}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 px-2.5 py-1.5 text-sm text-ink hover:bg-muted",
                  checked && "bg-[color-mix(in_srgb,var(--brand-primary)_8%,transparent)]"
                )}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 shrink-0 rounded-none border-line accent-[var(--brand-primary)]"
                  checked={checked}
                  onChange={() => toggle(opt.value)}
                />
                <span className="min-w-0 truncate">{opt.label}</span>
              </label>
            );
          })
        )}
      </div>
      {value.length > 0 && (
        <p className="text-[11px] text-ink-muted">{value.length} selected</p>
      )}
    </Field>
  );
}
