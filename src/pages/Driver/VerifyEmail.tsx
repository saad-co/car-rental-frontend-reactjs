import { Link, useSearchParams } from "react-router";
import { useVerifyEmail } from "../../api/auth.queries";
import Button from "../../components/ui/button/Button";

/**
 * `/driver/verify-email?token=...`, opened from the welcome email.
 *
 * The driver confirms with a button instead of on page load: email scanners often open links
 * automatically, and a one-time token used up by a scanner would leave the driver with a dead
 * link.
 */
export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const verify = useVerifyEmail();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-gray-200 bg-white p-8 shadow-theme-xs">
        <h1 className="font-semibold text-gray-800 text-title-sm">
          Confirm your email
        </h1>

        {verify.isSuccess ? (
          <>
            <p className="text-sm text-gray-700">
              Your email is confirmed. You can now log in with the temporary
              password from the email.
            </p>
            <Link
              to="/driver/login"
              className="inline-block font-medium text-brand-500"
            >
              Go to login →
            </Link>
          </>
        ) : !token ? (
          <p role="alert" className="text-sm text-error-600">
            This link is incomplete. Please open the link from your email again.
          </p>
        ) : (
          <>
            {verify.isError && (
              <p
                role="alert"
                className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600"
              >
                {verify.error.message}
              </p>
            )}
            <Button
              className="w-full"
              size="sm"
              disabled={verify.isPending}
              onClick={() => verify.mutate(token)}
            >
              {verify.isPending ? "Confirming..." : "Confirm my email"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
