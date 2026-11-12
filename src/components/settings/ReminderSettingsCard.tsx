import { useState } from "react";
import {
  useReminderSettings,
  useSaveReminderSettings,
  type ReminderSettings,
} from "../../api/reminders.queries";
import { formatDateTime } from "../../utils";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import Switch from "../form/Switch";
import Button from "../ui/button/Button";
import ConfirmDialog from "../ui/modal/ConfirmDialog";

/** What the server's texting mode means for a reminder, in words. */
const SMS_MODE_TEXT: Record<ReminderSettings["smsMode"], string> = {
  off: "Texting is off on the server: switching reminders on composes nothing.",
  dry_run:
    "Texting is in test mode (dry run): reminders are composed and saved on each driver's page, but no text is sent.",
  live: "Texting is live: reminders are really sent to drivers.",
};

/**
 * The payment-reminder switch and payment link (Fleet revisions section 6). Reminders are off until staff turn them on
 * here, and turning them on asks first, because with live texting it starts texting drivers. The link is optional: until
 * the client says where drivers pay, it is empty and the line of a text that holds `{paymentLink}` is left out.
 */
function ReminderSettingsForm({ settings }: { settings: ReminderSettings }) {
  const save = useSaveReminderSettings();
  const [link, setLink] = useState(settings.paymentLink ?? "");
  const [confirmingOn, setConfirmingOn] = useState(false);
  const linkChanged = link.trim() !== (settings.paymentLink ?? "");

  return (
    <div className="space-y-4">
      <div>
        <Switch
          label="Send payment reminders"
          checked={settings.enabled}
          disabled={save.isPending}
          onChange={(enabled) => {
            if (enabled) {
              setConfirmingOn(true);
              return;
            }
            save.mutate({ enabled: false, paymentLink: settings.paymentLink });
          }}
        />
        <p className="mt-2 text-xs text-gray-500">
          {settings.enabled
            ? `On since ${formatDateTime(settings.enabledAt)}.`
            : "Off. Nothing is composed or sent until it is switched on."}{" "}
          {SMS_MODE_TEXT[settings.smsMode]}
          {settings.smsMode === "live" && !settings.quoConfigured && (
            <span className="text-error-600">
              {" "}
              No texting key is set, so sends will fail.
            </span>
          )}
        </p>
      </div>

      <div>
        <Label htmlFor="payment-link">
          Payment link{" "}
          <span className="font-normal text-gray-500">(optional)</span>
        </Label>
        <div className="flex flex-wrap items-start gap-2">
          <div className="min-w-0 flex-1">
            <Input
              id="payment-link"
              value={link}
              placeholder="https://..."
              maxLength={300}
              onChange={(e) => {
                save.reset();
                setLink(e.target.value);
              }}
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={!linkChanged || save.isPending}
            onClick={() =>
              save.mutate({
                enabled: settings.enabled,
                paymentLink: link.trim() === "" ? null : link.trim(),
              })
            }
          >
            {save.isPending ? "Saving..." : "Save link"}
          </Button>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Put{" "}
          <code className="rounded bg-gray-100 px-1">{"{paymentLink}"}</code> in
          a text to include it. While this is empty, the line of a text that
          holds it is left out.
        </p>
      </div>

      {save.isError && (
        <p role="alert" className="text-sm text-error-600">
          {save.error.message}
        </p>
      )}

      <ConfirmDialog
        isOpen={confirmingOn}
        title="Switch payment reminders on?"
        confirmLabel="Switch on"
        onCancel={() => setConfirmingOn(false)}
        onConfirm={() => {
          setConfirmingOn(false);
          save.mutate({ enabled: true, paymentLink: settings.paymentLink });
        }}
      >
        {SMS_MODE_TEXT[settings.smsMode]} Reminders follow the rules below:
        drivers who are behind are texted at most once a day, and only from now
        on.
      </ConfirmDialog>
    </div>
  );
}

/** The "Payment reminders" settings block: loads the settings, then shows the form. */
export default function ReminderSettingsCard() {
  const settings = useReminderSettings();
  if (settings.isPending) {
    return <p className="text-sm text-gray-500">Loading...</p>;
  }
  if (settings.isError) {
    return (
      <p role="alert" className="text-sm text-error-600">
        {settings.error.message}
      </p>
    );
  }
  // Keyed by the saved values so the link box restarts from what was saved.
  return (
    <ReminderSettingsForm
      key={`${settings.data.enabled}-${settings.data.paymentLink ?? ""}`}
      settings={settings.data}
    />
  );
}
