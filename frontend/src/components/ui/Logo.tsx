import { cn } from "@/utils/cn";
import { useTheme } from "@/context/ThemeContext";
import logo from "@/assets/madal-logo.png";
import logoDark from "@/assets/madal-logo-dark.png";
import mark from "@/assets/madal-mark.png";
import markDark from "@/assets/madal-mark-dark.png";

export function LogoMark({ className }: { className?: string }) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  return (
    <span
      className={cn(
        "relative inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-transparent",
        className
      )}
    >
      <img src={dark ? markDark : mark} alt="" className="h-full w-full object-contain" />
    </span>
  );
}

export function Logo({
  compact = false,
  wide = false,
  className,
}: {
  compact?: boolean;
  /** Wider display for login (same height, more horizontal presence). */
  wide?: boolean;
  className?: string;
}) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  if (compact) {
    return <LogoMark className={cn("h-9 w-9", className)} />;
  }

  // Fixed height; wider horizontal presence without growing taller.
  return (
    <div className={cn("flex items-center", className)}>
      <img
        src={dark ? logoDark : logo}
        alt="Madal ICT Solutions"
        className={cn(
          "h-9 max-w-full origin-left object-contain object-left drop-shadow-[0_1px_2px_rgba(16,24,72,0.12)]",
          wide ? "w-[18rem] scale-x-[1.28]" : "w-[15rem] scale-x-[1.15]"
        )}
      />
    </div>
  );
}
