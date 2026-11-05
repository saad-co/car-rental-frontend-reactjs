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
