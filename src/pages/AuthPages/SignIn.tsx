import { useState, type FormEvent } from "react";
import { Navigate } from "react-router";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Button from "../../components/ui/button/Button";
import { useAuth, type AuthUser } from "../../context/AuthContext";

// Based on TailAdmin's SignIn page + SignInForm, trimmed to email and password only:
// no social logins, "keep me logged in", "forgot password" or sign-up link (none exist yet),
// and a single centred column instead of the two-column AuthPageLayout.

/** Where each kind of user lands after logging in. */
function homeFor(user: AuthUser): string {
  if (user.role === "admin") return "/admin";
  return user.mustChangePassword ? "/driver/change-password" : "/driver";
}

/**
 * Login page, used by both areas: `/admin/login` (role `admin`) and `/driver/login`
 * (role `driver`).
 *
 * On submit it calls `login()` from AuthContext. A login with the wrong kind of account (e.g.
 * a driver on the admin login) is signed out again with a message. On success there is no
 * explicit redirect: the auth status becomes "authenticated", this component re-renders, and
 * the `<Navigate>` at the top sends the user to their home page. The same check also sends an
 * already logged-in user away from this page.
 */
export default function SignIn({ role }: { role: AuthUser["role"] }) {
  const { status, user, login, logout } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  /** The API's error message (e.g. "Invalid email or password."), shown above the form. */
  const [error, setError] = useState<string | null>(null);
  /** True while the login request is in flight; disables the button so it can't be sent twice. */
  const [submitting, setSubmitting] = useState(false);

  if (status === "authenticated" && user?.role === role) {
    return <Navigate to={homeFor(user)} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // stop the browser's default full-page form POST
    setError(null);
    setSubmitting(true);
    try {
      const loggedIn = await login(email, password);
      if (loggedIn.role !== role) {
        logout();
        setError(
          role === "admin"
            ? "This login is for admins. Drivers log in at /driver/login."
            : "This login is for drivers.",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-theme-xs">
        <div className="mb-5 sm:mb-8">
          <h1 className="mb-2 font-semibold text-gray-800 text-title-sm">
            {role === "admin" ? "Admin sign in" : "Driver sign in"}
          </h1>
          <p className="text-sm text-gray-500">
            Enter your email and password to sign in.
          </p>
        </div>

        {error && (
          <p
            role="alert"
            className="mb-6 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600"
          >
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div>
              <Label htmlFor="email">
                Email <span className="text-error-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="password">
                Password <span className="text-error-500">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              size="sm"
              disabled={submitting}
            >
              {submitting ? "Signing in..." : "Sign in"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
