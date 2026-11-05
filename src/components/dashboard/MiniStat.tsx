import { cn } from "../../utils";

/** A small boxed figure inside a dashboard card (a smaller sibling of `StatTile`). `value` arrives formatted. */
export default function MiniStat({
  label,
  value,
  hint,
  valueClassName,
}: {
  label: string;
  value: string;
  hint?: string;
  /** Colours the value, e.g. `text-error-600`. */
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-gray-200 px-3 py-2.5">
      <p className="truncate text-theme-xs text-gray-500">{label}</p>
      <p
        className={cn(
          "num mt-0.5 truncate text-base font-semibold text-gray-800",
          valueClassName,
        )}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-0.5 truncate text-theme-xs text-gray-500">{hint}</p>
      )}
    </div>
  );
}
