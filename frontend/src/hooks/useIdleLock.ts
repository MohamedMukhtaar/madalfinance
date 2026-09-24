import { useEffect } from "react";
import { LAST_ACTIVITY_KEY } from "@/services/api";

/** Lock the app after this long with no mouse / keyboard / touch activity. */
export const IDLE_LOCK_MS = 2 * 60 * 1000;

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "wheel", "scroll", "touchstart"] as const;
const WRITE_THROTTLE_MS = 1000;
const CHECK_INTERVAL_MS = 5000;

/**
 * Calls `onIdle` once no activity has been seen for `timeoutMs`.
 *
 * The last-activity timestamp lives in localStorage so that working in one
 * tab keeps the others unlocked, and so a sleeping laptop is measured by wall
 * clock rather than by a paused setTimeout.
 */
export function useIdleLock(onIdle: () => void, { enabled = true, timeoutMs = IDLE_LOCK_MS } = {}) {
  useEffect(() => {
    if (!enabled) return;

    let memoryLast = Date.now();
    let lastWrite = 0;

    const readLast = () => {
      try {
        const stored = Number(localStorage.getItem(LAST_ACTIVITY_KEY));
        return Number.isFinite(stored) && stored > 0 ? Math.max(stored, memoryLast) : memoryLast;
      } catch {
        return memoryLast;
      }
    };

    const markActive = () => {
      const now = Date.now();
      memoryLast = now;
      if (now - lastWrite < WRITE_THROTTLE_MS) return;
      lastWrite = now;
      try {
        localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
      } catch {
        /* in-memory timestamp still works for this tab */
      }
    };

    const check = () => {
      if (Date.now() - readLast() >= timeoutMs) onIdle();
    };

    markActive();
    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, markActive, { passive: true, capture: true });
    }
    const interval = window.setInterval(check, CHECK_INTERVAL_MS);
    // Re-check immediately when the tab becomes visible again (e.g. after sleep).
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      for (const evt of ACTIVITY_EVENTS) {
        window.removeEventListener(evt, markActive, { capture: true });
      }
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, timeoutMs, onIdle]);
}
