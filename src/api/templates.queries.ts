import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "./client";
import { apiErrorMessage } from "./errors";
import { queryKeys } from "./queryClient";
import type { components } from "./schema";

/** One text template (B73), exactly as the API returns it. */
export type MessageTemplate = components["schemas"]["MessageTemplateDto"];

/** `application_approved` | `application_declined`, from the generated types. */
export type TemplateKind = MessageTemplate["kind"];

/** Definition of the templates query. */
const templatesOptions = () =>
  queryOptions({
    queryKey: queryKeys.templates.all,
    queryFn: async () => {
      const { data, error, response } = await api.GET("/message-templates");
      if (!data) {
        throw new Error(
          apiErrorMessage(
            error,
            `Loading the text templates failed (${response.status}).`,
          ),
        );
      }
      return data;
    },
  });

/** Every text template, for the Settings page and the Approve / Decline dialogs. */
export function useMessageTemplates() {
  return useQuery(templatesOptions());
}

/** Refetches the templates after any change to the list. */
function useRefreshTemplates() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.templates.all });
}

/** Adds a template of a kind (B81); the templates refetch. */
export function useCreateMessageTemplate() {
  const refresh = useRefreshTemplates();
  return useMutation({
    mutationFn: async (vars: {
      kind: TemplateKind;
      name: string;
      body: string;
    }) => {
      const { data, error, response } = await api.POST("/message-templates", {
        body: vars,
      });
      if (!data) {
        throw new Error(
          apiErrorMessage(error, `Adding failed (${response.status}).`),
        );
      }
      return data;
    },
    onSuccess: refresh,
  });
}

/** Saves a template's new name and text; the templates refetch. */
export function useUpdateMessageTemplate() {
  const refresh = useRefreshTemplates();
  return useMutation({
    mutationFn: async (vars: { id: string; name: string; body: string }) => {
      const { data, error, response } = await api.PUT(
        "/message-templates/{id}",
        {
          params: { path: { id: vars.id } },
          body: { name: vars.name, body: vars.body },
        },
      );
      if (!data) {
        throw new Error(
          apiErrorMessage(error, `Saving failed (${response.status}).`),
        );
      }
      return data;
    },
    onSuccess: refresh,
  });
}

/** Deletes a template (the API refuses the last one of a kind); the templates refetch. */
export function useDeleteMessageTemplate() {
  const refresh = useRefreshTemplates();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error, response } = await api.DELETE("/message-templates/{id}", {
        params: { path: { id } },
      });
      if (!response.ok) {
        throw new Error(
          apiErrorMessage(error, `Deleting failed (${response.status}).`),
        );
      }
    },
    onSuccess: refresh,
  });
}

/**
 * A template's text with its placeholders filled in, as the applicant will read it. Mirrors the API's own filling
 * (`MessageTemplatesService.render`), for previews only: what is sent is always filled in by the API.
 */
export function fillTemplate(
  body: string,
  values: Record<string, string>,
): string {
  return body.replace(/\{(\w+)\}/g, (whole, name: string) =>
    Object.hasOwn(values, name) ? values[name] : whole,
  );
}
