// Copied from TailAdmin (components/form/input/Radio.tsx). Changes: dark-mode classes removed (D20); the visible
// radio gets a keyboard focus ring (the real input is hidden, so without it Tab would show nothing).

interface RadioProps {
  /** Unique id of this radio button. */
  id: string;
  /** Name of the group; the buttons with the same name are one question. */
  name: string;
  value: string;
  checked: boolean;
  label: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

/** One round radio button with its label. Use several with the same `name` for one choice. */
const Radio: React.FC<RadioProps> = ({
  id,
  name,
  value,
  checked,
  label,
  onChange,
  className = "",
  disabled = false,
}) => {
  return (
    <label
      htmlFor={id}
      className={`relative flex cursor-pointer select-none items-center gap-3 text-sm font-medium ${
        disabled ? "cursor-not-allowed text-gray-300" : "text-gray-700"
      } ${className}`}
    >
      <input
        id={id}
        name={name}
        type="radio"
        value={value}
        checked={checked}
        onChange={() => !disabled && onChange(value)}
        className="peer sr-only"
        disabled={disabled}
      />
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full border-[1.25px] peer-focus-visible:ring-3 peer-focus-visible:ring-brand-500/20 ${
          checked
            ? "border-brand-500 bg-brand-500"
            : "border-gray-300 bg-transparent"
        } ${disabled ? "border-gray-200 bg-gray-100" : ""}`}
      >
        <span
          className={`h-2 w-2 rounded-full bg-white ${checked ? "block" : "hidden"}`}
        ></span>
      </span>
      {label}
    </label>
  );
};

export default Radio;
