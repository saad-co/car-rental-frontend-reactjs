import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import { useEffect, useRef } from "react";
import { CalenderIcon } from "../../icons";
import { cn } from "../../utils";
import type { DateRange } from "./useListParams";

// Built on TailAdmin's date picker (components/form/date-picker.tsx): the same flatpickr calendar and the same input
// look. Changes: always a range; controlled by `value` (the URL), not by its own state; dark-mode classes removed
// (D20); a "×" to clear (B82).

interface DateRangePickerProps {
  /** The days in effect now; either end can be missing. */
  value: DateRange;
  /** Called with the new range when two days are picked, or with `{}` when it is cleared. */
  onChange: (range: DateRange) => void;
  /** Names the field for screen readers, e.g. "Received between". */
  ariaLabel: string;
}

/** The days of `value` that exist, as flatpickr wants them. */
const toDates = (value: DateRange): string[] =>
  [value.from, value.to].filter((day): day is string => Boolean(day));

/**
 * A calendar that picks a range of whole days (`YYYY-MM-DD`): click the first day, then the last (the same day twice
 * is a single day). Applied as soon as the second day is picked. The days are the calendar's own labels, not
 * instants: the API counts them in Chicago time, whatever the browser's zone.
 */
export default function DateRangePicker({
  value,
  onChange,
  ariaLabel,
}: DateRangePickerProps) {
  const input = useRef<HTMLInputElement>(null);
  const picker = useRef<flatpickr.Instance | null>(null);
  // The latest callback, so the calendar (created once) never calls a stale one.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    if (!input.current) return;
    const instance = flatpickr(input.current, {
      mode: "range",
      static: true,
      monthSelectorType: "static",
      dateFormat: "Y-m-d",
      altInput: false,
      onChange: (dates) => {
        // One click in a range is "first day picked, waiting for the last": nothing to apply yet.
        if (dates.length === 2) {
          onChangeRef.current({
            from: instance.formatDate(dates[0], "Y-m-d"),
            to: instance.formatDate(dates[1], "Y-m-d"),
          });
        }
      },
    });
    picker.current = instance;
    return () => {
      instance.destroy();
      picker.current = null;
    };
  }, []);

  // Keeps the calendar in step with the URL (back button, "Clear all", a chip's ×) without calling onChange.
  const days = toDates(value).join(",");
  useEffect(() => {
    picker.current?.setDate(days ? days.split(",") : [], false);
  }, [days]);

  return (
    <div className="relative sm:w-64">
      <input
        ref={input}
        aria-label={ariaLabel}
        placeholder="Pick a date range"
        readOnly
        className={cn(
          "h-11 w-full cursor-pointer rounded-lg border border-gray-300 bg-transparent py-2.5 pr-10 pl-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden",
          days && "border-brand-300 bg-brand-25",
        )}
      />
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-gray-500">
        <CalenderIcon className="size-5" />
      </span>
    </div>
  );
}
