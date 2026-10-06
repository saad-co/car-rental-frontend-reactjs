import { Navigate, Outlet } from "react-router";
import { useAuth } from "../../context/AuthContext";

/**
 * Route guard: renders the child routes (`<Outlet />`) only for a logged-in user.
 *
 * This is the browser's version of an auth middleware in front of a group of routes. It only
 * decides what to show; the real protection is the API, which rejects requests without a valid
 * token. Someone who bypasses this component still gets 401s and sees no data.
 *
 * - `loading`: a stored token is being checked with `GET /auth/me`; show a placeholder instead
 *   of flashing the login page.
 * - `error`: the API could not be reached; offer a retry (the token is kept).
 * - `unauthenticated`: go to the login page. This also covers Sign out and an expired token.
 */
export default function RequireAuth() {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">
        Loading...
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-sm text-gray-700">
        <p>Could not reach the server.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="font-medium text-brand-500 hover:text-brand-600"
        >
          Try again
        </button>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
}
