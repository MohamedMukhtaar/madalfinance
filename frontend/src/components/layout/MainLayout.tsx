import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { DashboardProvider } from "@/context/DashboardContext";
import { ConfirmHost } from "@/components/ui/ConfirmDialog";
import { Footer } from "@/components/layout/Footer";
import { LockScreen } from "@/components/layout/LockScreen";
import { useAuth } from "@/context/AuthContext";
import { useIdleLock } from "@/hooks/useIdleLock";

export function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { locked, lock } = useAuth();
  const appRef = useRef<HTMLDivElement>(null);

  useIdleLock(lock, { enabled: !locked });

  // Close the mobile drawer after navigation or when resizing to desktop.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onResize = () => {
      if (window.matchMedia("(min-width: 1024px)").matches) setMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Block focus / clicks on the app behind the lock screen.
  useEffect(() => {
    const el = appRef.current;
    if (!el) return;
    if (locked) el.setAttribute("inert", "");
    else el.removeAttribute("inert");
  }, [locked]);

  return (
    <DashboardProvider>
      <div
        ref={appRef}
        aria-hidden={locked || undefined}
        className="flex min-h-[100dvh] overflow-x-clip bg-app text-ink-soft"
      >
        <Sidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />

        <div className="flex min-w-0 flex-1 flex-col overflow-x-clip bg-app">
          <ConfirmHost />
          <Topbar
            onOpenMobile={() => setMobileOpen(true)}
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed((c) => !c)}
          />

          <main className="flex-1 px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-6 lg:px-8">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="mx-auto w-full max-w-[1600px]"
            >
              <Outlet />
            </motion.div>
          </main>

          <Footer />
        </div>
      </div>
      {locked && <LockScreen />}
    </DashboardProvider>
  );
}
