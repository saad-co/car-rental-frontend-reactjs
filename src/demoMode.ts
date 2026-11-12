/**
 * Investor-demo mode (Abulkalam, 2026-11-12, asked by the client "for a short time": he wants to show the app to investors).
 * Build the frontend with `VITE_HIDE_FINANCIALS=true` and every money screen is hidden: the "Financial views" and
 * "Payments" menu entries (and their addresses), the money cards and columns of the dashboard. Nothing is deleted: build
 * without the variable (or set it to anything else) and everything is back. A build-time value, like `VITE_API_URL`, so
 * switching it means a new build and deploy. It only hides screens; the API is unchanged.
 */
export const HIDE_FINANCIALS = import.meta.env.VITE_HIDE_FINANCIALS === "true";
