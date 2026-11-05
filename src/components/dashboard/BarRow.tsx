import { cn } from "../../utils";

/**
 * One row of a "bars" card (payment sources, weekdays, the application funnel): a label and a value on one line, a thin
 * bar under them, and a small hint line. `value` and `hint` arrive formatted; `widthPercent` is how full the bar is
 * (0-100, a drawing width the page works out from the server's figures, never an amount).
 *
 * Built from plain markup in the style of TailAdmin's `analytics/TopChannel.tsx` rows, which have no chart library.
 */
export default function BarRow({
  label,
  value,
  hint,
  widthPercent,
  barClassName = "bg-brand-500",
}: {
  label: string;
  value: string;
  hint?: string;
  widthPercent: number;
  /** A Tailwind background class for the bar, e.g. `bg-success-500`. */
  barClassName?: string;
}) {
  // A tiny share still shows a sliver, so a row with a value never looks empty; a zero stays empty.
  const width =
    widthPercent <= 0 ? 0 : Math.min(100, Math.max(2, widthPercent));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-theme-sm font-medium text-gray-800">
          {label}
        </span>
        <span className="num shrink-0 text-theme-sm text-gray-800">
          {value}
        </span>
      </div>
      <div
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100"
        role="presentation"
      >
        <div
          className={cn("h-full rounded-full", barClassName)}
          style={{ width: `${width}%` }}
        />
      </div>
      {hint && <p className="mt-1 text-theme-xs text-gray-500">{hint}</p>}
    </div>
  );
}
