import type { ReactNode } from "react";
import Radio from "./input/Radio";
import Label from "./Label";

/** One choice of a radio group: `value` is what is stored, `label` what is shown. */
export interface Choice {
  value: string;
  label: string;
}

/**
 * One numbered section of a form (the website form has three: Basic info, About you, Final verification)
 * but all on one page.
 */
export function FormSection({
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
    <section className="rounded-2xl border border-gray-200 bg-surface p-6">
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
export function FormField({
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
export function FormChoices({
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
