import type { ReactNode } from "react";
import Button from "../ui/button/Button";
import Spinner from "../ui/spinner/Spinner";

/**
 * Loading, error and empty states for a dashboard card that loads its own data (the two queues). The card's frame stays;
 * only its inside changes, so one failing list never blanks the page. `children` shows when there is data.
 */
export default function QueryState({
  isPending,
  error,
  onRetry,
  isEmpty,
  emptyText,
  children,
}: {
  isPending: boolean;
  /** The error from the query, if it failed. */
  error: Error | null;
  onRetry: () => void;
  isEmpty: boolean;
  emptyText: string;
  children: ReactNode;
}) {
  if (isPending) {
    return (
      <div className="flex items-center gap-2 py-6 text-theme-sm text-gray-500">
        <Spinner /> Loading…
      </div>
    );
  }
  if (error) {
    return (
      <div role="alert" className="py-4">
        <p className="text-theme-sm text-error-600">{error.message}</p>
        <div className="mt-3">
          <Button size="sm" variant="outline" onClick={onRetry}>
            Try again
          </Button>
        </div>
      </div>
    );
  }
  if (isEmpty) {
    return <p className="py-6 text-theme-sm text-gray-500">{emptyText}</p>;
  }
  return <>{children}</>;
}
