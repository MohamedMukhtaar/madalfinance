import { useEffect, useRef, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Info, Lock, LogOut, Unlock } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/services/api";

/** Full-screen overlay shown after the idle timeout; requires the password to continue. */
export function LockScreen() {
  const { user, unlock, logout } = useAuth();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError("Password is required");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await unlock(password);
      setPassword("");
    } catch (err) {
      setError(getErrorMessage(err, "Could not unlock"));
      setPassword("");
      inputRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Session locked"
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-app/80 px-4 backdrop-blur-xl"
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-sm rounded-3xl bg-card p-8 text-center shadow-card ring-1 ring-line"
      >
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        <div className="flex flex-col items-center gap-3">
          <Avatar name={user?.fullName ?? "User"} src={user?.avatarUrl} color={user?.avatarColor} size="xl" />
          <div>
            <p className="text-base font-bold text-ink">{user?.fullName}</p>
            <p className="text-xs text-ink-muted">@{user?.username}</p>
          </div>
        </div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-sm text-ink-muted">
          <Lock className="h-3.5 w-3.5" />
          Locked after 2 minutes of inactivity
        </p>

        <form onSubmit={onSubmit} className="mt-5 space-y-4 text-left" noValidate>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              ref={inputRef}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              aria-label="Password"
              className="h-10 w-full rounded-xl border-0 bg-card pl-10 pr-11 text-sm text-ink shadow-sm ring-1 ring-inset ring-line placeholder:text-ink-muted transition focus:outline-none focus:ring-2 focus:ring-navy"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-muted transition hover:text-ink"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-600 ring-1 ring-inset ring-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20">
              <Info className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <Button type="submit" variant="primary" loading={submitting} rightIcon={<Unlock className="h-4 w-4" />} className="w-full">
            Unlock
          </Button>
        </form>

        <button
          type="button"
          onClick={() => void logout()}
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted transition hover:text-ink"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign in as a different user
        </button>
      </motion.div>
    </div>
  );
}
