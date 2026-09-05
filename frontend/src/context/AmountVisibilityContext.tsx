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

function readStored(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
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
        "inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 hover:text-slate-900 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800 dark:hover:text-white",
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
