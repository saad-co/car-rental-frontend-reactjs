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
      // Assigning credits the driver's ledger (and a reassignment moves the credit): balances and ledgers change.
      void queryClient.invalidateQueries({ queryKey: queryKeys.drivers.all });
    },
  });
}

/** How an admin received a payment recorded by hand: `cash` | `check` | `zelle` | ..., from the generated types. */
export type PaymentManualMethod = components["schemas"]["PaymentManualMethod"];

/** Body of a payment recorded by hand. */
export type NewManualPayment = components["schemas"]["RecordPaymentDto"];

/** The payment that made the API warn about a possible duplicate. */
export interface DuplicatePayment {
  id: string;
  source: PaymentSource;
  manualMethod: PaymentManualMethod | null;
  amountCents: number;
  occurredAt: string;
}

/**
 * The API refused to record a payment because the driver already has one of the same amount within three days
 * (answer 409 with `code: "possible_duplicate"`). The screen shows `duplicate` and offers "Record anyway", which
 * sends the same request with `confirmDuplicate: true`.
 */
export class PossibleDuplicateError extends Error {
  readonly duplicate: DuplicatePayment;

  constructor(message: string, duplicate: DuplicatePayment) {
    super(message);
    this.name = "PossibleDuplicateError";
    this.duplicate = duplicate;
  }
}

/** Reads the duplicate warning out of a 409 body, or null when the body is another kind of error. */
function duplicateFrom(error: unknown): PossibleDuplicateError | null {
  const body = error as
    | { code?: unknown; message?: unknown; duplicate?: DuplicatePayment }
    | undefined;
  if (body?.code !== "possible_duplicate" || !body.duplicate) return null;
  return new PossibleDuplicateError(
    typeof body.message === "string" ? body.message : "Possible duplicate.",
    body.duplicate,
  );
}

/**
 * After a payment is recorded or voided: payments lists, and every driver screen (balances, ledgers, the drivers list)
 * refetch.
 */
function useInvalidatePaymentChange() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.drivers.all }),
    ]);
}

/**
 * Records a payment an admin received by hand (cash, a check, any method). Sending the same `requestKey` again never
 * makes a second payment. Fails with a `PossibleDuplicateError` when the driver already has a payment of the same
 * amount within three days.
 */
export function useRecordPayment() {
  const invalidate = useInvalidatePaymentChange();
  return useMutation({
    mutationFn: async (body: NewManualPayment) => {
      const { data, error, response } = await api.POST("/payments/manual", {
        body,
      });
      if (!data) {
        throw (
          duplicateFrom(error) ??
          new Error(
            apiErrorMessage(
              error,
              `Recording the payment failed (${response.status}).`,
            ),
          )
        );
      }
      return data;
    },
    onSuccess: invalidate,
  });
}

/** Voids a payment recorded by hand: the payment is rejected and its credit on the ledger is reversed. */
export function useVoidPayment() {
  const invalidate = useInvalidatePaymentChange();
  return useMutation({
    mutationFn: async (input: { paymentId: string; reason: string }) => {
      const { data, error, response } = await api.POST("/payments/{id}/void", {
        params: { path: { id: input.paymentId } },
        body: { reason: input.reason },
      });
      if (!data) {
        throw new Error(
          apiErrorMessage(
            error,
            `Voiding the payment failed (${response.status}).`,
          ),
        );
      }
      return data;
    },
    onSuccess: invalidate,
  });
}
