import {
  keepPreviousData,
  queryOptions,
  useQuery,
} from "@tanstack/react-query";
import { api } from "./client";
import { apiErrorMessage } from "./errors";
import {
  queryKeys,
  type CollectionsParams,
  type RevenueByDriverParams,
} from "./queryClient";
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

/** A page of collections (money received per month, week or day), exactly as the API returns it (D93). */
export type Collections = components["schemas"]["CollectionPeriodsDto"];

/** One period of the collections list. */
export type CollectionPeriod = Collections["items"][number];

/** Definition of the collections query: its key and how to fetch it. */
const collectionsOptions = (params: CollectionsParams) =>
  queryOptions({
    queryKey: queryKeys.collections(params),
    queryFn: async () => {
      const { data, error, response } = await api.GET(
        "/dashboard/collections",
        { params: { query: params } },
      );
      if (!data) {
        throw new Error(
          apiErrorMessage(
            error,
            `Loading the collections failed (${response.status}).`,
          ),
        );
      }
      return data;
    },
    // While the next page loads, keep showing the current one instead of an empty table.
    placeholderData: keepPreviousData,
  });

/** One page of collections per month, Monday-to-Sunday week or day; `from` / `to` limit it to a range of Chicago days. */
export function useCollections(params: CollectionsParams) {
  return useQuery(collectionsOptions(params));
}

/** A page of revenue per driver, exactly as the API returns it (D93). */
export type RevenueByDriver = components["schemas"]["RevenueByDriverDto"];

/** One driver's row of the revenue list. */
export type DriverRevenue = RevenueByDriver["items"][number];

/** Definition of the revenue-by-driver query: its key and how to fetch it. */
const revenueByDriverOptions = (params: RevenueByDriverParams) =>
  queryOptions({
    queryKey: queryKeys.revenueByDriver(params),
    queryFn: async () => {
      const { data, error, response } = await api.GET(
        "/dashboard/revenue-by-driver",
        { params: { query: params } },
      );
      if (!data) {
        throw new Error(
          apiErrorMessage(
            error,
            `Loading revenue per driver failed (${response.status}).`,
          ),
        );
      }
      return data;
    },
    placeholderData: keepPreviousData,
  });

/** One page of drivers by the money received from them, biggest first; `from` / `to` limit it to a range of Chicago days. */
export function useRevenueByDriver(params: RevenueByDriverParams) {
  return useQuery(revenueByDriverOptions(params));
}
