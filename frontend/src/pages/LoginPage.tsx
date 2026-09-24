import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import { Eye, EyeOff, Fingerprint, Info, Lock, LogIn, User } from "lucide-react";
import { Input, Checkbox } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/services/api";

interface LoginForm {
  username: string;
  password: string;
  remember: boolean;
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string>();
  const [deviceStep, setDeviceStep] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    defaultValues: { username: "", password: "", remember: true },
  });

  const onSubmit = async (data: LoginForm) => {
    setServerError(undefined);
    setDeviceStep(false);
    try {
      await login(data.username, data.password, data.remember, () => setDeviceStep(true));
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
      navigate(from ?? "/", { replace: true });
    } catch (err) {
      setServerError(getErrorMessage(err, "Invalid username or password."));
    } finally {
      setDeviceStep(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="rounded-3xl bg-card p-8 shadow-card ring-1 ring-line sm:p-10"
    >
      <h1 className="text-2xl font-bold tracking-tight text-ink">Welcome back</h1>
      <p className="mt-1.5 text-sm text-ink-muted">Sign in to your finance dashboard to continue.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
        <Input
          label="Username"
          placeholder="Enter your username"
          autoComplete="username"
          icon={<User className="h-4 w-4" />}
          error={errors.username?.message}
          {...register("username", { required: "Username is required" })}
        />

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-ink-soft">
            Password <span className="ml-0.5 text-rose-500">*</span>
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              autoComplete="current-password"
              className="h-10 w-full rounded-xl border-0 bg-card pl-10 pr-11 text-sm text-ink shadow-sm ring-1 ring-inset ring-line placeholder:text-ink-muted transition focus:outline-none focus:ring-2 focus:ring-navy"
              {...register("password", {
                required: "Password is required",
                minLength: { value: 6, message: "Minimum 6 characters" },
              })}
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
          {errors.password && (
            <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{errors.password.message}</p>
          )}
        </div>

        {deviceStep && (
          <div className="flex items-start gap-2.5 rounded-xl bg-brand-50 px-3.5 py-2.5 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-200 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/20">
            <Fingerprint className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Password accepted. Confirm it's you with this device's PIN, fingerprint or face (Windows Hello on Windows).</span>
          </div>
        )}

        {serverError && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2.5 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-600 ring-1 ring-inset ring-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20"
          >
            <Info className="h-4 w-4 shrink-0" />
            {serverError}
          </motion.div>
        )}

        <div className="flex items-center justify-between">
          <Checkbox label="Remember me" {...register("remember")} />
        </div>

        <Button type="submit" size="lg" variant="primary" loading={isSubmitting} rightIcon={<LogIn className="h-4 w-4" />} className="w-full">
          {deviceStep ? "Waiting for device…" : isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </motion.div>
  );
}
