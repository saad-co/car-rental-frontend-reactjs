import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth, type AuthUser } from "../../context/AuthContext";

/** Path of the forced change-password page for drivers. */
const DRIVER_CHANGE_PASSWORD_PATH = "/driver/change-password";

/**
 * Route guard: renders the child routes (`<Outlet />`) only for a logged-in user of `role`.
 *
 * This is the browser's version of an auth middleware in front of a group of routes. It only
 * decides what to show; the real protection is the API (401 / 403). Someone who bypasses this
 * component sees no data.
 *
 * - `loading`: a stored token is being checked; show a placeholder instead of flashing login.
 * - `error`: the API could not be reached; offer a retry (the token is kept).
 * - `unauthenticated`: go to this area's login page (also after Sign out or an expired token).
 * - wrong role (e.g. a driver in the admin app): say so, with Sign out.
 * - a driver who must change their password only reaches the change-password page (D26).
 */
export default function RequireAuth({ role }: { role: AuthUser["role"] }) {
  const { status, user, logout } = useAuth();
  const location = useLocation();

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

  if (status === "unauthenticated" || !user) {
    return <Navigate to={`/${role}/login`} replace />;
  }

  if (user.role !== role) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-sm text-gray-700">
        <p>This account cannot use this part of the site.</p>
        <button
          type="button"
          onClick={logout}
          className="font-medium text-brand-500 hover:text-brand-600"
        >
          Sign out
        </button>
      </div>
    );
  }

  if (
    user.mustChangePassword &&
    location.pathname !== DRIVER_CHANGE_PASSWORD_PATH
  ) {
    return <Navigate to={DRIVER_CHANGE_PASSWORD_PATH} replace />;
  }

  return <Outlet />;
}
