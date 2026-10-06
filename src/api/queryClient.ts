import { QueryClient } from "@tanstack/react-query";

/**
 * The single TanStack Query client for the whole app, with its app-wide defaults.
 * All TanStack Query configuration lives in this file.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Every query key used in the app, in one place, so a key is never mistyped when a
 * query is read, set or invalidated.
 */
export const queryKeys = {
  /** The logged-in user (`GET /auth/me`). */
  me: ["auth", "me"] as const,
};
