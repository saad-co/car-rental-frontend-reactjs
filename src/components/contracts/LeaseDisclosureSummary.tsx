import type { ReactNode } from "react";
import type {
  ContractInput,
  ContractNumbers,
} from "../../api/contracts.queries";
import { cn, formatCents, formatDay } from "../../utils";

/** One line of the summary: a label and an amount (or text) at the right. */
function Line({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: ReactNode;
  strong?: boolean;
}) {
  return (
    <li
      className={cn(
        "flex items-baseline justify-between gap-4 py-2 text-sm",
        strong ? "font-semibold text-gray-800" : "text-gray-600",
      )}
    >
      <span>{label}</span>
      <span className="text-right whitespace-nowrap text-gray-800">
        {value}
      </span>
    </li>
  );
}

/** A titled block of lines, with a rule above the title. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-gray-100 pt-4 first:border-t-0 first:pt-0">
      <h3 className="mb-1 text-theme-xs font-medium tracking-wide text-gray-500 uppercase">
        {title}
      </h3>
      <ul className="divide-y divide-gray-100">{children}</ul>
    </section>
  );
}

/**
 * The contract's disclosure as the client's rate sheet shows it (Module 2, D71): the lease term, the five rate lines,
 * the one-time charges, the amount due at pickup and the recurring charges. Every amount shown is either typed (taken
 * from `input`) or calculated by the API (`numbers`): nothing is added up here (frontend rule: no money maths).
 */
export default function LeaseDisclosureSummary({
  input,
  numbers,
}: {
  input: ContractInput;
  numbers: ContractNumbers;
}) {
  const payment = input.schedule === "weekly" ? "Weekly" : "Daily";
  return (
    <div className="space-y-4">
      <Section title="Lease term">
        <Line
          label={`${input.termMonths} ${input.termMonths === 1 ? "month" : "months"}`}
          value={`${formatDay(input.startDate)} – ${formatDay(numbers.endDate)}`}
        />
      </Section>

      <Section title="Rate">
        <Line label="Base rate" value={formatCents(numbers.baseCents)} />
        <Line label="Insurance" value={formatCents(numbers.insuranceCents)} />
        <Line
          label="Unlimited miles pkg"
          value={formatCents(numbers.milesCents)}
        />
        <Line
          label="Full maintenance pkg"
          value={formatCents(numbers.maintenanceCents)}
        />
        <Line label="Taxes" value={formatCents(numbers.taxCents)} />
        <Line label="Total" value={formatCents(input.totalRateCents)} strong />
      </Section>

      <Section title="One-time charges">
        <Line
          label="Security deposit"
          value={formatCents(input.securityDepositCents)}
        />
        <Line
          label="Documentation fee"
          value={formatCents(input.documentationFeeCents)}
        />
        <Line
          label="Insurance policy start fee"
          value={formatCents(input.insuranceStartFeeCents)}
        />
        <Line label="Other" value={formatCents(input.otherOneTimeCents)} />
        <Line
          label="Hold vehicle payment"
          value={formatCents(input.holdVehicleCents)}
        />
        <Line
          label="Total"
          value={formatCents(numbers.oneTimeTotalCents)}
          strong
        />
      </Section>

      <Section title="Amount due at pickup">
        <Line
          label="First payment + one-time charges"
          value={formatCents(numbers.amountDueAtPickupCents)}
          strong
        />
      </Section>

      <Section title="Recurring charges">
        <Line
          label={`${payment} payment`}
          value={formatCents(numbers.paymentCents)}
        />
        <Line
          label="Excess mileage (per mile)"
          value={formatCents(input.excessMileageCents)}
        />
        <Line
          label="Insurance excess (per month)"
          value={formatCents(input.insuranceExcessCents)}
        />
        <Line label="Other" value={formatCents(input.otherRecurringCents)} />
        <Line
          label="Total"
          value={formatCents(numbers.recurringTotalCents)}
          strong
        />
      </Section>
    </div>
  );
}
