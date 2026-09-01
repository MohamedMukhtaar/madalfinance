import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";

/**
 * Central Axios instance for the Madal Finance API.
 *
 * The backend lives in /backend and is expected to run on http://localhost:4000.
 * In development the Vite dev server proxies /api and /uploads to it, so the
 * default base URL of "/api" works out of the box. Override with VITE_API_URL.
 */

export const ACCESS_TOKEN_KEY = "madal_access_token";
export const REFRESH_TOKEN_KEY = "madal_refresh_token";
export const USER_KEY = "madal_user";

/** Converts snake_case keys (backend wire format) to camelCase. */
function toCamelKey(key: string): string {
  return key.replace(/_([a-z])/g, (_m, c: string) => c.toUpperCase());
}

/** Deep-converts every object key in a response payload to camelCase. */
export function normalizePayload<T = unknown>(value: T): T {
  if (Array.isArray(value)) return value.map(normalizePayload) as unknown as T;
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      out[toCamelKey(key)] = normalizePayload(val);
    }
    return out as T;
  }
  return value;
}

export interface ApiEnvelope<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  errors?: Array<{ field?: string; message?: string; value?: unknown }>;
  meta?: Record<string, unknown>;
}

export function isApiError(err: unknown): err is AxiosError<ApiEnvelope> {
  return axios.isAxiosError(err) && Boolean(err.response?.data);
}

/** Extracts a human-readable message from any error. */
export function getErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (isApiError(err)) {
    const envelope = err.response?.data;
    if (envelope?.message) return envelope.message;
    if (envelope?.errors?.length) return envelope.errors.map((e) => e.message).join(", ");
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

/** HTTP 422 validation errors keyed by field. */
export function getFieldErrors(err: unknown): Record<string, string> {
  if (isApiError(err)) {
    const errors = err.response?.data?.errors;
    if (errors?.length) {
      return errors.reduce<Record<string, string>>((acc, e) => {
        if (e.field && !acc[e.field]) acc[e.field] = e.message ?? "Invalid value";
        return acc;
      }, {});
    }
  }
  return {};
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api",
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

const readStorage = (key: string) =>
  localStorage.getItem(key) ?? sessionStorage.getItem(key);

const getToken = () => readStorage(ACCESS_TOKEN_KEY);
const getRefreshToken = () => readStorage(REFRESH_TOKEN_KEY);

export const setTokens = (access: string, refresh: string, persistent = true) => {
  const store = persistent ? localStorage : sessionStorage;
  const other = persistent ? sessionStorage : localStorage;
  store.setItem(ACCESS_TOKEN_KEY, access);
  store.setItem(REFRESH_TOKEN_KEY, refresh);
  other.removeItem(ACCESS_TOKEN_KEY);
  other.removeItem(REFRESH_TOKEN_KEY);
};

export const clearTokens = () => {
  for (const store of [localStorage, sessionStorage]) {
    store.removeItem(ACCESS_TOKEN_KEY);
    store.removeItem(REFRESH_TOKEN_KEY);
    store.removeItem(USER_KEY);
  }
};

/** Notifies app-level listeners (AuthContext) that the session expired. */
export const onSessionExpired = () => {
  window.dispatchEvent(new CustomEvent("madal:session-expired"));
};

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalize camelCase on every successful response.
api.interceptors.response.use((response: AxiosResponse) => {
  // Blob/arraybuffer responses are not JSON envelopes, so don't try to normalize them.
  const rt = response.config?.responseType;
  if (rt === "blob" || rt === "arraybuffer") return response;
  response.data = normalizePayload(response.data);
  return response;
});

let refreshPromise: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await axios.post<ApiEnvelope<{ accessToken: string; refreshToken: string }>>(
      `${import.meta.env.VITE_API_URL ?? "/api"}/auth/refresh`,
      { refresh_token: refreshToken },
      { headers: { "Content-Type": "application/json" } }
    );
    const data = normalizePayload(res.data.data);
    if (data.accessToken && data.refreshToken) {
      setTokens(data.accessToken, data.refreshToken);
      return data.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

api.interceptors.response.use(undefined, async (error: AxiosError) => {
  const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
  const isAuthEndpoint = original?.url?.includes("/auth/");

  if (error.response?.status === 401 && original && !original._retry && !isAuthEndpoint) {
    original._retry = true;
    refreshPromise = refreshPromise ?? performRefresh();
    try {
      const token = await refreshPromise;
      refreshPromise = null;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
    } catch {
      refreshPromise = null;
    }
    clearTokens();
    onSessionExpired();
  }

  return Promise.reject(error);
});

export const authApi = {
  get: <T>(url: string, params?: Record<string, unknown>) =>
    api.get<ApiEnvelope<T>>(url, { params }).then((r) => r.data),
  post: <T>(url: string, body?: unknown, config?: { params?: Record<string, unknown> }) =>
    api.post<ApiEnvelope<T>>(url, body, config).then((r) => r.data),
  put: <T>(url: string, body?: unknown) => api.put<ApiEnvelope<T>>(url, body).then((r) => r.data),
  patch: <T>(url: string, body?: unknown) => api.patch<ApiEnvelope<T>>(url, body).then((r) => r.data),
  delete: <T>(url: string, body?: unknown) =>
    api.delete<ApiEnvelope<T>>(url, body !== undefined ? { data: body } : undefined).then((r) => r.data),
  upload: <T>(url: string, formData: FormData, onProgress?: (percent: number) => void) =>
    api
      .post<ApiEnvelope<T>>(url, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
        },
      })
      .then((r) => r.data),
};

export type { AxiosError };
