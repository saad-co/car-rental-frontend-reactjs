import type { ReactNode } from "react";
import { Link } from "react-router";
import { ChevronLeftIcon } from "../../../icons";

// TailAdmin's "Back to dashboard" link (components/auth/SignInForm.tsx: ChevronLeftIcon + text), drawn as its outline
// button (components/ui/button/Button.tsx, `outline` at a smaller size) so it reads as a button on the dark pages (B112).

/** The bordered "← Back to ..." button at the top of a page. */
export default function BackLink({
  to,
  children,
}: {
  to: string;
  /** The label, e.g. "Back to applications". */
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-surface py-2 pr-3.5 pl-2.5 text-sm font-medium text-gray-700 ring-1 ring-gray-300 transition ring-inset hover:bg-gray-100 hover:text-gray-900 print:hidden"
    >
      <ChevronLeftIcon className="size-5" />
      {children}
    </Link>
  );
}
