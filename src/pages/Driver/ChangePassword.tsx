import { useState, type FormEvent } from "react";
import { Navigate } from "react-router";
import { useChangePassword } from "../../api/auth.queries";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Button from "../../components/ui/button/Button";
import { useAuth } from "../../context/AuthContext";

/**
 * `/driver/change-password`. After the first login this is the only page a driver can reach
 * (RequireAuth sends them here, and the API refuses everything else) until they replace the
 * temporary password (D26).
 */
export default function ChangePassword() {
  const { user, logout } = useAuth();
  const change = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  /** A mismatch between the two new-password fields, checked before calling the API. */
  const [mismatch, setMismatch] = useState(false);

  // Done: the session user now has mustChangePassword false, so the portal opens.
  if (change.isSuccess) {
    return <Navigate to="/driver" replace />;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    change.mutate({ currentPassword, newPassword });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-theme-xs">
        <h1 className="mb-2 font-semibold text-gray-800 text-title-sm">
          Choose your password
        </h1>
        <p className="mb-6 text-sm text-gray-500">
          {user?.mustChangePassword
            ? "Replace the temporary password from your email before continuing."
            : "Change the password you log in with."}
        </p>

        {(mismatch || change.isError) && (
          <p
            role="alert"
            className="mb-6 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600"
          >
            {mismatch
              ? "The two new passwords do not match."
              : change.error?.message}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="current">Current (temporary) password</Label>
            <Input
              id="current"
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="new">New password (at least 8 characters)</Label>
            <Input
              id="new"
              type="password"
              autoComplete="new-password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="confirm">Repeat the new password</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            size="sm"
            disabled={change.isPending}
          >
            {change.isPending ? "Saving..." : "Save password"}
          </Button>
        </form>

        <button
          type="button"
          onClick={logout}
          className="mt-4 text-sm text-gray-500 hover:text-gray-700"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
