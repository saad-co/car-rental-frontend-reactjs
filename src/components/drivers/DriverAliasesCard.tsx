import { useState, type FormEvent } from "react";
import {
  useAddDriverAlias,
  useRemoveDriverAlias,
  type AliasType,
  type Driver,
  type DriverAlias,
} from "../../api/drivers.queries";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import Select from "../form/Select";
import {
  ALIAS_SOURCE_LABEL,
  ALIAS_TYPE_LABEL,
} from "../payments/paymentLabels";
import Button from "../ui/button/Button";
import ConfirmDialog from "../ui/modal/ConfirmDialog";

/** The payment methods to choose from, in display order. */
const TYPE_OPTIONS = (Object.keys(ALIAS_TYPE_LABEL) as AliasType[]).map(
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

/**
 * Splits the aliases by payment method, in the order the API sends them. Imported aliases that are obviously
 * not a name or handle (the old parser sometimes saved a chunk of email styling) are kept apart, so they never
 * clutter the real ones; they can still be removed.
 */
function groupAliases(aliases: DriverAlias[]) {
  const looksBroken = (value: string) =>
    value.length > 80 || /[{}]|;\s*\}|<\/?\w+/.test(value);
  const groups = new Map<AliasType, DriverAlias[]>();
  const broken: DriverAlias[] = [];
  for (const alias of aliases) {
    if (looksBroken(alias.value)) {
      broken.push(alias);
      continue;
    }
    groups.set(alias.type, [...(groups.get(alias.type) ?? []), alias]);
  }
  return { groups: [...groups.entries()], broken };
}

/** One alias as a small chip with a × to remove it. */
function AliasChip({
  alias,
  disabled,
  onRemove,
}: {
  alias: DriverAlias;
  disabled: boolean;
  onRemove: () => void;
}) {
  const text =
    alias.value.length > 60 ? `${alias.value.slice(0, 60)}…` : alias.value;
  return (
    <span
      title={ALIAS_SOURCE_LABEL[alias.source]}
      className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 py-1 pr-1.5 pl-2.5 text-sm text-gray-700"
    >
      {text}
      <button
        type="button"
        disabled={disabled}
        onClick={onRemove}
        aria-label={`Remove ${ALIAS_TYPE_LABEL[alias.type]} alias ${text}`}
        className="flex size-5 items-center justify-center rounded text-gray-500 hover:bg-gray-200 hover:text-error-500 disabled:opacity-50"
      >
        ×
      </button>
    </span>
  );
}

/**
 * The driver's payment aliases (B52, D69): the names, handles and company names they pay from, grouped by payment
 * method, with a form to add one and a × to remove one. A payment from any of them is assigned to this driver
 * automatically. An alias belongs to one driver: the API refuses (409) one another driver has, and says whose.
 * Removing one changes nothing for payments already assigned.
 */
export default function DriverAliasesCard({ driver }: { driver: Driver }) {
  const add = useAddDriverAlias(driver.id);
  const remove = useRemoveDriverAlias(driver.id);
  const [type, setType] = useState<AliasType>("zelle");
  const [value, setValue] = useState("");
  /** Shown under the box after a Save with nothing typed; the API's own message is shown for everything else. */
  const [empty, setEmpty] = useState(false);
  /** The alias the "Remove?" dialog is asking about. */
  const [removing, setRemoving] = useState<DriverAlias | null>(null);

  const { groups, broken } = groupAliases(driver.aliases);
  const busy = add.isPending || remove.isPending;
  const error = empty
    ? "Enter a name or handle."
    : add.isError
      ? add.error.message
      : remove.isError
        ? remove.error.message
        : null;

  const clearProblems = () => {
    setEmpty(false);
    add.reset();
    remove.reset();
  };

  const onAdd = (event: FormEvent) => {
    event.preventDefault();
    clearProblems();
    if (value.trim() === "") {
      setEmpty(true);
      return;
    }
    add.mutate({ type, value }, { onSuccess: () => setValue("") });
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-base font-semibold text-gray-800">
        Payment aliases
      </h2>
      <p className="mb-4 text-sm text-gray-500">
        Names, handles and company names this driver pays from. A payment from
        any of them is assigned to this driver automatically.
      </p>

      {driver.aliases.length === 0 ? (
        <p className="mb-5 text-sm text-gray-500">None yet.</p>
      ) : (
        <div className="mb-5 space-y-4">
          {groups.map(([groupType, items]) => (
            <div key={groupType}>
              <h3 className="mb-1.5 text-theme-xs font-medium text-gray-500">
                {ALIAS_TYPE_LABEL[groupType]}
              </h3>
              <div className="flex flex-wrap gap-2">
                {items.map((alias) => (
                  <AliasChip
                    key={alias.id}
                    alias={alias}
                    disabled={busy}
                    onRemove={() => {
                      clearProblems();
                      setRemoving(alias);
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
          {broken.length > 0 && (
            <details>
              <summary className="cursor-pointer text-theme-xs text-warning-600">
                {broken.length} imported{" "}
                {broken.length === 1 ? "alias looks" : "aliases look"} damaged
                (leftover email formatting from the old system)
              </summary>
              <div className="mt-2 flex flex-wrap gap-2">
                {broken.map((alias) => (
                  <AliasChip
                    key={alias.id}
                    alias={alias}
                    disabled={busy}
                    onRemove={() => {
                      clearProblems();
                      setRemoving(alias);
                    }}
                  />
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      <form
        onSubmit={onAdd}
        noValidate
        className="border-t border-gray-100 pt-4"
      >
        <p className="mb-3 text-sm font-medium text-gray-700">Add an alias</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end">
          <div>
            <Label htmlFor="alias-type">Payment method</Label>
            <Select
              id="alias-type"
              options={TYPE_OPTIONS}
              value={type}
              onChange={(next) => {
                clearProblems();
                setType(next as AliasType);
              }}
              disabled={busy}
            />
          </div>
          <div>
            <Label htmlFor="alias-value">Name or handle</Label>
            <Input
              id="alias-value"
              value={value}
              placeholder={PLACEHOLDER[type]}
              error={error !== null}
              disabled={busy}
              autoComplete="off"
              onChange={(event) => {
                clearProblems();
                setValue(event.target.value);
              }}
            />
          </div>
          <Button type="submit" disabled={busy}>
            {add.isPending ? "Adding..." : "Add"}
          </Button>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-theme-xs text-error-500">
            {error}
          </p>
        )}
      </form>

      <ConfirmDialog
        isOpen={removing !== null}
        title="Remove this alias?"
        confirmLabel="Remove"
        confirmVariant="danger"
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          if (!removing) return;
          const aliasId = removing.id;
          setRemoving(null);
          remove.mutate(aliasId);
        }}
      >
        {removing && (
          <>
            <span className="font-medium">
              {ALIAS_TYPE_LABEL[removing.type]}: {removing.value.slice(0, 60)}
            </span>
            . Payments already assigned to this driver stay as they are. Later
            payments from this payer are no longer matched to them through it.
          </>
        )}
      </ConfirmDialog>
    </div>
  );
}
