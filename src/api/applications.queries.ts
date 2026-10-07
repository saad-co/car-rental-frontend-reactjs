import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "./client";
import { apiErrorMessage } from "./errors";
import { queryKeys, type ApplicationsListParams } from "./queryClient";
import type { components } from "./schema";

/** One row of the applications list, exactly as the API returns it. */
export type ApplicationListItem =
  components["schemas"]["ApplicationListItemDto"];

/** Everything about one application, exactly as the API returns it. */
export type ApplicationDetail = components["schemas"]["ApplicationDetailDto"];

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

/** Definition of the application detail query. */
const applicationDetailOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.applications.detail(id),
    queryFn: async () => {
      const { data, error, response } = await api.GET("/applications/{id}", {
        params: { path: { id } },
      });
      if (!data) {
        throw new Error(
          apiErrorMessage(
            error,
            `Loading the application failed (${response.status}).`,
          ),
        );
      }
      return data;
    },
  });

/** One application with all its details. */
export function useApplication(id: string) {
  return useQuery(applicationDetailOptions(id));
}

/** The three review requests. Each returns the updated application. */
const reviewRequests = {
  approve: (id: string) =>
    api.POST("/applications/{id}/approve", { params: { path: { id } } }),
  reject: (id: string) =>
    api.POST("/applications/{id}/reject", { params: { path: { id } } }),
  hold: (id: string) =>
    api.POST("/applications/{id}/hold", { params: { path: { id } } }),
};

type ReviewAction = keyof typeof reviewRequests;

/**
 * Shared logic of the three review mutations. Takes the application id.
 *
 * On success:
 * - the detail cache is replaced with the response, so the page updates without a refetch;
 * - every applications list is marked stale (by the `lists` key prefix) and refetches,
 *   because the application's status changed;
 * - after an approval, driver queries are marked stale too: a new driver exists.
 */
function useReviewApplication(action: ReviewAction) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error, response } = await reviewRequests[action](id);
      if (!data) {
        throw new Error(
          apiErrorMessage(error, `The request failed (${response.status}).`),
        );
      }
      return data;
    },
    onSuccess: (application) => {
      queryClient.setQueryData(
        queryKeys.applications.detail(application.id),
        application,
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.applications.lists,
      });
      if (action === "approve") {
        void queryClient.invalidateQueries({ queryKey: queryKeys.drivers.all });
      }
    },
  });
}

/** Approves an application; the API creates the driver. */
export function useApproveApplication() {
  return useReviewApplication("approve");
}

/** Rejects an application. */
export function useRejectApplication() {
  return useReviewApplication("reject");
}

/** Puts an application on hold. */
export function useHoldApplication() {
  return useReviewApplication("hold");
}
