import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/utils/cn";

export const fieldBase =
  "w-full rounded-xl border-0 bg-card px-3.5 text-sm text-ink shadow-sm ring-1 ring-inset ring-line placeholder:text-ink-muted transition focus:outline-none focus:ring-2 focus:ring-navy disabled:opacity-60";

interface FieldWrapperProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function Field({ label, error, hint, required, children, className }: FieldWrapperProps) {
  const id = useId();
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-ink-soft">
          {label}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-400 dark:text-slate-500">{hint}</p>
      ) : null}
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
  ({ className, label, error, hint, required, icon, ...props }, ref) => {
    return (
      <Field label={label} error={error} hint={hint} required={required}>
        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            aria-invalid={!!error}
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
  ({ className, label, error, hint, required, options, children, ...props }, ref) => {
    return (
      <Field label={label} error={error} hint={hint} required={required}>
        <select ref={ref} className={cn(fieldBase, "h-10 cursor-pointer appearance-none pr-9", className)} {...props}>
          {options.map((opt, i) =>
            typeof opt === "string" ? (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ) : (
              <option key={i} value={opt.value}>
                {opt.label}
              </option>
            )
          )}
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-[9px] h-4 w-4 text-slate-400" />
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
  ({ className, label, error, hint, required, ...props }, ref) => {
    return (
      <Field label={label} error={error} hint={hint} required={required}>
        <textarea ref={ref} rows={3} className={cn(fieldBase, "py-2.5", className)} {...props} />
      </Field>
    );
  }
);
Textarea.displayName = "Textarea";
