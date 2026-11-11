// Copied from TailAdmin (components/form/switch/Switch.tsx). Changes: dark-mode classes removed (D20); controlled
// (`checked` instead of its own state, so the page shows what the server saved); a real `<input type="checkbox">` with
// `role="switch"` so it works with the keyboard and screen readers; the blue/gray colour option dropped (one look).

interface SwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

/** An on/off switch with its label (TailAdmin's look). */
const Switch: React.FC<SwitchProps> = ({
  label,
  checked,
  onChange,
  disabled = false,
}) => (
  <label
    className={`flex select-none items-center gap-3 text-sm font-medium ${
      disabled
        ? "cursor-not-allowed text-gray-400"
        : "cursor-pointer text-gray-700"
    }`}
  >
    <span className="relative">
      <input
        type="checkbox"
        role="switch"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span
        className={`block h-6 w-11 rounded-full transition duration-150 ease-linear peer-focus-visible:ring-3 peer-focus-visible:ring-brand-500/30 ${
          checked ? "bg-brand-500" : "bg-gray-200"
        } ${disabled ? "opacity-50" : ""}`}
      />
      <span
        className={`absolute left-0.5 top-0.5 h-5 w-5 transform rounded-full bg-white shadow-theme-sm duration-150 ease-linear ${
          checked ? "translate-x-full" : "translate-x-0"
        }`}
      />
    </span>
    {label}
  </label>
);

export default Switch;
