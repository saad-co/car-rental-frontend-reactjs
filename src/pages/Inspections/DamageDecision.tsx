import { useState } from "react";
import { Link } from "react-router";
import type { DamageItem } from "../../api/inspections.queries";
import TextArea from "../../components/form/input/TextArea";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import { formatCents } from "../../utils";

const MAX_DESCRIPTION = 500;

interface Props {
  /** The damage staff marked on this photo; null = "No change". */
  item: DamageItem | null;
  /** The driver whose ledger a charge goes on, for the link after charging. */
  driverId: string;
  busy: boolean;
  onMark: (description: string) => void;
  onUndo: (item: DamageItem) => void;
  onCharge: (item: DamageItem) => void;
}

/**
 * What staff decided about one photo of the check-out: "No change" (the default), or "New damage" with a description; a marked
 * item can be undone until it is charged, and "Create charge" opens the ledger's charge window with the description filled in.
 * Once charged, the item shows the ledger line it made and is locked.
 */
export default function DamageDecision({
  item,
  driverId,
  busy,
  onMark,
  onUndo,
  onCharge,
}: Props) {
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState("");

  if (item) {
    const charged = item.status === "charged";
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge size="sm" color={charged ? "dark" : "error"}>
            {charged ? "Charged" : "New damage"}
          </Badge>
          {charged && item.ledgerRef && (
            <Link
              to={`/admin/drivers/${driverId}/ledger`}
              className="text-sm text-brand-500 hover:underline"
            >
              {item.ledgerRef}
              {item.amountCents !== null
                ? ` · ${formatCents(item.amountCents)}`
                : ""}
            </Link>
          )}
        </div>
        <p className="text-sm text-gray-800">{item.description}</p>
        {!charged && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy} onClick={() => onCharge(item)}>
              Create charge
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => onUndo(item)}
            >
              Back to no change
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (!writing) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Badge size="sm" color="success">
          No change
        </Badge>
        <button
          type="button"
          className="text-sm text-error-600 hover:underline"
          onClick={() => setWriting(true)}
        >
          Mark new damage
        </button>
      </div>
    );
  }

  const save = () => {
    const trimmed = text.trim();
    if (trimmed === "") return;
    onMark(trimmed);
    setWriting(false);
    setText("");
  };
  return (
    <div className="space-y-2">
      <TextArea
        ariaLabel="Describe the new damage"
        placeholder="What is the new damage? e.g. Scratch, 10 cm, on the front bumper"
        rows={2}
        maxLength={MAX_DESCRIPTION}
        value={text}
        onChange={setText}
      />
      <div className="flex gap-2">
        <Button size="sm" disabled={busy || text.trim() === ""} onClick={save}>
          Save new damage
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setWriting(false);
            setText("");
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
