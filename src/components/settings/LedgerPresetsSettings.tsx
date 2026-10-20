import { useState } from "react";
import {
  useLedgerPresets,
  useReorderLedgerPresets,
  type LedgerPresetKind,
} from "../../api/ledgerPresets.queries";
import Button from "../ui/button/Button";
import { LedgerPresetEditor, NewLedgerPresetForm } from "./LedgerPresetEditor";

/** What each kind of preset is for, as Settings explains it, in the order shown. */
const KINDS: { kind: LedgerPresetKind; title: string; when: string }[] = [
  {
    kind: "charge",
    title: "Charges",
    when: 'The cards in the "+ Charge" tab of a driver\'s ledger. Clicking a card fills in the description, and the amount when it has one.',
  },
  {
    kind: "credit",
    title: "Credits",
    when: 'The cards in the "+ Credit" tab. Same idea: they save typing, and the admin can still change the text and the amount.',
  },
];

/**
 * The Settings card for the ledger presets (B86, D66): the quick-pick cards of the "New ledger entry" window, one list
 * per kind. Admins add, edit, delete and reorder them. A preset only supplies text and an amount while an entry is
 * being made, so changing the list never changes an existing ledger entry.
 */
export default function LedgerPresetsSettings() {
  const presets = useLedgerPresets();
  const reorder = useReorderLedgerPresets();
  /** The kind whose "add a preset" form is open, if any. */
  const [adding, setAdding] = useState<LedgerPresetKind | null>(null);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-gray-800">Ledger presets</h2>
      <p className="mt-1 mb-6 text-sm text-gray-500">
        The quick-pick cards in the "New ledger entry" window. Changing them
        never changes an entry that is already in a ledger.
      </p>

      {presets.isPending ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : presets.isError ? (
        <p role="alert" className="text-sm text-error-600">
          {presets.error.message}
        </p>
      ) : (
        <div className="space-y-8 divide-y divide-gray-100 [&>*:not(:first-child)]:pt-8">
          {KINDS.map(({ kind, title, when }) => {
            const ofKind = presets.data.filter((p) => p.kind === kind);
            /** Moves a card one place by sending the whole new order of the kind. */
            const move = (index: number, direction: "up" | "down") => {
              const ids = ofKind.map((p) => p.id);
              const target = direction === "up" ? index - 1 : index + 1;
              [ids[index], ids[target]] = [ids[target], ids[index]];
              reorder.mutate({ kind, ids });
            };
            return (
              <section key={kind} className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-gray-800">
                    {title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">{when}</p>
                </div>
                {reorder.isError && (
                  <p role="alert" className="text-sm text-error-600">
                    {reorder.error.message}
                  </p>
                )}
                {ofKind.length === 0 && (
                  <p className="text-sm text-gray-500">
                    No presets: the window shows no cards for this kind.
                  </p>
                )}
                {ofKind.map((preset, index) => (
                  // Keyed by the saved time: after a save the editor restarts from the saved values.
                  <LedgerPresetEditor
                    key={`${preset.id}-${preset.updatedAt}`}
                    preset={preset}
                    canMoveUp={index > 0}
                    canMoveDown={index < ofKind.length - 1}
                    moving={reorder.isPending}
                    onMove={(direction) => move(index, direction)}
                  />
                ))}
                {adding === kind ? (
                  <NewLedgerPresetForm
                    kind={kind}
                    onDone={() => setAdding(null)}
                  />
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAdding(kind)}
                  >
                    Add a preset
                  </Button>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
