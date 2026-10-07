import { QueryClient } from "@tanstack/react-query";
import type { paths } from "./schema";

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

/** Query string of `GET /applications` (status filter, page, limit), from the generated types. */
export type ApplicationsListParams =
  paths["/applications"]["get"]["parameters"]["query"];

/**
 * Every query key used in the app, in one place, so a key is never mistyped when a
 * query is read, set or invalidated.
 *
 * Keys are hierarchical: invalidating `queryKeys.applications.all` (`["applications"]`)
 * refreshes every applications list and detail at once, because TanStack Query matches
 * keys by prefix.
 */
export const queryKeys = {
  /** The logged-in user (`GET /auth/me`). */
  me: ["auth", "me"] as const,
  applications: {
    all: ["applications"] as const,
    /** Prefix of every list query, whatever its filter and page. */
    lists: ["applications", "list"] as const,
    list: (params: ApplicationsListParams) =>
      ["applications", "list", params] as const,
    detail: (id: string) => ["applications", "detail", id] as const,
  },
  drivers: {
    all: ["drivers"] as const,
  },
};
