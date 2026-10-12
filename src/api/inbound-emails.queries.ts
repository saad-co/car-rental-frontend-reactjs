import {
  keepPreviousData,
  queryOptions,
  useQuery,
} from "@tanstack/react-query";
import { api } from "./client";
import { apiErrorMessage } from "./errors";
import { queryKeys, type InboundEmailsListParams } from "./queryClient";
import type { components } from "./schema";

/** One processed email in the email log, exactly as the API returns it. */
export type InboundEmail = components["schemas"]["InboundEmailDto"];

/** `processed` | `not_payment` | `extraction_failed` | ..., from the generated types. */
export type InboundEmailStatus = InboundEmail["status"];

/** `zelle_chase` | `cashapp` | ... | `unknown`, from the generated types. */
export type InboundEmailProvider = InboundEmail["provider"];

/** Definition of the email log query: its key and how to fetch it. */
const inboundEmailsListOptions = (params: InboundEmailsListParams) =>
  queryOptions({
    queryKey: queryKeys.inboundEmails.list(params),
    queryFn: async () => {
      const { data, error, response } = await api.GET("/inbound-emails", {
        params: { query: params },
      });
      if (!data) {
        throw new Error(
          apiErrorMessage(
            error,
            `Loading the email log failed (${response.status}).`,
          ),
        );
      }
      return data;
    },
    placeholderData: keepPreviousData,
  });

/** One page of the email log, newest first, optionally filtered by outcome and provider. */
export function useInboundEmails(params: InboundEmailsListParams) {
  return useQuery(inboundEmailsListOptions(params));
}
