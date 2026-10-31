import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { OrganizationProvider } from "@/context/OrganizationContext";
import { AmountVisibilityProvider } from "@/context/AmountVisibilityContext";
import { router } from "@/routes";

let queryClient: QueryClient;
queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep list/detail data warm briefly to cut duplicate network work.
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
  mutationCache: new MutationCache({
    onSuccess: () => {
      void queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] !== "settings",
        refetchType: "active",
      });
    },
  }),
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <SettingsProvider>
            <OrganizationProvider>
              <AmountVisibilityProvider>
                <RouterProvider router={router} />
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    className: "bg-panel text-ink ring-1 ring-line",
                    style: {
                      borderRadius: "12px",
                      fontSize: "14px",
                      fontWeight: 500,
                      background: "var(--color-panel)",
                      color: "var(--color-ink)",
                      boxShadow: "0 8px 16px rgba(15,23,42,0.10), 0 24px 48px rgba(15,23,42,0.16)",
                    },
                    success: { iconTheme: { primary: "#22c55e", secondary: "#fff" } },
                    error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
                  }}
                />
              </AmountVisibilityProvider>
            </OrganizationProvider>
          </SettingsProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
