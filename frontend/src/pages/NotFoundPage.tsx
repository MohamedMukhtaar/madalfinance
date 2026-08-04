import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LogoMark } from "@/components/ui/Logo";

export default function NotFoundPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-50 px-6 text-center dark:bg-slate-950">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-secondary-400/20 blur-3xl" />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative"
      >
        <p className="bg-gradient-to-br from-secondary-400 to-primary bg-clip-text text-[7rem] font-black leading-none tracking-tight text-transparent dark:from-secondary-300 dark:to-secondary-500">
          404
        </p>
        <div className="absolute -top-2 -right-4 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-600 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/30">
          ✦ Oops
        </div>
      </motion.div>

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
        The page you're looking for doesn't exist or has been moved. Let's get you back to the dashboard.
      </p>

      <div className="mt-8 flex items-center gap-3">
        <Button variant="secondary" onClick={() => window.history.back()} leftIcon={<ArrowLeft className="h-4 w-4" />}>
          Go back
        </Button>
        <Link to="/">
          <Button leftIcon={<Home className="h-4 w-4" />}>Dashboard</Button>
        </Link>
      </div>

      <div className="absolute bottom-8 flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
        <LogoMark className="h-4 w-4 text-brand-500" />
        Madal ICT Solutions
      </div>
    </div>
  );
}
