import {
  keepPreviousData,
  queryOptions,
  useQuery,
} from "@tanstack/react-query";
import { api } from "./client";
import { apiErrorMessage } from "./errors";
import { queryKeys, type ApplicationsListParams } from "./queryClient";
import type { components } from "./schema";

/** One row of the applications list, exactly as the API returns it. */
export type ApplicationListItem =
  components["schemas"]["ApplicationListItemDto"];

/** `pending` | `approved` | `rejected` | `on_hold`, from the generated types. */
export type ApplicationStatus = ApplicationListItem["status"];

/** Definition of the applications list query: its key and how to fetch it. */
const applicationsListOptions = (params: ApplicationsListParams) =>
  queryOptions({
    queryKey: queryKeys.applications.list(params),
    queryFn: async () => {
      const { data, error, response } = await api.GET("/applications", {
        params: { query: params },
      });
      if (!data) {
        throw new Error(
          apiErrorMessage(
            error,
            `Loading applications failed (${response.status}).`,
          ),
        );
      }
      return data;
    },
    // While the next page loads, keep showing the current one instead of an empty table.
    placeholderData: keepPreviousData,
  });

/** One page of applications, newest first, optionally filtered by status. */
export function useApplications(params: ApplicationsListParams) {
  return useQuery(applicationsListOptions(params));
}
