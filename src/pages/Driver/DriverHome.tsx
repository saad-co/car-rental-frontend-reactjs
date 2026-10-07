import { Link } from "react-router";
import { useAuth } from "../../context/AuthContext";

/**
 * `/driver`: PLACEHOLDER driver portal. Payments, charges, late fees, deposit and vehicles
 * (D26) come with the ledger work.
 */
export default function DriverHome() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-gray-200 bg-white p-8 shadow-theme-xs">
        <h1 className="font-semibold text-gray-800 text-title-sm">
          Driver portal
        </h1>
        <p className="text-sm text-gray-700">
          You are logged in as <strong>{user?.email}</strong>.
        </p>
        <p className="text-sm text-gray-500">
          Your payments, charges and vehicles will appear here.
        </p>
        <div className="flex gap-4 text-sm">
          <Link to="/driver/change-password" className="text-brand-500">
            Change password
          </Link>
          <button
            type="button"
            onClick={logout}
            className="text-gray-500 hover:text-gray-700"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
