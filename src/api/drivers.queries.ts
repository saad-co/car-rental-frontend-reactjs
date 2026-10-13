import {
  keepPreviousData,
  queryOptions,
  useQuery,
} from "@tanstack/react-query";
import { api } from "./client";
import { apiErrorMessage } from "./errors";
import { queryKeys, type DriversListParams } from "./queryClient";
import type { components } from "./schema";

/** A driver, exactly as the API returns it. */
export type Driver = components["schemas"]["DriverDto"];

/** One payment alias of a driver (a name or handle they pay from, per payment method). */
export type DriverAlias = Driver["aliases"][number];

/** `active` | `inactive`, from the generated types. */
export type DriverStatus = Driver["status"];

/** Definition of the drivers list query: its key and how to fetch it. */
const driversListOptions = (params: DriversListParams) =>
  queryOptions({
    queryKey: queryKeys.drivers.list(params),
    queryFn: async () => {
      const { data, error, response } = await api.GET("/drivers", {
        params: { query: params },
      });
      if (!data) {
        throw new Error(
          apiErrorMessage(
            error,
            `Loading drivers failed (${response.status}).`,
          ),
        );
      }
      return data;
    },
    placeholderData: keepPreviousData,
  });

/** One page of drivers, newest first, optionally filtered by status. */
export function useDrivers(params: DriversListParams) {
  return useQuery(driversListOptions(params));
}

/** Definition of the driver detail query. */
const driverDetailOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.drivers.detail(id),
    queryFn: async () => {
      const { data, error, response } = await api.GET("/drivers/{id}", {
        params: { path: { id } },
      });
      if (!data) {
        throw new Error(
          apiErrorMessage(
            error,
            `Loading the driver failed (${response.status}).`,
          ),
        );
      }
      return data;
    },
  });

/** One driver with their payment aliases and payment summary. */
export function useDriver(id: string) {
  return useQuery(driverDetailOptions(id));
}
