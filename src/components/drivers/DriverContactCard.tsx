import { useState } from "react";
import { useUpdateDriverContact } from "../../api/drivers.queries";
import { formatUsPhone } from "../../utils";
import { FormField } from "../form/FormLayout";
import Input from "../form/input/InputField";
import ConfirmDialog from "../ui/modal/ConfirmDialog";
import { contactChanges } from "./contactChanges";

/**
 * The edit dialog (B148, D117). Mount it only while it is open, so the boxes start from the saved values every time.
 * Only the fields that really changed are sent; with no change, Save just closes.
 */
function EditContactDialog({
  driverId,
  email,
  phone,
  onClose,
}: {
  driverId: string;
  email: string;
  phone: string;
  onClose: () => void;
}) {
  const update = useUpdateDriverContact(driverId);
  const [form, setForm] = useState({ email, phone: formatUsPhone(phone) });

  return (
    <ConfirmDialog
      isOpen
      title="Edit contact details"
      confirmLabel={update.isPending ? "Saving..." : "Save"}
      confirmDisabled={update.isPending}
      onCancel={onClose}
      onConfirm={() => {
        const changes = contactChanges({ email, phone }, form);
        if (Object.keys(changes).length === 0) {
          onClose();
          return;
        }
        update.mutate(changes, { onSuccess: onClose });
      }}
    >
      <div className="space-y-4">
        {update.isError && (
          <p
            role="alert"
            className="rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-600"
          >
            {update.error.message}
          </p>
        )}
        <FormField label="Email" htmlFor="contact-email">
          <Input
            id="contact-email"
            type="email"
            value={form.email}
            autoComplete="off"
            onChange={(event) =>
              setForm((f) => ({ ...f, email: event.target.value }))
            }
          />
        </FormField>
        <FormField label="Phone" htmlFor="contact-phone">
          <Input
            id="contact-phone"
            type="tel"
            value={form.phone}
            autoComplete="off"
            onChange={(event) =>
              setForm((f) => ({ ...f, phone: event.target.value }))
            }
          />
        </FormField>
        <p className="text-xs text-gray-500">
          Texts already sent or received stay under the old number, and a
          contract already sent keeps the details it was sent with. The change
          is logged.
        </p>
      </div>
    </ConfirmDialog>
  );
}

/** The driver's email and phone, with an Edit button (B148, D117). */
export default function DriverContactCard({
  driverId,
  email,
  phone,
}: {
  driverId: string;
  email: string;
  phone: string;
}) {
  const [editing, setEditing] = useState(false);
  const rows: [string, string][] = [
    ["Email", email],
    ["Phone", formatUsPhone(phone)],
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-surface p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-800">Contact</h2>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-sm font-medium text-brand-500 hover:text-brand-600"
        >
          Edit
        </button>
      </div>
      <ul className="divide-y divide-gray-100">
        {rows.map(([label, value]) => (
          <li key={label} className="flex items-start gap-5 py-2.5">
            <span className="w-1/3 text-sm text-gray-500">{label}</span>
            <span className="w-2/3 text-sm wrap-break-word text-gray-800">
              {value}
            </span>
          </li>
        ))}
      </ul>
      {editing && (
        <EditContactDialog
          driverId={driverId}
          email={email}
          phone={phone}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}
