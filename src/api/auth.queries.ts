import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import { apiErrorMessage } from "./errors";
import { queryKeys } from "./queryClient";

/** Confirms a driver's email with the token from the welcome email's link. */
export function useVerifyEmail() {
  return useMutation({
    mutationFn: async (token: string) => {
      const { error, response } = await api.POST("/auth/verify-email", {
        body: { token },
      });
      if (!response.ok) {
        throw new Error(
          apiErrorMessage(error, `Confirming failed (${response.status}).`),
        );
      }
    },
  });
}

/**
 * Changes the logged-in user's password. On success the session user is replaced with the
 * response (`mustChangePassword: false`), which lifts the forced-change screen.
 */
export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      currentPassword: string;
      newPassword: string;
    }) => {
      const { data, error, response } = await api.POST(
        "/auth/change-password",
        { body: input },
      );
      if (!data) {
        throw new Error(
          apiErrorMessage(
            error,
            `Changing the password failed (${response.status}).`,
          ),
        );
      }
      return data;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.me, user);
    },
  });
}
