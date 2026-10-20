import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import { useEffect, useRef } from "react";
import { CalenderIcon } from "../../icons";

// Built on TailAdmin's date picker (components/form/date-picker.tsx): the same flatpickr calendar and input look, like
// `DateRangePicker`. Changes: controlled by `value` (a `YYYY-MM-DD` text) instead of keeping its own; dark-mode
// classes removed (D20); `error` border; no built-in label (use `Label`).

interface DatePickerProps {
  id: string;
  /** The day shown, `YYYY-MM-DD`, or "" for none. */
  value: string;
  /** Called with the picked day, or "" when it is cleared. */
  onChange: (day: string) => void;
  placeholder?: string;
  /** Red border: the day is missing or not acceptable. */
  error?: boolean;
  disabled?: boolean;
}

/**
 * A calendar that picks one whole day. The day is the calendar's own label (`YYYY-MM-DD`), never an instant, so no time
 * zone can shift it.
 */
export default function DatePicker({
  id,
  value,
  onChange,
  placeholder = "Pick a date",
  error = false,
  disabled = false,
}: DatePickerProps) {
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
      mode: "single",
      static: true,
      monthSelectorType: "static",
      dateFormat: "Y-m-d",
      allowInput: false,
      onChange: (dates) => {
        onChangeRef.current(
          dates.length === 1 ? instance.formatDate(dates[0], "Y-m-d") : "",
        );
      },
    });
    picker.current = instance;
    return () => {
      instance.destroy();
      picker.current = null;
    };
  }, []);

  // Keeps the calendar in step with the form (a reset) without calling onChange.
  useEffect(() => {
    picker.current?.setDate(value || [], false);
  }, [value]);

  return (
    <div className="relative">
      <input
        ref={input}
        id={id}
        readOnly
        disabled={disabled}
        placeholder={placeholder}
        className={`h-11 w-full appearance-none rounded-lg border bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 disabled:cursor-not-allowed disabled:opacity-40 ${
          error
            ? "border-error-500 focus:border-error-300 focus:ring-error-500/20"
            : "border-gray-300 focus:border-brand-300 focus:ring-brand-500/20"
        }`}
      />
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-gray-500">
        <CalenderIcon className="size-6" />
      </span>
    </div>
  );
}
