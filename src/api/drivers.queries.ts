import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "./client";
import { apiErrorMessage } from "./errors";
import { queryKeys, type DriversListParams } from "./queryClient";
import type { components } from "./schema";

/** A driver, exactly as the API returns it. */
export type Driver = components["schemas"]["DriverDto"];

/** One payment alias of a driver (a name or handle they pay from, per payment method). */
export type DriverAlias = Driver["aliases"][number];

/** `onboarding` | `active` | `inactive`, from the generated types. */
export type DriverStatus = Driver["status"];

/** `contract` | `deposit` | `vehicle`, from the generated types. */
export type OnboardingStep =
  components["schemas"]["SetOnboardingStepDto"]["step"];

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

/**
 * Shared logic of the driver status mutations: each request returns the updated driver. On success the detail cache
 * is replaced with it (the page updates without a refetch) and every drivers list refetches (status and badge
 * changed).
 */
function useDriverMutation<V>(
  request: (
    vars: V,
  ) => Promise<{ data?: Driver; error?: unknown; response: Response }>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: V) => {
      const { data, error, response } = await request(vars);
      if (!data) {
        throw new Error(
          apiErrorMessage(error, `The request failed (${response.status}).`),
        );
      }
      return data;
    },
    onSuccess: (driver) => {
      queryClient.setQueryData(queryKeys.drivers.detail(driver.id), driver);
      void queryClient.invalidateQueries({ queryKey: queryKeys.drivers.lists });
    },
  });
}

/** Ticks (`done: true`) or un-ticks one onboarding step; the API sets the status from the steps (D56). */
export function useSetOnboardingStep(id: string) {
  return useDriverMutation((vars: { step: OnboardingStep; done: boolean }) =>
    api.POST("/drivers/{id}/onboarding", {
      params: { path: { id } },
      body: vars,
    }),
  );
}

/** Marks the driver inactive; their login stops working (B67). */
export function useDeactivateDriver(id: string) {
  return useDriverMutation(() =>
    api.POST("/drivers/{id}/deactivate", { params: { path: { id } } }),
  );
}

/** Brings an inactive driver back (active or onboarding, from their steps). */
export function useReactivateDriver(id: string) {
  return useDriverMutation(() =>
    api.POST("/drivers/{id}/reactivate", { params: { path: { id } } }),
  );
}

/** The kinds of payment alias (payment methods plus email and phone), from the generated types. */
export type AliasType = DriverAlias["type"];

/**
 * Adds a payment alias to the driver (D69): a name or handle they pay from, under one payment method. The API refuses
 * (409) an alias another driver already has and says whose it is; the message is shown as it comes.
 */
export function useAddDriverAlias(id: string) {
  return useDriverMutation((vars: { type: AliasType; value: string }) =>
    api.POST("/drivers/{id}/aliases", {
      params: { path: { id } },
      body: vars,
    }),
  );
}

/** Removes one alias of the driver, whatever its source. Payments already assigned stay as they are. */
export function useRemoveDriverAlias(id: string) {
  return useDriverMutation((aliasId: string) =>
    api.DELETE("/drivers/{id}/aliases/{aliasId}", {
      params: { path: { id, aliasId } },
    }),
  );
}
