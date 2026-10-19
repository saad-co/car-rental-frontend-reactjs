import { useId, useState } from "react";
import {
  useCreateLedgerPreset,
  useDeleteLedgerPreset,
  useUpdateLedgerPreset,
  type LedgerPreset,
  type LedgerPresetKind,
} from "../../api/ledgerPresets.queries";
import {
  centsToDollars,
  formatDateTime,
  parseDollarsToCents,
} from "../../utils";
import InputField from "../form/input/InputField";
import Button from "../ui/button/Button";

/** Same limits as the API (it and the database refuse more). */
const MAX_NAME_LENGTH = 60;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_CENTS = 1_000_000;

/**
 * Reads the "default amount" box: empty means none (the card says "enter amount"), otherwise whole cents.
 * Returns `undefined` for text that is not a valid amount, so the form can say so.
 */
function readAmount(text: string): number | null | undefined {
  if (text.trim() === "") return null;
  const cents = parseDollarsToCents(text);
  return cents !== null && cents <= MAX_CENTS ? cents : undefined;
}

/** The name, default amount and description boxes shared by "edit" and "add". */
function PresetFields({
  name,
  amount,
  description,
  amountProblem,
  onName,
  onAmount,
  onDescription,
}: {
  name: string;
  amount: string;
  description: string;
  amountProblem: boolean;
  onName: (value: string) => void;
  onAmount: (value: string) => void;
  onDescription: (value: string) => void;
}) {
  // One id per editor: many editors are on the Settings page at once, and a label must point at its own field.
  const id = useId();
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
      <div className="sm:col-span-4">
        <label
          htmlFor={`${id}-name`}
          className="mb-1.5 block text-theme-xs font-medium text-gray-700"
        >
          Name (the card's title)
        </label>
        <InputField
          id={`${id}-name`}
          value={name}
          onChange={(e) => onName(e.target.value.slice(0, MAX_NAME_LENGTH))}
          placeholder="e.g. Late fee"
        />
      </div>
      <div className="sm:col-span-3">
        <label
          htmlFor={`${id}-amount`}
          className="mb-1.5 block text-theme-xs font-medium text-gray-700"
        >
          Default amount ($, optional)
        </label>
        <InputField
          id={`${id}-amount`}
          value={amount}
          onChange={(e) => onAmount(e.target.value)}
          placeholder="Empty: enter at entry"
          error={amountProblem}
          hint={amountProblem ? "Like 25 or 25.50, at most 10,000." : undefined}
        />
      </div>
      <div className="sm:col-span-5">
        <label
          htmlFor={`${id}-description`}
          className="mb-1.5 block text-theme-xs font-medium text-gray-700"
        >
          Description (fills the entry's description)
        </label>
        <InputField
          id={`${id}-description`}
          value={description}
          onChange={(e) =>
            onDescription(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH))
          }
          placeholder="e.g. Late payment fee"
        />
      </div>
    </div>
  );
}

/**
 * Editor for one saved preset (B86, D66): name, default amount and description, Save, Delete, and arrows to move the
 * card up or down within its kind. Remount it (a `key` with `updatedAt`) to start again from the saved values.
 */
export function LedgerPresetEditor({
  preset,
  canMoveUp,
  canMoveDown,
  moving,
  onMove,
}: {
  preset: LedgerPreset;
  canMoveUp: boolean;
  canMoveDown: boolean;
  /** True while a reorder is being saved: the arrows wait. */
  moving: boolean;
  onMove: (direction: "up" | "down") => void;
}) {
  const savedAmount =
    preset.amountCents === null ? "" : centsToDollars(preset.amountCents);
  const [name, setName] = useState(preset.name);
  const [amount, setAmount] = useState(savedAmount);
  const [description, setDescription] = useState(preset.description);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const update = useUpdateLedgerPreset();
  const remove = useDeleteLedgerPreset();

  const cents = readAmount(amount);
  const changed =
    name.trim() !== preset.name ||
    description.trim() !== preset.description ||
    amount.trim() !== savedAmount;
  const error = update.error ?? remove.error;
  const busy = update.isPending || remove.isPending;

  const edit = (setter: (value: string) => void) => (value: string) => {
    update.reset();
    remove.reset();
    setter(value);
  };

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 p-4">
      <PresetFields
        name={name}
        amount={amount}
        description={description}
        amountProblem={cents === undefined}
        onName={edit(setName)}
        onAmount={edit(setAmount)}
        onDescription={edit(setDescription)}
      />

      {error && (
        <p role="alert" className="text-sm text-error-600">
          {error.message}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-theme-xs text-gray-500">
          {update.isSuccess
            ? "Saved. New entries use it."
            : preset.updatedAt
              ? `Last saved ${formatDateTime(preset.updatedAt)}`
              : ""}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-label={`Move ${preset.name} up`}
            disabled={!canMoveUp || moving}
            onClick={() => onMove("up")}
            className="rounded-lg px-2.5 py-1.5 text-gray-500 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 disabled:opacity-40"
          >
            ↑
          </button>
          <button
            type="button"
            aria-label={`Move ${preset.name} down`}
            disabled={!canMoveDown || moving}
            onClick={() => onMove("down")}
            className="rounded-lg px-2.5 py-1.5 text-gray-500 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 disabled:opacity-40"
          >
            ↓
          </button>
          {confirmingDelete ? (
            <>
              <span className="text-sm text-gray-700">Delete this preset?</span>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => setConfirmingDelete(false)}
              >
                Keep it
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={busy}
                onClick={() => remove.mutate(preset.id)}
              >
                {remove.isPending ? "Deleting..." : "Yes, delete"}
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => setConfirmingDelete(true)}
              >
                Delete
              </Button>
              {changed && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    update.reset();
                    setName(preset.name);
                    setAmount(savedAmount);
                    setDescription(preset.description);
                  }}
                >
                  Undo changes
                </Button>
              )}
              <Button
                size="sm"
                disabled={
                  !changed ||
                  name.trim() === "" ||
                  description.trim() === "" ||
                  cents === undefined ||
                  busy
                }
                onClick={() =>
                  update.mutate({
                    id: preset.id,
                    name: name.trim(),
                    amountCents: cents ?? null,
                    description: description.trim(),
                  })
                }
              >
                {update.isPending ? "Saving..." : "Save"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** The form that adds a new preset of a kind (D66). `onDone` closes it, after adding or on Cancel. */
export function NewLedgerPresetForm({
  kind,
  onDone,
}: {
  kind: LedgerPresetKind;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const create = useCreateLedgerPreset();
  const cents = readAmount(amount);

  const edit = (setter: (value: string) => void) => (value: string) => {
    create.reset();
    setter(value);
  };

  return (
    <div className="space-y-3 rounded-xl border border-brand-200 bg-brand-25 p-4">
      <PresetFields
        name={name}
        amount={amount}
        description={description}
        amountProblem={cents === undefined}
        onName={edit(setName)}
        onAmount={edit(setAmount)}
        onDescription={edit(setDescription)}
      />
      {create.isError && (
        <p role="alert" className="text-sm text-error-600">
          {create.error.message}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={create.isPending}
          onClick={onDone}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          disabled={
            name.trim() === "" ||
            description.trim() === "" ||
            cents === undefined ||
            create.isPending
          }
          onClick={() =>
            create.mutate(
              {
                kind,
                name: name.trim(),
                amountCents: cents ?? null,
                description: description.trim(),
              },
              { onSuccess: onDone },
            )
          }
        >
          {create.isPending ? "Adding..." : "Add preset"}
        </Button>
      </div>
    </div>
  );
}
