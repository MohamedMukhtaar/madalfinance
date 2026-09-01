import { useEffect, useState } from "react";
import { cn } from "@/utils/cn";
import { useTheme } from "@/context/ThemeContext";
import { useSettings } from "@/context/SettingsContext";
import { financeService } from "@/services/finance";
import logo from "@/assets/madal-logo.png";
import logoDark from "@/assets/madal-logo-dark.png";
import mark from "@/assets/madal-mark.png";
import markDark from "@/assets/madal-mark-dark.png";

function useCompanyLogoSrc(filename?: string | null) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!filename) {
      setSrc(null);
      return;
    }
    let active = true;
    let objectUrl: string | null = null;
    financeService
      .fetchFileBlob("logos", filename, { inline: true })
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (active) setSrc(null);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [filename]);

  return src;
}

export function LogoMark({ className, onDark }: { className?: string; onDark?: boolean }) {
  const { resolvedTheme } = useTheme();
  const { settings } = useSettings();
  const customSrc = useCompanyLogoSrc(settings?.logo);
  const dark = onDark || resolvedTheme === "dark";

  return (
    <span
      className={cn(
        "relative inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-transparent",
        className
      )}
    >
      <img
        src={customSrc ?? (dark ? markDark : mark)}
        alt=""
        className="h-full w-full object-contain"
      />
    </span>
  );
}

export function Logo({
  compact = false,
  wide = false,
  onDark = false,
  className,
}: {
  compact?: boolean;
  wide?: boolean;
  onDark?: boolean;
  className?: string;
}) {
  const { resolvedTheme } = useTheme();
  const { settings } = useSettings();
  const customSrc = useCompanyLogoSrc(settings?.logo);
  const dark = onDark || resolvedTheme === "dark";

  if (compact) {
    return <LogoMark className={cn("h-9 w-9", className)} onDark={onDark} />;
  }

  if (customSrc) {
    return (
      <div className={cn("flex items-center", className)}>
        <img
          src={customSrc}
          alt={settings?.companyName ?? "Company logo"}
          className={cn(
            "h-9 max-w-full origin-left object-contain object-left",
            wide ? "w-[18rem]" : "w-[15rem]"
          )}
        />
      </div>
    );
  }

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
