import { useState } from "react";
import {
  useUpdateDriverRentSettings,
  type DriverDetail,
} from "../../api/drivers.queries";
import { formatTimeOfDay } from "../../utils";
import { FormField } from "../form/FormLayout";
import Switch from "../form/Switch";
import ConfirmDialog from "../ui/modal/ConfirmDialog";
import RentDueTimeSelect from "./RentDueTimeSelect";

/** The dialog that sets the time rent is due. Mount it only while open, so it starts from the saved time every time. */
function EditDueTimeDialog({
  driver,
  onClose,
}: {
  driver: DriverDetail;
  onClose: () => void;
}) {
  const update = useUpdateDriverRentSettings(driver.id);
  const [time, setTime] = useState(driver.rentDueTime ?? "");

  return (
    <ConfirmDialog
      isOpen
      title="Payment due time"
      confirmLabel={update.isPending ? "Saving..." : "Save"}
      confirmDisabled={update.isPending}
      onCancel={onClose}
      onConfirm={() =>
        update.mutate(
          { rentDueTime: time === "" ? null : time },
          { onSuccess: onClose },
        )
      }
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
        <FormField
          label="Rent is due at"
          htmlFor="rent-due-time"
          hint="Chicago time. Tell the driver this time. A payment is late after it."
        >
          <RentDueTimeSelect
            id="rent-due-time"
            value={time}
            onChange={setTime}
            disabled={update.isPending}
          />
        </FormField>
      </div>
    </ConfirmDialog>
  );
}

/**
 * The driver's payment due time and the "On payment plan" switch (D92). The due day comes from the signed contract; the
 * time is set here (or when the driver is added). The switch saves at once: while it is on, the driver is left out of the
 * Should Be Deactivated list; staff switch it off when the plan is broken.
 */
export default function RentSettingsCard({ driver }: { driver: DriverDetail }) {
  const [editing, setEditing] = useState(false);
  const update = useUpdateDriverRentSettings(driver.id);

  return (
    <div className="rounded-2xl border border-gray-200 bg-surface p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-800">
          Payment settings
        </h2>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-sm font-medium text-brand-500 hover:text-brand-600"
        >
          Edit time
        </button>
      </div>
      <ul className="divide-y divide-gray-100">
        <li className="flex items-start gap-5 py-2.5">
          <span className="w-1/3 text-sm text-gray-500">Due time</span>
          <span className="w-2/3 text-sm text-gray-800">
            {driver.rentDueTime ? (
              `${formatTimeOfDay(driver.rentDueTime)} (Chicago)`
            ) : (
              <span className="text-gray-400">
                Not set (late when the due day ends)
              </span>
            )}
          </span>
        </li>
        <li className="py-3">
          <Switch
            label="On payment plan"
            checked={driver.onPaymentPlan}
            disabled={update.isPending}
            onChange={(onPaymentPlan) => update.mutate({ onPaymentPlan })}
          />
          <p className="mt-2 text-xs text-gray-500">
            While on, the driver is not listed under Should Be Deactivated.
            Switch it off if they miss a plan payment.
          </p>
          {update.isError && (
            <p role="alert" className="mt-2 text-xs text-error-600">
              {update.error.message}
            </p>
          )}
        </li>
      </ul>
      {editing && (
        <EditDueTimeDialog driver={driver} onClose={() => setEditing(false)} />
      )}
    </div>
  );
}
