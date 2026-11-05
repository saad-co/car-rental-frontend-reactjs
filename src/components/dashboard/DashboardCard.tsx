import type { ReactNode } from "react";
import { Link } from "react-router";
import { cn } from "../../utils";

/**
 * A titled card of the dashboard (the same `bg-surface border rounded-2xl` as every other card), with an optional link
 * in the corner to the page the card summarises ("Payments", "Resolve", "Open Drivers").
 */
export default function DashboardCard({
  title,
  subtitle,
  link,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  /** The corner link: where it goes and what it says. */
  link?: { to: string; label: string };
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-2xl border border-gray-200 bg-surface p-5",
        className,
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-gray-800">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-theme-xs text-gray-500">{subtitle}</p>
          )}
        </div>
        {link && (
          <Link
            to={link.to}
            className="shrink-0 text-theme-sm font-medium text-brand-500 hover:text-brand-600"
          >
            {link.label}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
