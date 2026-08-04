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
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  USER_KEY,
  clearTokens,
  setTokens,
} from "@/services/api";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (current: string, next: string) => Promise<void>;
  changeUsername: (currentPassword: string, newUsername: string) => Promise<void>;
  setUser: (user: User) => void;
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

function persistUser(user: User, persistent: boolean) {
  const store = persistent ? localStorage : sessionStorage;
  const other = persistent ? sessionStorage : localStorage;
  store.setItem(USER_KEY, JSON.stringify(user));
  other.removeItem(USER_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(getStoredUser);

  const setUser = useCallback((next: User) => {
    setUserState(next);
    const persistent = Boolean(localStorage.getItem(ACCESS_TOKEN_KEY));
    persistUser(next, persistent);
  }, []);

  useEffect(() => {
    const onExpired = () => {
      setUserState(null);
    };
    window.addEventListener("madal:session-expired", onExpired);
    return () => window.removeEventListener("madal:session-expired", onExpired);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user && !!(localStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(ACCESS_TOKEN_KEY)),
      async login(username, password, remember = true) {
        const result = await financeService.login(username, password);
        setTokens(result.accessToken, result.refreshToken, remember);
        persistUser(result.user, remember);
        setUserState(result.user);
      },
      async logout() {
        const refresh =
          localStorage.getItem(REFRESH_TOKEN_KEY) ?? sessionStorage.getItem(REFRESH_TOKEN_KEY);
        if (refresh) await financeService.logout(refresh);
        clearTokens();
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
    }),
    [user, setUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
