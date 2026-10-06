import createClient from "openapi-fetch";
import type { paths } from "./schema";

/** The key under which the login token is kept in the browser's localStorage. */
const TOKEN_STORAGE_KEY = "carRental.accessToken";

/**
 * Reads, saves and clears the login token kept in the browser.
 * localStorage survives page refreshes, so the user stays logged in until the token
 * expires or they log out.
 */
export const tokenStorage = {
  get: (): string | null => localStorage.getItem(TOKEN_STORAGE_KEY),
  set: (token: string): void => localStorage.setItem(TOKEN_STORAGE_KEY, token),
  clear: (): void => localStorage.removeItem(TOKEN_STORAGE_KEY),
};

/**
 * The one HTTP client for the backend API. Every API call in the app goes through it.
 *
 * `paths` is generated from the backend's openapi.json (`npm run api:generate`), so
 * each call is checked by TypeScript: the URL must exist, the body must have the right
 * fields, and the response comes back fully typed. No API types are written by hand.
 */
export const api = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_URL,
});

// Middleware: runs before every request and adds the token, if there is one.
api.use({
  onRequest({ request }) {
    const token = tokenStorage.get();
    if (token) {
      request.headers.set("Authorization", `Bearer ${token}`);
    }
    return request;
  },
});
