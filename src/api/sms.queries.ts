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
import { queryKeys } from "./queryClient";
import type { components } from "./schema";

/** A text in the chat, exactly as the API returns it. */
export type SmsMessage = components["schemas"]["SmsMessageDto"];

/** A file that came with a text. */
export type SmsAttachment = components["schemas"]["SmsAttachmentDto"];

/** A file in the Files tab. */
export type SmsFile = components["schemas"]["SmsFileDto"];

/** Whose conversation: an application's phone or a driver's phone. */
export type SmsContactKind = "applications" | "drivers";

/** How often an open chat checks for new texts and files, in milliseconds. */
const POLL_MS = 10_000;

/** Definition of the status query: its key and how to fetch it. */
const smsStatusOptions = queryOptions({
  queryKey: queryKeys.sms.status,
  queryFn: async () => {
    const { data, error, response } = await api.GET("/sms/status");
    if (!data) {
      throw new Error(
        apiErrorMessage(
          error,
          `Loading SMS status failed (${response.status}).`,
        ),
      );
    }
    return data;
  },
});

/** Definition of the chat query: pages of texts, newest page first, checked every 10 seconds. */
const smsMessagesOptions = (kind: SmsContactKind, id: string) =>
  infiniteQueryOptions({
    queryKey: queryKeys.sms.messages(kind, id),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const { data, error, response } = await api.GET(
        "/sms/{kind}/{id}/messages",
        {
          params: {
            path: { kind, id },
            query: { before: pageParam, limit: 30 },
          },
        },
      );
      if (!data) {
        throw new Error(
          apiErrorMessage(error, `Loading texts failed (${response.status}).`),
        );
      }
      return data;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    refetchInterval: POLL_MS,
  });

/** Definition of the Files tab query: one page of the contact's files, checked every 10 seconds. */
const smsFilesOptions = (kind: SmsContactKind, id: string, page: number) =>
  queryOptions({
    queryKey: queryKeys.sms.files(kind, id, page),
    queryFn: async () => {
      const { data, error, response } = await api.GET(
        "/sms/{kind}/{id}/files",
        { params: { path: { kind, id }, query: { page, limit: 24 } } },
      );
      if (!data) {
        throw new Error(
          apiErrorMessage(error, `Loading files failed (${response.status}).`),
        );
      }
      return data;
    },
    placeholderData: keepPreviousData,
    refetchInterval: POLL_MS,
  });

/** SMS mode and what is connected (`GET /sms/status`). */
export function useSmsStatus() {
  return useQuery(smsStatusOptions);
}

/**
 * The chat with one contact, newest page first, older pages on request (`fetchNextPage`). Checks for new texts
 * every 10 seconds while the card is on screen.
 */
export function useSmsMessages(kind: SmsContactKind, id: string) {
  return useInfiniteQuery(smsMessagesOptions(kind, id));
}

/** One page of the contact's files (the Files tab), newest first. */
export function useSmsFiles(kind: SmsContactKind, id: string, page: number) {
  return useQuery(smsFilesOptions(kind, id, page));
}

/** Sends a text (or, in dry-run mode, saves it). Refreshes the chat afterwards. */
export function useSendSms(kind: SmsContactKind, id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (text: string) => {
      const { data, error, response } = await api.POST(
        "/sms/{kind}/{id}/messages",
        { params: { path: { kind, id } }, body: { text } },
      );
      if (!data) {
        throw new Error(
          apiErrorMessage(error, `Sending failed (${response.status}).`),
        );
      }
      return data;
    },
    // A refused send is saved too (as "failed"), so the chat refreshes on error as well.
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.sms.messages(kind, id),
      }),
  });
}

/** Pulls the contact's history from Quo (texts sent from the Quo app too), then refreshes the chat and files. */
export function useSyncSms(kind: SmsContactKind, id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error, response } = await api.POST(
        "/sms/{kind}/{id}/sync",
        { params: { path: { kind, id } } },
      );
      if (!data) {
        throw new Error(
          apiErrorMessage(error, `Syncing texts failed (${response.status}).`),
        );
      }
      return data;
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.sms.messages(kind, id),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.sms.filesOf(kind, id),
        }),
      ]),
  });
}
