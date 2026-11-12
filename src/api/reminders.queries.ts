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

/** The payment-reminder settings (Fleet revisions section 6): the switch, the payment link and how texting is set up. */
export type ReminderSettings = components["schemas"]["ReminderSettingsDto"];

/** One reminder sent (or composed, or refused) to a driver. */
export type ReminderLog = components["schemas"]["ReminderLogDto"];

/** Definition of the settings query. */
const reminderSettingsOptions = () =>
  queryOptions({
    queryKey: queryKeys.reminders.settings,
    queryFn: async () => {
      const { data, error, response } = await api.GET("/settings/reminders");
      if (!data) {
        throw new Error(
          apiErrorMessage(
            error,
            `Loading the reminder settings failed (${response.status}).`,
          ),
        );
      }
      return data;
    },
  });

/** The reminder switch and payment link. */
export function useReminderSettings() {
  return useQuery(reminderSettingsOptions());
}

/** Saves the reminder switch and the payment link (`null` or empty clears the link). */
export function useSaveReminderSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      enabled: boolean;
      paymentLink: string | null;
    }) => {
      const { data, error, response } = await api.PUT("/settings/reminders", {
        body,
      });
      if (!data) {
        throw new Error(
          apiErrorMessage(error, `Saving failed (${response.status}).`),
        );
      }
      return data;
    },
    onSuccess: (data) =>
      queryClient.setQueryData(queryKeys.reminders.settings, data),
  });
}

/** Reminders per page of the driver's Reminders card. */
const REMINDERS_PAGE_SIZE = 10;

/** One page of the reminders sent to a driver, newest first. */
export function useDriverReminders(id: string, page: number) {
  return useQuery(
    queryOptions({
      queryKey: [...queryKeys.reminders.driver(id), page] as const,
      queryFn: async () => {
        const { data, error, response } = await api.GET(
          "/drivers/{id}/reminders",
          {
            params: {
              path: { id },
              query: { page, limit: REMINDERS_PAGE_SIZE },
            },
          },
        );
        if (!data) {
          throw new Error(
            apiErrorMessage(
              error,
              `Loading reminders failed (${response.status}).`,
            ),
          );
        }
        return data;
      },
      placeholderData: keepPreviousData,
    }),
  );
}
