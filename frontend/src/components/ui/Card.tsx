import type { HTMLAttributes, ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/utils/cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  animated?: boolean;
  children: ReactNode;
}

export function Card({ className, hover, animated = true, children, ...props }: CardProps) {
  const cls = cn(
    "rounded-2xl bg-card ring-1 ring-line shadow-card",
    hover && "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover",
    className
  );

  const motionProps = props as Record<string, unknown>;

  if (!animated) {
    return (
      <div className={cls} {...motionProps}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={cls}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 px-5 pt-5 sm:px-6", className)}>
      <div>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ className, children, ...props }: CardProps) {
  return (
    <div className={cn("p-5 sm:p-6", className)} {...props}>
      {children}
    </div>
  );
}
