import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "./client";
import { apiErrorMessage } from "./errors";
import { queryKeys, type PaymentsListParams } from "./queryClient";
import type { components } from "./schema";

/** A payment, exactly as the API returns it. */
export type Payment = components["schemas"]["PaymentDto"];

/** `email_zelle` | `email_cashapp` | ..., from the generated types. */
export type PaymentSource = Payment["source"];

/** `unmatched` | `reported` | `confirmed` | ..., from the generated types. */
export type PaymentStatus = Payment["status"];

/** Definition of the payments list query: its key and how to fetch it. */
const paymentsListOptions = (params: PaymentsListParams) =>
  queryOptions({
    queryKey: queryKeys.payments.list(params),
    queryFn: async () => {
      const { data, error, response } = await api.GET("/payments", {
        params: { query: params },
      });
      if (!data) {
        throw new Error(
          apiErrorMessage(
            error,
            `Loading payments failed (${response.status}).`,
          ),
        );
      }
      return data;
    },
    // While the next page loads, keep showing the current one instead of an empty table.
    placeholderData: keepPreviousData,
  });

/** One page of payments, most recent first, optionally filtered by status and source. */
export function usePayments(params: PaymentsListParams) {
  return useQuery(paymentsListOptions(params));
}

/** What an assignment did: the updated payment, and whether the payer's name became an alias. */
export type AssignPaymentResult =
  components["schemas"]["AssignPaymentResultDto"];

/**
 * Assigns (or re-assigns) a payment to a driver. On success every payments list refetches, because the
 * payment moved between "Needs review" and "Assigned".
 */
export function useAssignPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { paymentId: string; driverId: string }) => {
      const { data, error, response } = await api.POST(
        "/payments/{id}/assign",
        {
          params: { path: { id: input.paymentId } },
          body: { driverId: input.driverId },
        },
      );
      if (!data) {
        throw new Error(
          apiErrorMessage(error, `Assigning failed (${response.status}).`),
        );
      }
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
    },
  });
}
