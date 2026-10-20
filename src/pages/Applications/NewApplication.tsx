import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { useCreateApplication } from "../../api/applications.queries";
import DatePicker from "../../components/form/DatePicker";
import Checkbox from "../../components/form/input/Checkbox";
import FileInput from "../../components/form/input/FileInput";
import Input from "../../components/form/input/InputField";
import Radio from "../../components/form/input/Radio";
import Label from "../../components/form/Label";
import Select from "../../components/form/Select";
import Button from "../../components/ui/button/Button";
import {
  COUNTS,
  DURATIONS,
  EMPTY_VALUES,
  FILE_ACCEPT,
  PLATFORMS,
  YEARS_DRIVING,
  YES_NO,
  toFormData,
  validate,
  type Choice,
  type DocumentKind,
  type FormErrors,
  type FormFiles,
  type FormValues,
} from "./websiteForm";

/**
 * One numbered section of the form, the same three as the website's steps (Basic info, About you, Final verification)
 * but all on one page.
 */
function Section({
  number,
  title,
  description,
  children,
}: {
  number: number;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6">
      <div className="mb-6 flex items-start gap-4">
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-500"
        >
          {number}
        </span>
        <div>
          <h2 className="text-base font-semibold text-gray-800">{title}</h2>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

/** A label, its control, and the problem with it right underneath. `data-invalid` lets Save find the first one. */
function Field({
  label,
  htmlFor,
  required = false,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className} data-invalid={error ? "true" : undefined}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="text-error-500"> *</span>}
      </Label>
      {children}
      {error ? (
        <p role="alert" className="mt-1.5 text-theme-xs text-error-500">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-theme-xs text-gray-500">{hint}</p>
      )}
    </div>
  );
}

/** A group of radio buttons for one question. */
function Choices({
  name,
  options,
  value,
  onChange,
  stacked = false,
}: {
  name: string;
  options: Choice[];
  value: string;
  onChange: (value: string) => void;
  stacked?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      className={
        stacked ? "flex flex-col gap-3" : "flex flex-wrap gap-x-6 gap-y-3"
      }
    >
      {options.map((option) => (
        <Radio
          key={option.value}
          id={`${name}-${option.value}`}
          name={name}
          value={option.value}
          label={option.label}
          checked={value === option.value}
          onChange={onChange}
        />
      ))}
    </div>
  );
}

type TextKey = Exclude<keyof FormValues, "platforms">;

/**
 * Adds an application by hand (B85, D68): one page with the questions of the gonzocar.com form, in its three
 * sections and with its rules, plus the documents. The admin then approves it from its page like any other
 * application, which is what creates the driver and sends the texts.
 *
 * A problem shows right under its field as soon as the field has been visited (left, or changed for a list or a
 * button); Save marks everything not yet visited. Nothing is created until Save. The request id is made once when
 * the page opens, so a double click or a retry after a network error makes only one application.
 */
export default function NewApplication() {
  const navigate = useNavigate();
  const create = useCreateApplication();
  const [requestId] = useState(() => crypto.randomUUID());
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [files, setFiles] = useState<FormFiles>({
    license: null,
    rating: null,
    earnings: null,
  });
  /** The fields the user has been in; only these show their problem (until the first Save shows all). */
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);

  const errors = validate(values, files);
  const problemCount = Object.keys(errors).length;
  const shown: FormErrors = Object.fromEntries(
    Object.entries(errors).filter(([key]) => submitted || touched.has(key)),
  );

  const touch = (key: string) =>
    setTouched((current) => new Set(current).add(key));
  /** Sets a value and marks the field visited (lists, buttons and dates have no "leave" moment). */
  const change = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    touch(key);
  };
  /** Props for a plain text input: checked when the user leaves it, then live. */
  const text = (key: TextKey) => ({
    id: key,
    name: key,
    value: values[key],
    error: Boolean(shown[key]),
    onChange: (event: { target: { value: string } }) =>
      setValues((current) => ({ ...current, [key]: event.target.value })),
    onBlur: () => touch(key),
  });

  const togglePlatform = (platform: string, checked: boolean) =>
    change(
      "platforms",
      checked
        ? [...values.platforms, platform]
        : values.platforms.filter((p) => p !== platform),
    );

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (problemCount > 0) {
      // After React shows the messages, bring the first one into view.
      setTimeout(
        () =>
          document
            .querySelector('[data-invalid="true"]')
            ?.scrollIntoView({ block: "center", behavior: "smooth" }),
        0,
      );
      return;
    }
    create.mutate(toFormData(requestId, values, files), {
      onSuccess: (result) => void navigate(`/admin/applications/${result.id}`),
    });
  };

  /** One file picker of the last section. */
  const fileField = (
    kind: DocumentKind,
    label: string,
    options: { required?: boolean; hint?: string } = {},
  ) => (
    <Field
      label={label}
      htmlFor={`${kind}_file`}
      required={options.required}
      error={shown[kind]}
      hint={options.hint ?? "JPG, PNG or PDF. Max 10 MB."}
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
        <Link
          to="/admin/applications"
          className="text-sm text-gray-500 hover:text-brand-500"
        >
          ← Applications
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-gray-800">
          Add application
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          The same questions as the website form. Review and approve it from its
          page afterwards, as with any application.
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
          title="Basic info"
          description="How to reach the applicant and their driving experience."
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              label="Phone (US)"
              htmlFor="phone"
              required
              error={shown.phone}
              hint="10 digits, no dashes"
            >
              <Input
                {...text("phone")}
                type="tel"
                placeholder="5551234567"
                autoComplete="off"
              />
            </Field>
            <Field label="ZIP code" htmlFor="zip" required error={shown.zip}>
              <Input {...text("zip")} placeholder="60601" autoComplete="off" />
            </Field>
            <Field
              label="Age (minimum 25 years)"
              htmlFor="age"
              required
              error={shown.age}
              hint="Must be at least 25"
            >
              <Input {...text("age")} type="number" min="25" max="99" />
            </Field>
            <Field
              label="Years of driving experience"
              htmlFor="years_driving"
              required
              error={shown.years_driving}
            >
              <Select
                id="years_driving"
                options={YEARS_DRIVING}
                value={values.years_driving}
                onChange={(value) => change("years_driving", value)}
                onBlur={() => touch("years_driving")}
                placeholder="Select..."
              />
            </Field>
            <Field
              label="What other companies have you rented from before?"
              htmlFor="previous_companies"
              hint="Optional — helps us understand the rental history"
              className="sm:col-span-2"
            >
              <Input
                {...text("previous_companies")}
                placeholder="e.g. Hertz, Avis, Enterprise"
              />
            </Field>
          </div>
        </Section>

        <Section
          number={2}
          title="About you"
          description="Name, address, start date and the apps they drive for."
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              label="First name"
              htmlFor="first_name"
              required
              error={shown.first_name}
            >
              <Input {...text("first_name")} autoComplete="off" />
            </Field>
            <Field
              label="Last name"
              htmlFor="last_name"
              required
              error={shown.last_name}
            >
              <Input {...text("last_name")} autoComplete="off" />
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
              label="Street and number"
              htmlFor="street"
              required
              error={shown.street}
            >
              <Input {...text("street")} autoComplete="off" />
            </Field>
            <Field label="Apt (optional)" htmlFor="apt">
              <Input {...text("apt")} autoComplete="off" />
            </Field>
            <Field label="City" htmlFor="city" required error={shown.city}>
              <Input {...text("city")} autoComplete="off" />
            </Field>
            <Field
              label="Desired start date"
              htmlFor="start_date"
              required
              error={shown.start_date}
            >
              <DatePicker
                id="start_date"
                value={values.start_date}
                onChange={(day) => change("start_date", day)}
                error={Boolean(shown.start_date)}
              />
            </Field>
            <Field
              label="Which apps do you drive for, or want to drive for?"
              required
              error={shown.platforms}
              hint="Select all that apply"
              className="sm:col-span-2"
            >
              <div className="flex flex-wrap gap-x-6 gap-y-3">
                {PLATFORMS.map((platform) => (
                  <Checkbox
                    key={platform}
                    label={platform}
                    checked={values.platforms.includes(platform)}
                    onChange={(checked) => togglePlatform(platform, checked)}
                  />
                ))}
              </div>
            </Field>
          </div>
        </Section>

        <Section
          number={3}
          title="Final verification"
          description="Quick driving history, rental plans and the licence."
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              label="Violations (last 4 years)"
              htmlFor="violations"
              required
              error={shown.violations}
            >
              <Select
                id="violations"
                options={COUNTS}
                value={values.violations}
                onChange={(value) => change("violations", value)}
                onBlur={() => touch("violations")}
                placeholder="Select..."
              />
            </Field>
            <Field
              label="Accidents (last 4 years)"
              htmlFor="accidents"
              required
              error={shown.accidents}
            >
              <Select
                id="accidents"
                options={COUNTS}
                value={values.accidents}
                onChange={(value) => change("accidents", value)}
                onBlur={() => touch("accidents")}
                placeholder="Select..."
              />
            </Field>
            <Field
              label="For how long are you looking to lease?"
              required
              error={shown.duration}
              className="sm:col-span-2"
            >
              <Choices
                name="duration"
                options={DURATIONS}
                value={values.duration}
                onChange={(value) => change("duration", value)}
                stacked
              />
            </Field>
            <Field
              label="Does the applicant have the first week's payment plus a portion ($150-$200) of the security deposit to get started?"
              required
              error={shown.has_startup_funds}
              className="sm:col-span-2"
            >
              <Choices
                name="has_startup_funds"
                options={YES_NO}
                value={values.has_startup_funds}
                onChange={(value) => change("has_startup_funds", value)}
              />
            </Field>
            {/* Asked only when the answer above is No, as on the website. */}
            {values.has_startup_funds === "no" && (
              <Field
                label="If no, how much do they have to get started?"
                htmlFor="capital"
                required
                error={shown.capital}
                className="sm:col-span-2"
              >
                <Input
                  {...text("capital")}
                  type="text"
                  placeholder="Amount in USD"
                />
              </Field>
            )}
            <Field
              label="Do they currently have auto insurance?"
              required
              error={shown.has_insurance}
            >
              <Choices
                name="has_insurance"
                options={YES_NO}
                value={values.has_insurance}
                onChange={(value) => change("has_insurance", value)}
              />
            </Field>
            <Field
              label="Have they had auto insurance in the last 45 days?"
              required
              error={shown.has_insurance_last_45_days}
            >
              <Choices
                name="has_insurance_last_45_days"
                options={YES_NO}
                value={values.has_insurance_last_45_days}
                onChange={(value) =>
                  change("has_insurance_last_45_days", value)
                }
              />
            </Field>
            <Field
              label="Have they been referred by someone? If so, who?"
              htmlFor="referred_by"
              className="sm:col-span-2"
            >
              <Input
                {...text("referred_by")}
                placeholder="Name of who referred them"
              />
            </Field>
            <Field
              label="Do they have a current driver rating? If so, what is it?"
              htmlFor="driver_rating"
            >
              <Input {...text("driver_rating")} placeholder="4.9" />
            </Field>
            {fileField("rating", "Screenshot of the rating", {
              hint: "Optional. JPG, PNG or PDF. Max 10 MB.",
            })}
            <div className="sm:col-span-2">
              {fileField("license", "Photo of the driver's licence", {
                required: true,
              })}
            </div>
            <Field label="How much do they earn per week?" htmlFor="earnings">
              <Input
                {...text("earnings")}
                placeholder="Weekly earnings or a range"
              />
            </Field>
            {fileField("earnings", "Proof of earnings", {
              hint: "Optional: Uber/Lyft/delivery screenshots, paystubs or a bank statement. One file for now.",
            })}
          </div>
        </Section>
      </fieldset>

      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          disabled={create.isPending}
          onClick={() => void navigate("/admin/applications")}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Saving..." : "Save application"}
        </Button>
      </div>
    </form>
  );
}
