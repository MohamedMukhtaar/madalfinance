import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/utils/cn";

const STORAGE_KEY = "madal_show_amounts";
export const AMOUNT_MASK = "....";

/** Amounts visible by default; "0" in storage means user hid them. */
function readStored(): boolean {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === null) return true;
    return v !== "0";
  } catch {
    return true;
  }
}

interface AmountVisibilityContextValue {
  visible: boolean;
  toggle: () => void;
  mask: (value: string) => string;
}

const AmountVisibilityContext = createContext<AmountVisibilityContextValue | null>(null);

export function AmountVisibilityProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(readStored);

  const toggle = useCallback(() => {
    setVisible((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore quota / private mode */
      }
      return next;
    });
  }, []);

  const mask = useCallback((value: string) => (visible ? value : AMOUNT_MASK), [visible]);

  const value = useMemo(() => ({ visible, toggle, mask }), [visible, toggle, mask]);

  return <AmountVisibilityContext.Provider value={value}>{children}</AmountVisibilityContext.Provider>;
}

export function useAmountVisibility() {
  const ctx = useContext(AmountVisibilityContext);
  if (!ctx) {
    return {
      visible: true,
      toggle: () => undefined,
      mask: (value: string) => value,
    };
  }
  return ctx;
}

export function AmountVisibilityToggle({ className }: { className?: string }) {
  const { visible, toggle } = useAmountVisibility();
  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-none border border-line bg-panel px-3 text-sm font-semibold text-ink transition hover:bg-muted",
        className
      )}
      aria-pressed={!visible}
      aria-label={visible ? "Hide amounts" : "Show amounts"}
    >
      {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      {visible ? "Hide" : "Show"}
    </button>
  );
}
