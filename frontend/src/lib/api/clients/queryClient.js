import { QueryClient } from "@tanstack/react-query";

/**
 * Shared TanStack Query Client instance for the application.
 * Configured with global defaults:
 * - refetchOnWindowFocus: false
 *   (prevents unnecessary re-fetches when switching tabs)
 * - retry: 1 (retry failed queries once before showing an error)
 */
export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
});
