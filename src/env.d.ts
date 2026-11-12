/**
 * Types for the app's environment variables. Vite exposes only variables whose name
 * starts with VITE_, reads them from .env, and bakes their values into the built
 * JavaScript, so they must never hold secrets.
 */
interface ImportMetaEnv {
  /** Base URL of the backend API, e.g. http://localhost:5000 */
  readonly VITE_API_URL: string;
  /** `"true"` hides the money screens for an investor demo (`src/demoMode.ts`). */
  readonly VITE_HIDE_FINANCIALS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
