import { useApplication } from "../../api/applications.queries";
import {
  useContractCompanies,
  useDriverContract,
  useReadFullLicence,
} from "../../api/contracts.queries";
import type { DriverDetail } from "../../api/drivers.queries";
import { HIDE_FINANCIALS } from "../../demoMode";
import Button from "../ui/button/Button";
import CopyButton from "../ui/button/CopyButton";
import {
  buildDriverDataSections,
  copyAllText,
  LICENCE_SECTION_TITLE,
  licenceSection,
  type DataSection,
} from "./driverDataSections";

/** The rows of one section: label / value / copy button. */
function SectionRows({ section }: { section: DataSection }) {
  return (
    <ul className="divide-y divide-gray-100">
      {section.rows.map((row, index) => (
        <li
          key={`${row.label}-${index}`}
          className="flex items-center gap-3 py-2"
        >
          <span className="w-1/3 shrink-0 text-sm text-gray-500">
            {row.label}
          </span>
          <span className="min-w-0 flex-1 text-sm wrap-break-word text-gray-800 select-all">
            {row.value}
          </span>
          <CopyButton text={row.value} label={row.label} />
        </li>
      ))}
    </ul>
  );
}

/** One section: a small-caps heading, then its rows. */
function Section({ section }: { section: DataSection }) {
  return (
    <section>
      <h3 className="eyebrow mb-1 text-gray-500">{section.title}</h3>
      <SectionRows section={section} />
    </section>
  );
}

/**
 * The licence section (D116): a button that sends the licence front to the AI (a few seconds), then its values with copy
 * buttons. Nothing is saved: the answer stays until the page is left, and pressing the button again reads it again.
 */
function LicenceSection({
  reading,
  licence,
  error,
  onRead,
}: {
  reading: boolean;
  licence: DataSection | null;
  error: string | null;
  onRead: () => void;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="eyebrow text-gray-500">{LICENCE_SECTION_TITLE}</h3>
        <Button size="sm" variant="outline" disabled={reading} onClick={onRead}>
          {reading
            ? "Reading licence..."
            : licence
              ? "Read again"
              : "Read licence with AI"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="mb-2 text-sm text-error-600">
          {error}
        </p>
      )}
      {licence ? (
        <>
          <p className="mb-1 text-xs text-gray-500">
            Read by AI from the licence front. Check it before use. Not saved:
            leaving the page forgets it.
          </p>
          {licence.rows.length > 0 ? (
            <SectionRows section={licence} />
          ) : (
            <p className="text-sm text-gray-500">
              The AI could not read any value for sure.
            </p>
          )}
        </>
      ) : (
        !error && (
          <p className="text-sm text-gray-500">
            Sends the licence picture to the AI and shows everything printed on
            its front, ready to copy. Takes a few seconds.
          </p>
        )
      )}
    </section>
  );
}

/**
 * "Driver data" (D116; Abulkalam, 2026-11-19): every value the page knows about the driver, their application and their
 * contract, as plain text with a copy button each, and "Copy all" for everything at once. Read only: nothing here
 * changes data. Empty values are left out.
 */
export default function DriverDataCard({ driver }: { driver: DriverDetail }) {
  const application = useApplication(
    driver.applicationId ?? "",
    driver.applicationId !== null,
  );
  const contract = useDriverContract(driver.id);
  const companies = useContractCompanies();
  const readLicence = useReadFullLicence(driver.id);

  const sections = buildDriverDataSections({
    driver,
    application: application.data ?? null,
    contract: contract.data?.contract ?? null,
    companies: companies.data ?? [],
    hideMoney: HIDE_FINANCIALS,
  });
  const licence = readLicence.data ? licenceSection(readLicence.data) : null;
  const allSections = licence ? [...sections, licence] : sections;
  const loading =
    (driver.applicationId !== null && application.isPending) ||
    contract.isPending;
  const failed = [application, contract, companies].find((q) => q.isError);

  return (
    <div className="rounded-2xl border border-gray-200 bg-surface p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-800">Driver data</h2>
        <CopyButton
          text={copyAllText(allSections)}
          label="all driver data"
          variant="labelled"
        >
          Copy all
        </CopyButton>
      </div>
      {loading && (
        <p className="mb-3 text-sm text-gray-500">
          Loading application and contract...
        </p>
      )}
      {failed?.error && (
        <p role="alert" className="mb-3 text-sm text-error-600">
          {failed.error.message}
        </p>
      )}
      <div className="space-y-5">
        {sections.map((section) => (
          <Section key={section.title} section={section} />
        ))}
        <LicenceSection
          reading={readLicence.isPending}
          licence={licence}
          error={readLicence.error?.message ?? null}
          onRead={() => readLicence.mutate()}
        />
      </div>
    </div>
  );
}
