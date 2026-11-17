import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { UploadRequest } from "../pages/Inspection/captureSession";
import { api } from "./client";
import { apiErrorMessage } from "./errors";
import { queryKeys } from "./queryClient";
import type { components } from "./schema";

/**
 * The public side of the vehicle photos (Module 3): what the driver's phone reads and sends through the texted link. No login:
 * the link is the credential, so these calls carry only the token in the path.
 */

/** What `GET /i/:token` answers: the state of the link and, when open, everything the page needs. */
export type CaptureState = components["schemas"]["CaptureStateDto"];

/** The answer of the submit call. */
export type SubmittedInspection =
  components["schemas"]["SubmittedInspectionDto"];

/**
 * An error that remembers the HTTP status. The upload queue reads `status` to tell "the server refused" (stop, show a retry
 * button) from "no signal" (a `TypeError` with no status: keep trying).
 */
function httpError(message: string, status: number): Error {
  return Object.assign(new Error(message), { status });
}

const stateOptions = (token: string) =>
  queryOptions({
    queryKey: queryKeys.inspectionCapture(token),
    queryFn: async () => {
      const { data, error, response } = await api.GET("/i/{token}", {
        params: { path: { token } },
      });
      if (!data) {
        throw httpError(
          apiErrorMessage(
            error,
            `Loading the page failed (${response.status}).`,
          ),
          response.status,
        );
      }
      return data;
    },
    // The page keeps its own copy of what the driver does: never refetch under their hands, only on a reload.
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

/** Loads the state of one link. A weak signal gets a few more tries before the page shows its error. */
export function useCaptureState(token: string) {
  return useQuery({ ...stateOptions(token), retry: 3 });
}

/**
 * Reads the link's state again. Used when the server says the link closed while the driver was working (expired, revoked or
 * already submitted), so the page swaps to the matching screen.
 */
export function useReloadCaptureState(token: string) {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.inspectionCapture(token),
    });
}

/**
 * Sends one photo, and/or the note that goes with it, as multipart form data. A damage close-up goes as `DAMAGE` with its shot
 * (`parentShotId`) and number (D112). Built by hand because the
 * generated type of a file is a text, so the `FormData` is handed over with a cast; the client sends it as it is and the browser
 * sets the multipart boundary. Repeating a request is safe: the server keeps one photo per slot.
 */
export function useUploadCapturePhoto(token: string) {
  return useMutation({
    mutationFn: async (request: UploadRequest) => {
      const body = new FormData();
      if (request.file) body.append("photo", request.file, "photo.jpg");
      if (request.parentShotId) {
        body.append("parentShotId", request.parentShotId);
        body.append("position", String(request.position));
      }
      if (request.note !== undefined) body.append("note", request.note);
      if (request.capturedAt) body.append("capturedAt", request.capturedAt);
      const { data, error, response } = await api.PUT(
        "/i/{token}/photos/{shotId}",
        {
          params: { path: { token, shotId: request.shotId } },
          body: body as never,
        },
      );
      if (!data) {
        throw httpError(
          apiErrorMessage(error, `Uploading failed (${response.status}).`),
          response.status,
        );
      }
      return data;
    },
  });
}

/**
 * Saves the driver's answer to "Is there any damage in this photo?" for one shot (D112). Sent at once, not queued: the page waits
 * for it before moving on, and shows the error when it fails.
 */
export function useAnswerDamage(token: string) {
  return useMutation({
    mutationFn: async (input: { shotId: string; hasDamage: boolean }) => {
      const { data, error, response } = await api.PUT(
        "/i/{token}/shots/{shotId}/damage-answer",
        {
          params: { path: { token, shotId: input.shotId } },
          body: { hasDamage: input.hasDamage },
        },
      );
      if (!data) {
        throw httpError(
          apiErrorMessage(
            error,
            `Saving the answer failed (${response.status}).`,
          ),
          response.status,
        );
      }
      return data;
    },
  });
}

/** Closes the inspection: the photos and answers are already on the server, this sends the checkbox, the place and the device. */
export function useSubmitCapture(token: string) {
  return useMutation({
    mutationFn: async (body: components["schemas"]["SubmitInspectionDto"]) => {
      const { data, error, response } = await api.POST("/i/{token}/submit", {
        params: { path: { token } },
        body,
      });
      if (!data) {
        throw httpError(
          apiErrorMessage(error, `Submitting failed (${response.status}).`),
          response.status,
        );
      }
      return data;
    },
  });
}

/**
 * Saves the language the driver chose on the driver record. The page already changed language on screen, so a failure here
 * must not stop the driver: it is written to the console and otherwise ignored (the choice is also kept on the phone).
 */
export function useSetCaptureLanguage(token: string) {
  return useMutation({
    mutationFn: async (language: "en" | "es") => {
      const { error, response } = await api.POST("/i/{token}/language", {
        params: { path: { token } },
        body: { language },
      });
      if (!response.ok) {
        throw httpError(
          apiErrorMessage(
            error,
            `Saving the language failed (${response.status}).`,
          ),
          response.status,
        );
      }
    },
    onError: (error) => {
      console.warn("The language choice was not saved on the server.", error);
    },
  });
}
