import {
  infiniteQueryOptions,
  keepPreviousData,
  queryOptions,
  useInfiniteQuery,
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

/** The documents of one application: licence, rating and earnings screenshots (our copies). */
export type ApplicationDocuments =
  components["schemas"]["ApplicationDocumentListDto"];

/** One uploaded document. */
export type ApplicationDocument =
  components["schemas"]["ApplicationDocumentDto"];

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

/**
 * What a review mutation takes: the application, and the text to send the applicant (B72, B81): picked from a
 * template and maybe edited. Approve without it sends the first approved template; decline without it sends no text.
 */
export interface ReviewVars {
  id: string;
  message?: string;
}

/** The three review requests. Each returns the updated application. */
const reviewRequests = {
  approve: ({ id, message }: ReviewVars) =>
    api.POST("/applications/{id}/approve", {
      params: { path: { id } },
      body: { message },
    }),
  // Shown as "Decline" (B69); the API action is still `reject`.
  reject: ({ id, message }: ReviewVars) =>
    api.POST("/applications/{id}/reject", {
      params: { path: { id } },
      body: { message },
    }),
  hold: ({ id }: ReviewVars) =>
    api.POST("/applications/{id}/hold", { params: { path: { id } } }),
};

type ReviewAction = keyof typeof reviewRequests;

/**
 * Shared logic of the three review mutations. Takes `{ id }` and the optional `message`.
 *
 * On success:
 * - the detail cache is replaced with the response, so the page updates without a refetch;
 * - every applications list is marked stale (by the `lists` key prefix) and refetches,
 *   because the application's status changed;
 * - the chats refetch, because approve and decline may have sent texts;
 * - after an approval, driver queries are marked stale too: a new driver exists.
 */
function useReviewApplication(action: ReviewAction) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: ReviewVars) => {
      const { data, error, response } = await reviewRequests[action](vars);
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
      // Approve and decline may have texted the applicant (B71, B72): the chat on the page shows it right away.
      void queryClient.invalidateQueries({ queryKey: queryKeys.sms.all });
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

/** Declines an application (stored as `rejected`); a `message` also texts the applicant (B72). */
export function useRejectApplication() {
  return useReviewApplication("reject");
}

/** Puts an application on hold. */
export function useHoldApplication() {
  return useReviewApplication("hold");
}

/** What a delete removed: `{ deleted, filesNotRemoved }`. */
export type DeleteApplicationsResult =
  components["schemas"]["DeleteApplicationsResultDto"];

/**
 * Deletes applications for good (B66). Takes their ids; one id deletes one. The API refuses the whole request
 * (409, nothing deleted) if any is approved.
 *
 * On success: every applications list refetches; cached details and documents of deleted applications that no
 * screen shows any more are dropped (one still on screen is left alone, so it does not refetch into a 404 while
 * the page leaves); chats are marked stale, because a deleted application's text history may be gone too.
 */
export function useDeleteApplications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { data, error, response } = await api.POST(
        "/applications/bulk-delete",
        { body: { ids } },
      );
      if (!data) {
        throw new Error(
          apiErrorMessage(error, `Deleting failed (${response.status}).`),
        );
      }
      return data;
    },
    onSuccess: (_result, ids) => {
      for (const id of ids) {
        queryClient.removeQueries({
          queryKey: queryKeys.applications.detail(id),
          type: "inactive",
        });
        queryClient.removeQueries({
          queryKey: queryKeys.applications.documents(id),
          type: "inactive",
        });
      }
      void queryClient.invalidateQueries({
        queryKey: queryKeys.applications.lists,
      });
      // Marked stale but not refetched now: the deleted application's chat may still be on screen while its page
      // leaves, and refetching it would ask for a conversation that no longer exists (404). Chats refetch when
      // next shown.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.sms.all,
        refetchType: "none",
      });
    },
  });
}

/**
 * One sentence for the admin after a delete. Mentions copied files the bucket could not remove, so that is never
 * silent (the reasons are in the server log).
 */
export function deleteResultMessage(result: DeleteApplicationsResult): string {
  const what =
    result.deleted === 1
      ? "1 application was deleted."
      : `${result.deleted} applications were deleted.`;
  return result.filesNotRemoved > 0
    ? `${what} ${result.filesNotRemoved} copied file(s) could not be removed from storage; the reason is in the server log.`
    : what;
}

/** Definition of the documents query: its key and how to fetch it. */
const applicationDocumentsOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.applications.documents(id),
    queryFn: async () => {
      const { data, error, response } = await api.GET(
        "/applications/{id}/documents",
        { params: { path: { id } } },
      );
      if (!data) {
        throw new Error(
          apiErrorMessage(
            error,
            `Loading documents failed (${response.status}).`,
          ),
        );
      }
      return data;
    },
    // Documents are copied in the background right after an application arrives: keep checking while any is
    // still pending, and stop once they are all done.
    refetchInterval: (query) =>
      query.state.data?.items.some((d) => d.status === "pending") &&
      query.state.data.sourceConnected &&
      query.state.data.storageConnected
        ? 5_000
        : false,
  });

/** The documents the applicant uploaded, as our own copies, with short-lived links to open them. */
export function useApplicationDocuments(id: string) {
  return useQuery(applicationDocumentsOptions(id));
}

/** One internal note on an application (B74), exactly as the API returns it. */
export type ApplicationNote = components["schemas"]["ApplicationNoteDto"];

/** Notes per "page" of the notes card: the newest 10, then 10 more per "Show older notes". */
const NOTES_PAGE_SIZE = 10;

/**
 * Definition of the notes query. An infinite query: TanStack Query's "load more" pattern. It fetches page 1, then the
 * next page each time `fetchNextPage()` is called, and keeps every loaded page under the one key.
 */
const applicationNotesOptions = (id: string) =>
  infiniteQueryOptions({
    queryKey: queryKeys.applications.notes(id),
    queryFn: async ({ pageParam }) => {
      const { data, error, response } = await api.GET(
        "/applications/{id}/notes",
        {
          params: {
            path: { id },
            query: { page: pageParam, limit: NOTES_PAGE_SIZE },
          },
        },
      );
      if (!data) {
        throw new Error(
          apiErrorMessage(error, `Loading notes failed (${response.status}).`),
        );
      }
      return data;
    },
    initialPageParam: 1,
    // Another page exists while fewer notes are loaded than the total.
    getNextPageParam: (last) =>
      last.page * last.limit < last.total ? last.page + 1 : undefined,
  });

/** The internal notes of an application, newest first; `fetchNextPage()` loads older ones. */
export function useApplicationNotes(id: string) {
  return useInfiniteQuery(applicationNotesOptions(id));
}

/** Adds a note by the logged-in admin; the notes list refetches. */
export function useAddApplicationNote(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      const { data, error, response } = await api.POST(
        "/applications/{id}/notes",
        { params: { path: { id } }, body: { body } },
      );
      if (!data) {
        throw new Error(
          apiErrorMessage(
            error,
            `Saving the note failed (${response.status}).`,
          ),
        );
      }
      return data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.applications.notes(id),
      }),
  });
}

/** Deletes one of your own notes (the API refuses anyone else's); the notes list refetches. */
export function useDeleteApplicationNote(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (noteId: string) => {
      const { error, response } = await api.DELETE(
        "/applications/{id}/notes/{noteId}",
        { params: { path: { id, noteId } } },
      );
      // 204 has no body, so success is read from the status, not from `data`.
      if (!response.ok) {
        throw new Error(
          apiErrorMessage(
            error,
            `Deleting the note failed (${response.status}).`,
          ),
        );
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.applications.notes(id),
      }),
  });
}
