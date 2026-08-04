import { initials } from "@/utils/format";
import { cn } from "@/utils/cn";

const palette = ["#2563eb", "#8b5cf6", "#06b6d4", "#22c55e", "#f59e0b", "#ec4899", "#ef4444", "#14b8a6"];

export function Avatar({
  name,
  color,
  size = "md",
  src,
  className,
}: {
  name: string;
  color?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  src?: string | null;
  className?: string;
}) {
  const dims = {
    xs: "h-6 w-6 text-[9px]",
    sm: "h-8 w-8 text-[10px]",
    md: "h-9 w-9 text-xs",
    lg: "h-11 w-11 text-sm",
    xl: "h-16 w-16 text-lg",
  }[size];

  const hash = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const bg = color ?? palette[hash % palette.length];

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn("inline-flex shrink-0 rounded-full object-cover ring-2 ring-white/80", dims, className)}
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold text-white",
        dims,
        className
      )}
      style={{ backgroundColor: bg }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
