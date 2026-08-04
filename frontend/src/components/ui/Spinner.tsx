import { cn } from "@/utils/cn";

export function Spinner({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dims = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-10 w-10" : "h-6 w-6";
  return (
    <svg
      className={cn("animate-spin text-brand-600", dims, className)}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label="Loading"
    >
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
      />
    </svg>
  );
}

export function FullPageLoader({ label }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-brand-500/20" />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 shadow-glow-blue">
          <Spinner className="text-white" size="lg" />
        </div>
      </div>
      {label && <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>}
    </div>
  );
}
