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
export type TemplateKey = MessageTemplate["key"];

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

/** Every text template, for the Settings page and the decline dialog's preview. */
export function useMessageTemplates() {
  return useQuery(templatesOptions());
}

/** Saves a template's new text; the templates refetch. */
export function useUpdateMessageTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { key: TemplateKey; body: string }) => {
      const { data, error, response } = await api.PUT(
        "/message-templates/{key}",
        { params: { path: { key: vars.key } }, body: { body: vars.body } },
      );
      if (!data) {
        throw new Error(
          apiErrorMessage(error, `Saving failed (${response.status}).`),
        );
      }
      return data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.templates.all }),
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
