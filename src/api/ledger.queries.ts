import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "./client";
import { apiErrorMessage } from "./errors";
import { queryKeys } from "./queryClient";
import type { components } from "./schema";

/** One row of a driver's ledger, with the balance right after it. */
export type LedgerRow = components["schemas"]["LedgerRowDto"];

/** One week or month of the ledger summary. */
export type LedgerPeriodTotals = components["schemas"]["LedgerPeriodDto"];

/** `debit` | `credit`. */
export type LedgerDirection = components["schemas"]["LedgerDirection"];

/** `week` | `month`. */
export type LedgerPeriod = components["schemas"]["LedgerPeriod"];

/** Body of a new manual entry. */
export type NewLedgerEntry = components["schemas"]["CreateLedgerEntryDto"];

/** Rows per page of the ledger history (shared table rule: 8 rows). */
export const LEDGER_PAGE_SIZE = 8;

/** Definition of one ledger page query: its key and how to fetch it. */
const ledgerOptions = (driverId: string, page: number) =>
  queryOptions({
    queryKey: queryKeys.drivers.ledgerEntries(driverId, page),
    queryFn: async () => {
      const { data, error, response } = await api.GET("/drivers/{id}/ledger", {
        params: {
          path: { id: driverId },
          query: { page, limit: LEDGER_PAGE_SIZE },
        },
      });
      if (!data) {
        throw new Error(
          apiErrorMessage(
            error,
            `Loading the ledger failed (${response.status}).`,
          ),
        );
      }
      return data;
    },
    placeholderData: keepPreviousData,
  });

/** One page of a driver's ledger (newest first) and their balance now. */
export function useLedger(driverId: string, page: number) {
  return useQuery(ledgerOptions(driverId, page));
}

/** Definition of the summary query. */
const ledgerSummaryOptions = (driverId: string, period: LedgerPeriod) =>
  queryOptions({
    queryKey: queryKeys.drivers.ledgerSummary(driverId, period),
    queryFn: async () => {
      const { data, error, response } = await api.GET(
        "/drivers/{id}/ledger/summary",
        { params: { path: { id: driverId }, query: { period } } },
      );
      if (!data) {
        throw new Error(
          apiErrorMessage(
            error,
            `Loading the summary failed (${response.status}).`,
          ),
        );
      }
      return data;
    },
  });

/** The last 12 weeks or months of a driver's ledger, newest first. */
export function useLedgerSummary(driverId: string, period: LedgerPeriod) {
  return useQuery(ledgerSummaryOptions(driverId, period));
}

/**
 * After any ledger change: the ledger (entries and summaries), the driver page and the drivers list (balance column)
 * refetch.
 */
function useInvalidateLedger(driverId: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.drivers.ledger(driverId),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.drivers.detail(driverId),
      }),
      queryClient.invalidateQueries({ queryKey: queryKeys.drivers.lists }),
    ]);
}

/** Adds a manual charge or credit. Sending the same `requestKey` again never makes a second entry. */
export function useAddLedgerEntry(driverId: string) {
  const invalidate = useInvalidateLedger(driverId);
  return useMutation({
    mutationFn: async (body: NewLedgerEntry) => {
      const { data, error, response } = await api.POST(
        "/drivers/{id}/ledger/entries",
        { params: { path: { id: driverId } }, body },
      );
      if (!data) {
        throw new Error(
          apiErrorMessage(
            error,
            `Saving the entry failed (${response.status}).`,
          ),
        );
      }
      return data;
    },
    onSuccess: invalidate,
  });
}

/** Cancels an entry with a reversal (same amount, opposite direction, dated today). */
export function useReverseLedgerEntry(driverId: string) {
  const invalidate = useInvalidateLedger(driverId);
  return useMutation({
    mutationFn: async ({
      entryId,
      reason,
    }: {
      entryId: string;
      reason: string;
    }) => {
      const { data, error, response } = await api.POST(
        "/drivers/{id}/ledger/entries/{entryId}/reverse",
        { params: { path: { id: driverId, entryId } }, body: { reason } },
      );
      if (!data) {
        throw new Error(
          apiErrorMessage(
            error,
            `Reversing the entry failed (${response.status}).`,
          ),
        );
      }
      return data;
    },
    onSuccess: invalidate,
  });
}
