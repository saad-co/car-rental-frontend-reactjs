import {
  infiniteQueryOptions,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "./client";
import { apiErrorMessage } from "./errors";
import { queryKeys } from "./queryClient";
import type { components } from "./schema";

/** One internal note about a driver's account (Fleet revisions section 5), exactly as the API returns it. */
export type DriverNote = components["schemas"]["DriverNoteDto"];

/** Notes per "page" of the notes card: the newest 10, then 10 more per "Show older notes". */
const NOTES_PAGE_SIZE = 10;

/** Definition of the notes query: an infinite query, like the application notes (B74). */
const driverNotesOptions = (id: string) =>
  infiniteQueryOptions({
    queryKey: queryKeys.drivers.notes(id),
    queryFn: async ({ pageParam }) => {
      const { data, error, response } = await api.GET("/drivers/{id}/notes", {
        params: {
          path: { id },
          query: { page: pageParam, limit: NOTES_PAGE_SIZE },
        },
      });
      if (!data) {
        throw new Error(
          apiErrorMessage(error, `Loading notes failed (${response.status}).`),
        );
      }
      return data;
    },
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.limit < last.total ? last.page + 1 : undefined,
  });

/** The internal notes of a driver's account, newest first; `fetchNextPage()` loads older ones. */
export function useDriverNotes(id: string) {
  return useInfiniteQuery(driverNotesOptions(id));
}

/** Adds a note by the logged-in admin; the notes list refetches. */
export function useAddDriverNote(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      const { data, error, response } = await api.POST("/drivers/{id}/notes", {
        params: { path: { id } },
        body: { body },
      });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.drivers.notes(id) }),
  });
}

/** Deletes one of your own notes (the API refuses anyone else's); the notes list refetches. */
export function useDeleteDriverNote(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (noteId: string) => {
      const { error, response } = await api.DELETE(
        "/drivers/{id}/notes/{noteId}",
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
      queryClient.invalidateQueries({ queryKey: queryKeys.drivers.notes(id) }),
  });
}
