import { createContext, useContext, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, tokenStorage } from "../api/client";
import { queryKeys } from "../api/queryClient";
import type { components } from "../api/schema";

/** The logged-in user, exactly as the API returns it (generated type, never hand-written). */
export type AuthUser = components["schemas"]["AuthUserDto"];

/**
 * - `loading`: a stored token is being checked with the API.
 * - `authenticated`: the token is valid and `user` is set.
 * - `unauthenticated`: no token, or the API rejected it.
 * - `error`: the API could not be reached, so we don't know yet (the token is kept).
 */
export type AuthStatus =
  | "loading"
  | "authenticated"
  | "unauthenticated"
  | "error";

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  /** Logs in; throws an Error with a readable message if it fails. */
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Reads the message from a NestJS error body ({ message: string | string[] }). */
function apiErrorMessage(error: unknown, fallback: string): string {
  const message = (error as { message?: unknown } | undefined)?.message;
  if (Array.isArray(message)) return message.join(", ");
  if (typeof message === "string") return message;
  return fallback;
}

/**
 * Provides the logged-in user to the whole app.
 *
 * The token lives in localStorage (so a refresh keeps you logged in) and is mirrored in
 * React state (so components re-render when it changes). On page load, a stored token is
 * checked with `GET /auth/me`: valid gives the user; 401 means it expired or the account
 * was deactivated, so it is removed.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(() => tokenStorage.get());

  const meQuery = useQuery({
    queryKey: queryKeys.me,
    enabled: token !== null,
    retry: false,
    staleTime: Infinity, // the user doesn't change while logged in; no refetching
    queryFn: async (): Promise<AuthUser | null> => {
      const { data, error, response } = await api.GET("/auth/me");
      if (response.status === 401) {
        tokenStorage.clear();
        setToken(null);
        return null;
      }
      if (!data) {
        throw new Error(
          apiErrorMessage(error, `Checking login failed (${response.status}).`),
        );
      }
      return data;
    },
  });

  const login = async (email: string, password: string): Promise<void> => {
    const { data, error } = await api.POST("/auth/login", {
      body: { email, password },
    });
    if (!data) {
      throw new Error(apiErrorMessage(error, "Login failed."));
    }
    tokenStorage.set(data.accessToken);
    // We already know the user from the login response, so put it straight into the
    // cache instead of calling /auth/me again.
    queryClient.setQueryData(queryKeys.me, data.user);
    setToken(data.accessToken);
  };

  const logout = (): void => {
    tokenStorage.clear();
    setToken(null);
    // Forget all cached server data so the next user never sees the previous one's.
    queryClient.clear();
  };

  const user = token !== null ? (meQuery.data ?? null) : null;

  let status: AuthStatus;
  if (token === null) status = "unauthenticated";
  else if (meQuery.isError) status = "error";
  else if (meQuery.isPending) status = "loading";
  else status = user ? "authenticated" : "unauthenticated";

  return (
    <AuthContext.Provider value={{ user, status, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Access the logged-in user and login/logout from any component inside AuthProvider. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
