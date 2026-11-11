import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "./client";
import { apiErrorMessage } from "./errors";
import { queryKeys } from "./queryClient";
import type { components } from "./schema";

/** Everything the dashboard shows, exactly as the API returns it (money in cents, Chicago days). */
export type Dashboard = components["schemas"]["DashboardDto"];

/** Definition of the dashboard query: its key and how to fetch it. */
const dashboardOptions = () =>
  queryOptions({
    queryKey: queryKeys.dashboard,
    queryFn: async () => {
      const { data, error, response } = await api.GET("/dashboard");
      if (!data) {
        throw new Error(
          apiErrorMessage(
            error,
            `Loading the dashboard failed (${response.status}).`,
          ),
        );
      }
      return data;
    },
  });

/**
 * The dashboard's figures, all worked out by the server. The app-wide default refetches when the tab regains focus,
 * so the numbers are fresh when the admin comes back to the page.
 */
export function useDashboard() {
  return useQuery(dashboardOptions());
}

/** The daily operations page, exactly as the API returns it (money in cents, Chicago days, nothing stored: D92). */
export type DailyOperations = components["schemas"]["DailyOperationsDto"];

/** Definition of the daily operations query: its key and how to fetch it. */
const dailyOperationsOptions = () =>
  queryOptions({
    queryKey: queryKeys.dailyOperations,
    queryFn: async () => {
      const { data, error, response } = await api.GET(
        "/dashboard/daily-operations",
      );
      if (!data) {
        throw new Error(
          apiErrorMessage(
            error,
            `Loading the daily operations failed (${response.status}).`,
          ),
        );
      }
      return data;
    },
  });

/**
 * Who is due today, who is late, who should be deactivated, the weekly totals, deposits and collections: all worked out
 * by the server when it is read. Refetched when the tab regains focus (the app-wide default), so the page is fresh when
 * staff come back to it.
 */
export function useDailyOperations() {
  return useQuery(dailyOperationsOptions());
}
