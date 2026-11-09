import BackLink from "../../components/ui/button/BackLink";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useCreateDriver, type AliasType } from "../../api/drivers.queries";
import DatePicker from "../../components/form/DatePicker";
import {
  FormChoices as Choices,
  FormField as Field,
  FormSection as Section,
} from "../../components/form/FormLayout";
import FileInput from "../../components/form/input/FileInput";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";
import { ALIAS_TYPE_LABEL } from "../../components/payments/paymentLabels";
import Button from "../../components/ui/button/Button";
import { FILE_ACCEPT } from "../Applications/websiteForm";
import {
  EMPTY_DRIVER_VALUES,
  ageOn,
  toFormData,
  validate,
  type DriverFormErrors,
  type DriverFormFiles,
  type DriverFormValues,
  type PaymentRow,
} from "./driverForm";

type TextKey = Exclude<keyof DriverFormValues, "hasInsurance" | "dateOfBirth">;

/** The payment methods to choose from, in display order. */
const METHOD_OPTIONS = (Object.keys(ALIAS_TYPE_LABEL) as AliasType[]).map(
  (value) => ({ value, label: ALIAS_TYPE_LABEL[value] }),
);

/** What to type for each method, as a hint in the box. */
const PLACEHOLDER: Record<AliasType, string> = {
  zelle: "Name on the Zelle payment",
  cashapp: "$cashtag or the name shown",
  venmo: "@username or the name shown",
  chime: "Name or $ChimeSign",
  stripe: "Payer name or email",
  email: "name@example.com",
  phone: "3125550123",
};

const YES_NO = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

const newRow = (): PaymentRow => ({
  key: crypto.randomUUID(),
  type: "zelle",
  value: "",
});

/**
 * Adds a driver directly, without an application (D85): the fields the client asked for, on one page. Only the name,
 * email and phone are required; the rest can be filled in later (Edit profile on the driver page). Saving creates the
 * driver in onboarding with no login, and sends no text. A problem shows under its field once the field has been
 * visited; Save marks the rest. Nothing is created until Save.
 */
export default function NewDriver() {
  const navigate = useNavigate();
  const create = useCreateDriver();
  const [values, setValues] = useState<DriverFormValues>(EMPTY_DRIVER_VALUES);
  const [files, setFiles] = useState<DriverFormFiles>({
    license: null,
    earnings: null,
  });
  const [payments, setPayments] = useState<PaymentRow[]>([newRow()]);
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);

  const errors = validate(values, files);
  const problemCount = Object.keys(errors).length;
  const shown: DriverFormErrors = Object.fromEntries(
    Object.entries(errors).filter(([key]) => submitted || touched.has(key)),
  );
  const age = ageOn(values.dateOfBirth);

  const touch = (key: string) =>
    setTouched((current) => new Set(current).add(key));
  const text = (key: TextKey) => ({
    id: key,
    name: key,
    value: values[key],
    error: Boolean(shown[key]),
    onChange: (event: { target: { value: string } }) =>
      setValues((current) => ({ ...current, [key]: event.target.value })),
    onBlur: () => touch(key),
  });
  const updateRow = (key: string, changes: Partial<PaymentRow>) =>
    setPayments((rows) =>
      rows.map((row) => (row.key === key ? { ...row, ...changes } : row)),
    );

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (problemCount > 0) {
      setTimeout(
        () =>
          document
            .querySelector('[data-invalid="true"]')
            ?.scrollIntoView({ block: "center", behavior: "smooth" }),
        0,
      );
      return;
    }
    create.mutate(toFormData(values, files, payments), {
      onSuccess: (driver) => void navigate(`/admin/drivers/${driver.id}`),
    });
  };

  const fileField = (
    kind: keyof DriverFormFiles,
    label: string,
    hint: string,
  ) => (
    <Field
      label={label}
      htmlFor={`${kind}_file`}
      error={shown[kind]}
      hint={hint}
    >
      <FileInput
        id={`${kind}_file`}
        accept={FILE_ACCEPT}
        error={Boolean(shown[kind])}
        onChange={(event) => {
          setFiles((current) => ({
            ...current,
            [kind]: event.target.files?.[0] ?? null,
          }));
          touch(kind);
        }}
      />
    </Field>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <div>
        <BackLink to="/admin/drivers">Drivers</BackLink>
        <h1 className="mt-4 text-xl font-semibold text-gray-800">Add driver</h1>
        <p className="mt-1 text-sm text-gray-500">
          Adds a driver straight away, without an application. They start in
          onboarding; no login is created and no text is sent. Only the name,
          email and phone are required.
        </p>
      </div>

      {submitted && problemCount > 0 && (
        <p
          role="alert"
          className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600"
        >
          {problemCount === 1
            ? "One answer needs fixing (marked below)."
            : `${problemCount} answers need fixing (marked below).`}
        </p>
      )}
      {create.isError && (
        <p
          role="alert"
          className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600"
        >
          {create.error.message}
        </p>
      )}

      {/* A disabled fieldset switches off every control inside it while saving. */}
      <fieldset disabled={create.isPending} className="min-w-0 space-y-6">
        <Section
          number={1}
          title="Who they are"
          description="Name, how to reach them, date of birth."
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Field
              label="First name"
              htmlFor="firstName"
              required
              error={shown.firstName}
            >
              <Input {...text("firstName")} autoComplete="off" />
            </Field>
            <Field label="Middle name" htmlFor="middleName">
              <Input {...text("middleName")} autoComplete="off" />
            </Field>
            <Field
              label="Last name"
              htmlFor="lastName"
              required
              error={shown.lastName}
            >
              <Input {...text("lastName")} autoComplete="off" />
            </Field>
            <Field
              label="Phone (US)"
              htmlFor="phone"
              required
              error={shown.phone}
              hint="10 digits"
            >
              <Input
                {...text("phone")}
                type="tel"
                placeholder="5551234567"
                autoComplete="off"
              />
            </Field>
            <Field
              label="Email"
              htmlFor="email"
              required
              error={shown.email}
              className="sm:col-span-2"
            >
              <Input {...text("email")} type="email" autoComplete="off" />
            </Field>
            <Field
              label="Date of birth"
              htmlFor="dateOfBirth"
              error={shown.dateOfBirth}
            >
              <DatePicker
                id="dateOfBirth"
                value={values.dateOfBirth}
                onChange={(day) => {
                  setValues((current) => ({ ...current, dateOfBirth: day }));
                  touch("dateOfBirth");
                }}
                error={Boolean(shown.dateOfBirth)}
              />
            </Field>
            <Field
              label="Age"
              htmlFor="age"
              hint="Worked out from the date of birth"
            >
              <Input
                id="age"
                value={age === null ? "" : String(age)}
                placeholder="—"
                disabled
              />
            </Field>
            <Field label="Do they currently have auto insurance?">
              <Choices
                name="hasInsurance"
                options={YES_NO}
                value={values.hasInsurance}
                onChange={(value) =>
                  setValues((current) => ({
                    ...current,
                    hasInsurance: value as DriverFormValues["hasInsurance"],
                  }))
                }
              />
            </Field>
          </div>
        </Section>

        <Section
          number={2}
          title="Address"
          description="Where the driver lives."
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Street address" htmlFor="street">
              <Input {...text("street")} autoComplete="off" />
            </Field>
            <Field label="Apartment no." htmlFor="apt">
              <Input {...text("apt")} autoComplete="off" />
            </Field>
            <Field label="City" htmlFor="city">
              <Input {...text("city")} autoComplete="off" />
            </Field>
            <div className="grid grid-cols-2 gap-5">
              <Field label="State" htmlFor="state">
                <Input {...text("state")} placeholder="IL" autoComplete="off" />
              </Field>
              <Field label="ZIP" htmlFor="zip">
                <Input {...text("zip")} autoComplete="off" />
              </Field>
            </div>
          </div>
        </Section>

        <Section
          number={3}
          title="Documents"
          description="Optional. They can be added later on the driver page."
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {fileField(
              "license",
              "Driver's licence",
              "JPG, PNG or PDF. Max 10 MB.",
            )}
            {fileField(
              "earnings",
              "Earnings screenshot",
              "JPG, PNG or PDF. Max 10 MB.",
            )}
          </div>
        </Section>

        <Section
          number={4}
          title="Payment methods"
          description="The names or handles the driver pays from. A payment from any of them is assigned to this driver automatically."
        >
          <div className="space-y-3">
            {payments.map((row, index) => (
              <div
                key={row.key}
                className="grid grid-cols-1 gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-start"
              >
                <Field label="Payment method" htmlFor={`method-${row.key}`}>
                  <Select
                    id={`method-${row.key}`}
                    options={METHOD_OPTIONS}
                    value={row.type}
                    onChange={(type) =>
                      updateRow(row.key, { type: type as AliasType })
                    }
                  />
                </Field>
                <Field
                  label="Payment ID / alias"
                  htmlFor={`value-${row.key}`}
                  hint={index === 0 ? "Optional" : undefined}
                >
                  <Input
                    id={`value-${row.key}`}
                    value={row.value}
                    placeholder={PLACEHOLDER[row.type]}
                    autoComplete="off"
                    onChange={(event) =>
                      updateRow(row.key, { value: event.target.value })
                    }
                  />
                </Field>
                {/* Same height as a label + its gap, so Remove lines up with the controls, not the hint. */}
                <div className="sm:pt-[1.625rem]">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={payments.length === 1 && row.value === ""}
                    onClick={() =>
                      setPayments((rows) =>
                        rows.length === 1
                          ? [newRow()]
                          : rows.filter((r) => r.key !== row.key),
                      )
                    }
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPayments((rows) => [...rows, newRow()])}
            >
              + Add another
            </Button>
          </div>
        </Section>
      </fieldset>

      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          disabled={create.isPending}
          onClick={() => void navigate("/admin/drivers")}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Saving..." : "Save driver"}
        </Button>
      </div>
    </form>
  );
}
