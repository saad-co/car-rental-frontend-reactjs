import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  useContractDraft,
  useContractNumbers,
  useCreateContractDraft,
  useDeleteContractDraft,
  useUpdateContractDraft,
  type ContractDraft as Draft,
} from "../../api/contracts.queries";
import { useDriver } from "../../api/drivers.queries";
import {
  ONE_TIME_CHARGES,
  RECURRING_CHARGES,
  readContractForm,
  valuesFromDraft,
  type ChargeKey,
  type ContractFormValues,
} from "../../components/contracts/contractForm";
import LeaseDisclosureSummary from "../../components/contracts/LeaseDisclosureSummary";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import Select from "../../components/form/Select";
import Button from "../../components/ui/button/Button";
import ConfirmDialog from "../../components/ui/modal/ConfirmDialog";
import { formatDateTime } from "../../utils";

/** A white card with a title, the same look as the driver page. */
function Card({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <h2 className="text-base font-semibold text-gray-800">{title}</h2>
      {note && <p className="mt-1 text-sm text-gray-500">{note}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

/**
 * The form and the live summary. Mounted once the draft has loaded: the boxes start from the saved draft (or from a
 * blank weekly contract) and are then owned by this component, so a refetch never overwrites what is being typed.
 */
function ContractEditor({
  driverId,
  driverName,
  draft,
}: {
  driverId: string;
  driverName: string;
  draft: Draft | null;
}) {
  const navigate = useNavigate();
  const [values, setValues] = useState<ContractFormValues>(() =>
    valuesFromDraft(draft),
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const create = useCreateContractDraft(driverId);
  const update = useUpdateContractDraft(driverId);
  const remove = useDeleteContractDraft(driverId);
  const mutations = [create, update, remove];
  const busy = mutations.some((m) => m.isPending);
  const actionError = mutations.find((m) => m.isError)?.error;

  const { input, problems } = readContractForm(values);
  const numbers = useContractNumbers(input);

  /** Saved, never saved, or changed since: compares the boxes with the saved draft's own values. */
  const savedInput = draft
    ? readContractForm(valuesFromDraft(draft)).input
    : null;
  const unsaved =
    draft === null || JSON.stringify(input) !== JSON.stringify(savedInput);

  const set = <K extends keyof ContractFormValues>(
    key: K,
    value: ContractFormValues[K],
  ) => {
    mutations.forEach((m) => m.reset());
    setValues((previous) => ({ ...previous, [key]: value }));
  };

  const save = () => {
    if (!input) return;
    mutations.forEach((m) => m.reset());
    if (draft) update.mutate({ id: draft.id, body: input });
    else create.mutate(input);
  };

  const per = values.schedule === "weekly" ? "week" : "day";

  /** One money box. */
  const moneyBox = (key: ChargeKey, label: string) => (
    <div key={key}>
      <Label htmlFor={`contract-${key}`}>{label}</Label>
      <Input
        id={`contract-${key}`}
        placeholder="0.00"
        value={values[key]}
        onChange={(e) => set(key, e.target.value)}
        error={problems[key] !== undefined}
        hint={problems[key]}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <Link
        to={`/admin/drivers/${driverId}`}
        className="inline-block text-sm text-gray-500 hover:text-gray-700"
      >
        ← Back to {driverName}
      </Link>

      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-gray-200 bg-white px-6 py-5 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-semibold text-gray-800">
            Contract draft for {driverName}
          </h1>
          <p className="text-sm text-gray-500">
            {draft === null
              ? "Not saved yet."
              : unsaved
                ? "You have unsaved changes."
                : `Saved ${formatDateTime(draft.updatedAt)}.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {draft && (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => setConfirmingDelete(true)}
            >
              {remove.isPending ? "Deleting..." : "Delete draft"}
            </Button>
          )}
          <Button
            size="sm"
            disabled={busy || input === null || !unsaved}
            title={
              input === null
                ? "Fill in the boxes marked in red first."
                : !unsaved
                  ? "Nothing has changed since the last save."
                  : undefined
            }
            onClick={save}
          >
            {create.isPending || update.isPending ? "Saving..." : "Save draft"}
          </Button>
        </div>
      </div>

      {actionError && (
        <p
          role="alert"
          className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600"
        >
          {actionError.message}
        </p>
      )}

      <ConfirmDialog
        isOpen={confirmingDelete}
        title="Delete this draft?"
        confirmLabel="Delete draft"
        confirmVariant="danger"
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={() => {
          setConfirmingDelete(false);
          if (!draft) return;
          mutations.forEach((m) => m.reset());
          remove.mutate(draft.id, {
            onSuccess: () => navigate(`/admin/drivers/${driverId}`),
          });
        }}
      >
        The numbers typed here are removed. Nothing has been sent to the driver,
        and you can start a new draft any time.
      </ConfirmDialog>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card title="Rate and term">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="contract-schedule">Payment schedule</Label>
                <Select
                  id="contract-schedule"
                  value={values.schedule}
                  onChange={(value) =>
                    set("schedule", value as ContractFormValues["schedule"])
                  }
                  options={[
                    { value: "weekly", label: "Weekly" },
                    { value: "daily", label: "Daily" },
                  ]}
                />
              </div>
              <div>
                <Label htmlFor="contract-total">Total rate ($ per {per})</Label>
                <Input
                  id="contract-total"
                  placeholder="0.00"
                  value={values.total}
                  onChange={(e) => set("total", e.target.value)}
                  error={problems.total !== undefined}
                  hint={problems.total}
                />
              </div>
              <div>
                <Label htmlFor="contract-start">Start date</Label>
                <Input
                  id="contract-start"
                  type="date"
                  value={values.startDate}
                  onChange={(e) => set("startDate", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="contract-term">Term (months)</Label>
                <Input
                  id="contract-term"
                  type="number"
                  min="1"
                  max="60"
                  step={1}
                  value={values.term}
                  onChange={(e) => set("term", e.target.value)}
                  error={problems.term !== undefined}
                  hint={problems.term}
                />
              </div>
            </div>
          </Card>

          <Card
            title="One-time charges ($)"
            note="Due at pickup, on top of the first payment. Leave empty for none."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {ONE_TIME_CHARGES.map(([key, label]) => moneyBox(key, label))}
            </div>
          </Card>

          <Card
            title="Recurring charges ($)"
            note={`Added to every ${per}'s payment in the summary. Leave empty for none.`}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {RECURRING_CHARGES.map(([key, label]) => moneyBox(key, label))}
            </div>
          </Card>
        </div>

        <div>
          <Card
            title="Lease disclosure summary"
            note="Calculated from the total rate. Nothing here is typed by hand."
          >
            {input === null || !numbers.data ? (
              numbers.isError && input !== null ? (
                <p role="alert" className="text-sm text-error-600">
                  {numbers.error.message}
                </p>
              ) : (
                <p className="text-sm text-gray-500">
                  {input === null
                    ? "Enter the total rate to see the summary."
                    : "Calculating..."}
                </p>
              )
            ) : (
              <div
                className={numbers.isPlaceholderData ? "opacity-60" : undefined}
              >
                <LeaseDisclosureSummary
                  input={numbers.data.input}
                  numbers={numbers.data.numbers}
                />
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

/**
 * A driver's contract draft (Module 2 step 1, `/admin/drivers/:id/contract`): the admin types the rate, the dates and
 * the charges, the system works out the rest (D71) and shows it as the lease disclosure; "Save draft" keeps it. A driver
 * has at most one draft. Nothing is sent to the driver yet (that is step 3).
 */
export default function ContractDraftPage() {
  const { id = "" } = useParams();
  const driver = useDriver(id);
  const draft = useContractDraft(id);

  if (driver.isPending || draft.isPending) {
    return <p className="text-sm text-gray-500">Loading...</p>;
  }
  const loadError = driver.error ?? draft.error;
  if (loadError || !driver.data || !draft.data) {
    return (
      <div className="space-y-4">
        <Link to="/admin/drivers" className="text-sm text-brand-500">
          ← Back to drivers
        </Link>
        <p role="alert" className="text-sm text-error-600">
          {loadError?.message ?? "Loading failed."}
        </p>
      </div>
    );
  }

  return (
    <ContractEditor
      driverId={id}
      driverName={`${driver.data.firstName} ${driver.data.lastName}`}
      draft={draft.data.draft}
    />
  );
}
