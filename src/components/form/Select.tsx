// Copied from TailAdmin (components/form/Select.tsx). Changes: dark-mode classes removed (D20); controlled (`value`
// instead of its own state, so the parent can reset it); `id` and `ariaLabel` added so it can be labelled; `disabled`.

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  options: Option[];
  /** The chosen option's value; "" shows the placeholder. */
  value: string;
  onChange: (value: string) => void;
  /** Called when the list loses focus; used to show a problem once the user has left it. */
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  id?: string;
  /** Name read by screen readers when there is no visible label. */
  ariaLabel?: string;
  disabled?: boolean;
}

/** A styled dropdown list (a native `<select>`), with TailAdmin's chevron. */
const Select: React.FC<SelectProps> = ({
  options,
  value,
  onChange,
  onBlur,
  placeholder = "Select an option",
  className = "",
  id,
  ariaLabel,
  disabled = false,
}) => (
  <div className="relative">
    <select
      id={id}
      aria-label={ariaLabel}
      disabled={disabled}
      className={`h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-40 ${
        value ? "text-gray-800" : "text-gray-400"
      } ${className}`}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
    >
      <option value="" disabled className="text-gray-700">
        {placeholder}
      </option>
      {options.map((option) => (
        <option
          key={option.value}
          value={option.value}
          className="text-gray-700"
        >
          {option.label}
        </option>
      ))}
    </select>
    <svg
      className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-gray-700"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M4.79175 8.02075L10.0001 13.2291L15.2084 8.02075"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </div>
);

export default Select;
