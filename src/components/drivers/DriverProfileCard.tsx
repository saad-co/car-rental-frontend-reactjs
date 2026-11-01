import { useState } from "react";
import {
  useUpdateDriverProfile,
  type DriverProfile,
} from "../../api/drivers.queries";
import { formatDay } from "../../utils";
import DatePicker from "../form/DatePicker";
import { FormChoices, FormField } from "../form/FormLayout";
import Input from "../form/input/InputField";
import ConfirmDialog from "../ui/modal/ConfirmDialog";

const YES_NO = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

/** What the edit dialog holds: every field as text, "" = not known. */
interface ProfileForm {
  middleName: string;
  street: string;
  apt: string;
  city: string;
  state: string;
  zip: string;
  dateOfBirth: string;
  hasInsurance: "" | "yes" | "no";
}

const formOf = (profile: DriverProfile): ProfileForm => ({
  middleName: profile.middleName ?? "",
  street: profile.street ?? "",
  apt: profile.apt ?? "",
  city: profile.city ?? "",
  state: profile.state ?? "",
  zip: profile.zip ?? "",
  dateOfBirth: profile.dateOfBirth ?? "",
  hasInsurance:
    profile.hasInsurance === null ? "" : profile.hasInsurance ? "yes" : "no",
});

/** The address on one or two lines, or null when none of it is known. */
function addressText(profile: DriverProfile): string | null {
  const street = [profile.street, profile.apt && `Apt ${profile.apt}`]
    .filter(Boolean)
    .join(", ");
  const place = [
    profile.city,
    [profile.state, profile.zip].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
  return [street, place].filter(Boolean).join(" · ") || null;
}

/** The edit dialog (D85). Mount it only while it is open, so the boxes start from the saved profile every time. */
function EditProfileDialog({
  driverId,
  profile,
  onClose,
}: {
  driverId: string;
  profile: DriverProfile;
  onClose: () => void;
}) {
  const update = useUpdateDriverProfile(driverId);
  const [form, setForm] = useState<ProfileForm>(formOf(profile));
  const set = (key: keyof ProfileForm, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const text = (
    key: Exclude<keyof ProfileForm, "dateOfBirth" | "hasInsurance">,
  ) => ({
    id: `profile-${key}`,
    value: form[key],
    onChange: (event: { target: { value: string } }) =>
      set(key, event.target.value),
  });

  return (
    <ConfirmDialog
      isOpen
      wide
      title="Edit profile"
      confirmLabel={update.isPending ? "Saving..." : "Save"}
      confirmDisabled={update.isPending}
      onCancel={onClose}
      onConfirm={() =>
        update.mutate(
          {
            ...form,
            // Sent empty clears a field; the insurance answer is a yes / no / not known.
            hasInsurance:
              form.hasInsurance === "" ? null : form.hasInsurance === "yes",
          },
          { onSuccess: onClose },
        )
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {update.isError && (
          <p
            role="alert"
            className="rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-600 sm:col-span-2"
          >
            {update.error.message}
          </p>
        )}
        <FormField label="Middle name" htmlFor="profile-middleName">
          <Input {...text("middleName")} autoComplete="off" />
        </FormField>
        <FormField label="Date of birth" htmlFor="profile-dateOfBirth">
          <DatePicker
            id="profile-dateOfBirth"
            value={form.dateOfBirth}
            onChange={(day) => set("dateOfBirth", day)}
          />
        </FormField>
        <FormField label="Street address" htmlFor="profile-street">
          <Input {...text("street")} autoComplete="off" />
        </FormField>
        <FormField label="Apartment no." htmlFor="profile-apt">
          <Input {...text("apt")} autoComplete="off" />
        </FormField>
        <FormField label="City" htmlFor="profile-city">
          <Input {...text("city")} autoComplete="off" />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="State" htmlFor="profile-state">
            <Input {...text("state")} autoComplete="off" />
          </FormField>
          <FormField label="ZIP" htmlFor="profile-zip">
            <Input {...text("zip")} autoComplete="off" />
          </FormField>
        </div>
        <FormField label="Do they currently have auto insurance?">
          <FormChoices
            name="profile-hasInsurance"
            options={YES_NO}
            value={form.hasInsurance}
            onChange={(value) => set("hasInsurance", value)}
          />
        </FormField>
      </div>
    </ConfirmDialog>
  );
}

/**
 * The driver's profile (D85): address, date of birth and age, current insurance. Read from the driver row in both flows
 * (copied from the application when onboarding starts, or typed when the driver was added directly), with an Edit button
 * because the website form has no middle name, state or date of birth. Sensitive: shown on this page only.
 */
export default function DriverProfileCard({
  driverId,
  profile,
}: {
  driverId: string;
  profile: DriverProfile;
}) {
  const [editing, setEditing] = useState(false);
  const rows: [string, string | null][] = [
    ["Middle name", profile.middleName],
    ["Address", addressText(profile)],
    [
      "Date of birth",
      profile.dateOfBirth
        ? `${formatDay(profile.dateOfBirth)}${profile.age === null ? "" : ` (age ${profile.age})`}`
        : null,
    ],
    [
      "Auto insurance",
      profile.hasInsurance === null
        ? null
        : profile.hasInsurance
          ? "Yes"
          : "No",
    ],
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-800">Profile</h2>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-sm font-medium text-brand-500 hover:text-brand-600"
        >
          Edit
        </button>
      </div>
      <ul className="divide-y divide-gray-100">
        {rows.map(([label, value]) => (
          <li key={label} className="flex items-start gap-5 py-2.5">
            <span className="w-1/3 text-sm text-gray-500">{label}</span>
            <span className="w-2/3 text-sm wrap-break-word text-gray-800">
              {value ?? <span className="text-gray-400">Not recorded</span>}
            </span>
          </li>
        ))}
      </ul>
      {editing && (
        <EditProfileDialog
          driverId={driverId}
          profile={profile}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}
