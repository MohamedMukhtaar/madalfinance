import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@/types";
import { financeService } from "@/services/finance";
import { assertDeviceLockAvailable, verifyThisDevice } from "@/utils/deviceAuth";
import {
  ACCESS_TOKEN_KEY,
  LAST_ACTIVITY_KEY,
  LOCKED_KEY,
  REFRESH_TOKEN_KEY,
  USER_KEY,
  clearTokens,
  setTokens,
} from "@/services/api";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  /** Password, then the device's own lock (PIN / fingerprint / face). `onDeviceStep` fires between the two. */
  login: (username: string, password: string, remember?: boolean, onDeviceStep?: () => void) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (current: string, next: string) => Promise<void>;
  changeUsername: (currentPassword: string, newUsername: string) => Promise<void>;
  setUser: (user: User) => void;
  /** True while the idle lock screen is covering the app. */
  locked: boolean;
  lock: () => void;
  unlock: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function readLocked(): boolean {
  try {
    return localStorage.getItem(LOCKED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeLocked(value: boolean) {
  try {
    if (value) localStorage.setItem(LOCKED_KEY, "1");
    else localStorage.removeItem(LOCKED_KEY);
    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
  } catch {
    /* storage unavailable — lock still applies to this tab */
  }
}

function persistUser(user: User, persistent: boolean) {
  const store = persistent ? localStorage : sessionStorage;
  const other = persistent ? sessionStorage : localStorage;
  store.setItem(USER_KEY, JSON.stringify(user));
  other.removeItem(USER_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(getStoredUser);
  const [locked, setLocked] = useState<boolean>(() => !!getStoredUser() && readLocked());

  const lock = useCallback(() => {
    writeLocked(true);
    setLocked(true);
  }, []);

  // Keep every open tab in the same locked / unlocked state.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOCKED_KEY || e.key === null) setLocked(readLocked());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setUser = useCallback((next: User) => {
    setUserState(next);
    const persistent = Boolean(localStorage.getItem(ACCESS_TOKEN_KEY));
    persistUser(next, persistent);
  }, []);

  useEffect(() => {
    const onExpired = () => {
      setUserState(null);
      setLocked(false);
    };
    window.addEventListener("madal:session-expired", onExpired);
    return () => window.removeEventListener("madal:session-expired", onExpired);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user && !!(localStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(ACCESS_TOKEN_KEY)),
      async login(username, password, remember = true, onDeviceStep) {
        await assertDeviceLockAvailable();
        const step = await financeService.login(username, password);
        onDeviceStep?.();
        const result = await verifyThisDevice(step);
        setTokens(result.accessToken, result.refreshToken, remember);
        persistUser(result.user, remember);
        writeLocked(false);
        setLocked(false);
        setUserState(result.user);
      },
      async logout() {
        const refresh =
          localStorage.getItem(REFRESH_TOKEN_KEY) ?? sessionStorage.getItem(REFRESH_TOKEN_KEY);
        if (refresh) await financeService.logout(refresh);
        clearTokens();
        setLocked(false);
        setUserState(null);
      },
      async changePassword(current, next) {
        await financeService.changePassword(current, next);
      },
      async changeUsername(currentPassword, newUsername) {
        await financeService.changeUsername(currentPassword, newUsername);
        if (!user) return;
        const updated = { ...user, username: newUsername };
        setUser(updated);
      },
      setUser,
      locked,
      lock,
      async unlock(password) {
        await financeService.unlock(password);
        writeLocked(false);
        setLocked(false);
      },
    }),
    [user, setUser, locked, lock]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
