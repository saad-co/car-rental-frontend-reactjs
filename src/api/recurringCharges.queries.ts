import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "./client";
import { apiErrorMessage } from "./errors";
import { queryKeys } from "./queryClient";
import type { components } from "./schema";

/** One rent set or changed by hand (D100, D101), as the API returns it: with its status (pending, current or past). */
export type RecurringCharge = components["schemas"]["RecurringChargeDto"];

/** What the admin types: whole cents, `weekly` or `daily`, and a start date `YYYY-MM-DD` (a weekly charge's weekday). */
export type NewRecurringCharge =
  components["schemas"]["CreateRecurringChargeDto"];

/** Definition of one driver's charge query (`charge` is null when none is set). */
const recurringChargeOptions = (driverId: string) =>
  queryOptions({
    queryKey: queryKeys.drivers.recurringCharge(driverId),
    queryFn: async () => {
      const { data, error, response } = await api.GET(
        "/drivers/{id}/recurring-charge",
        { params: { path: { id: driverId } } },
      );
      if (!data) {
        throw new Error(
          apiErrorMessage(
            error,
            `Loading the charge failed (${response.status}).`,
          ),
        );
      }
      return data;
    },
  });

/** The driver's charge set by hand, or `charge: null`. */
export function useRecurringCharge(driverId: string) {
  return useQuery(recurringChargeOptions(driverId));
}

/**
 * Sets the driver's charge. The server posts the first rent at once when the driver is active, so the ledger, the balance,
 * the lists and the dashboard are all looked at again afterwards.
 */
export function useSetRecurringCharge(driverId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: NewRecurringCharge) => {
      const { data, error, response } = await api.POST(
        "/drivers/{id}/recurring-charge",
        { params: { path: { id: driverId } }, body },
      );
      if (!data) {
        throw new Error(
          apiErrorMessage(
            error,
            `Saving the charge failed (${response.status}).`,
          ),
        );
      }
      return data;
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.drivers.recurringCharge(driverId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.drivers.ledger(driverId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.drivers.detail(driverId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.drivers.lists }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      ]),
  });
}

/**
 * Removes a rent change that has not started yet (the server refuses one that has). Nothing already posted is touched, but the
 * lists and the dashboard are looked at again, like after a save.
 */
export function useRemoveRecurringCharge(driverId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (chargeId: string) => {
      const { error, response } = await api.DELETE(
        "/drivers/{id}/recurring-charge/{chargeId}",
        { params: { path: { id: driverId, chargeId } } },
      );
      if (!response.ok) {
        throw new Error(
          apiErrorMessage(
            error,
            `Removing the change failed (${response.status}).`,
          ),
        );
      }
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.drivers.recurringCharge(driverId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.drivers.lists }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      ]),
  });
}
