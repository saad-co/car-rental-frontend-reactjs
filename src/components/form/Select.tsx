import { cn } from "../../utils";

/** One choice of a `Select`. */
export interface SelectOption {
  value: string;
  label: string;
}

/** A labelled group of choices (`<optgroup>`), e.g. "Charges" and "Credits". */
export interface SelectGroup {
  label: string;
  options: SelectOption[];
}

interface SelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  /** Either flat options or groups. */
  options?: SelectOption[];
  groups?: SelectGroup[];
  /** Shown first with an empty value until something is picked. */
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}

/**
 * A controlled native `<select>` in TailAdmin's input look (same classes as `InputField` and the select in
 * `FilterDropdown`). TailAdmin's own `form/Select.tsx` is uncontrolled and has no groups, so this is written for
 * forms that need both. No `dark:` classes (D20).
 */
export default function Select({
  id,
  value,
  onChange,
  options = [],
  groups = [],
  placeholder,
  disabled = false,
  error = false,
  className,
}: SelectProps) {
  const option = (o: SelectOption) => (
    <option key={o.value} value={o.value}>
      {o.label}
    </option>
  );
  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-11 w-full appearance-none rounded-lg border bg-white px-4 pr-10 text-sm shadow-theme-xs focus:ring-3 focus:outline-hidden disabled:cursor-not-allowed disabled:bg-gray-100",
        "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='none'%3E%3Cpath stroke='%23667085' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m5 7.5 5 5 5-5'/%3E%3C/svg%3E\")] bg-[length:20px] bg-[right_12px_center] bg-no-repeat",
        error
          ? "border-error-500 focus:ring-error-500/10"
          : "border-gray-300 focus:border-brand-300 focus:ring-brand-500/10",
        value === "" ? "text-gray-400" : "text-gray-800",
        className,
      )}
    >
      {placeholder !== undefined && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map(option)}
      {groups.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.options.map(option)}
        </optgroup>
      ))}
    </select>
  );
}
