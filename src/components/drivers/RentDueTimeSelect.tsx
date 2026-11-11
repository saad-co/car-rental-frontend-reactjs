import { useState } from "react";
import { formatTimeOfDay } from "../../utils";
import Select from "../form/Select";
import Input from "../form/input/InputField";

/** The client's dropdown (Dashboard doc, driver setup): 12, 1, 3, 6 and 8 PM, plus any other time. */
const PRESETS = ["12:00", "13:00", "15:00", "18:00", "20:00"];

const OPTIONS = [
  { value: "none", label: "Not set" },
  ...PRESETS.map((time) => ({ value: time, label: formatTimeOfDay(time) })),
  { value: "other", label: "Other time…" },
];

/**
 * Picks the time of day rent is due (Chicago time, D92). `value` is `HH:MM` (24 hours) or "" for not set. "Other time"
 * shows a time box. Used on the driver page and on the Add driver form.
 */
export default function RentDueTimeSelect({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  // "Other" is a mode of its own: an empty time box must stay open while the admin is about to type.
  const [other, setOther] = useState(value !== "" && !PRESETS.includes(value));
  const selected = other ? "other" : value === "" ? "none" : value;

  return (
    <div className="space-y-3">
      <Select
        id={id}
        options={OPTIONS}
        value={selected}
        disabled={disabled}
        onChange={(choice) => {
          if (choice === "other") {
            setOther(true);
            return;
          }
          setOther(false);
          onChange(choice === "none" ? "" : choice);
        }}
      />
      {other && (
        <div>
          <label htmlFor={`${id}-other`} className="sr-only">
            Time rent is due
          </label>
          <Input
            id={`${id}-other`}
            type="time"
            value={value}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
      )}
    </div>
  );
}
