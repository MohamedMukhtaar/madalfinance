import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

/** Primary / outline use dynamic --brand-primary so Organization brand colors drive the whole app. */
const variantClasses: Record<Variant, string> = {
  primary:
    "bg-[var(--brand-primary)] text-white shadow-md hover:brightness-110 focus-visible:ring-[var(--brand-primary)] active:brightness-95 disabled:hover:brightness-100",
  secondary:
    "bg-card text-ink ring-1 ring-inset ring-line shadow-sm hover:bg-muted focus-visible:ring-[var(--brand-primary)]",
  outline:
    "bg-transparent text-[var(--brand-primary)] ring-1 ring-inset ring-[color-mix(in_srgb,var(--brand-primary)_35%,transparent)] hover:bg-[color-mix(in_srgb,var(--brand-primary)_8%,transparent)] focus-visible:ring-[var(--brand-primary)]",
  ghost:
    "bg-transparent text-ink-muted hover:bg-muted hover:text-ink focus-visible:ring-[var(--brand-primary)]",
  danger:
    "bg-rose-600 text-white shadow-sm hover:bg-rose-700 focus-visible:ring-rose-500 active:bg-rose-800",
  success:
    "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus-visible:ring-emerald-500 active:bg-emerald-800",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-none",
  md: "h-10 px-4 text-sm gap-2 rounded-none",
  lg: "h-11 px-5 text-sm gap-2 rounded-none",
  icon: "h-9 w-9 rounded-none",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", loading, leftIcon, rightIcon, children, disabled, ...props },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex shrink-0 items-center justify-center whitespace-nowrap font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-offset-surface-950",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : leftIcon}
        {children}
        {!loading && rightIcon}
      </button>
    );
  }
);
Button.displayName = "Button";

type MotionButtonProps = ButtonProps & HTMLMotionProps<"button">;

export const MotionButton = forwardRef<HTMLButtonElement, MotionButtonProps>(
  ({ className, variant = "primary", size = "md", loading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileHover={disabled || loading ? undefined : { scale: 1.01 }}
        whileTap={disabled || loading ? undefined : { scale: 0.98 }}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-offset-surface-950",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : leftIcon}
        {children}
        {!loading && rightIcon}
      </motion.button>
    );
  }
);
MotionButton.displayName = "MotionButton";
