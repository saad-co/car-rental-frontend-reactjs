import { useState } from "react";
import { Link, useParams } from "react-router";
import { useDriver } from "../../api/drivers.queries";
import {
  useChargeDamage,
  useInspectionCompare,
  useMarkDamage,
  useUnmarkDamage,
  type DamageItem,
  type InspectionCompare as Compare,
  type InspectionPhoto,
} from "../../api/inspections.queries";
import { useLedgerOverview } from "../../api/ledger.queries";
import NewEntryDialog from "../../components/ledger/NewEntryDialog";
import Badge from "../../components/ui/badge/Badge";
import BackLink from "../../components/ui/button/BackLink";
import { formatCents } from "../../utils";
import DamageDecision from "./DamageDecision";
import {
  answerLabel,
  fuelChangeLabel,
  fuelLabel,
  mileageLabel,
  milesDrivenLabel,
  photoTitle,
  shotTitle,
} from "./inspectionFormat";
import PhotoViewer from "./PhotoViewer";

/** A photo thumbnail that opens the viewer; "No photo" when the driver sent none. */
function Thumb({
  label,
  photo,
  onOpen,
}: {
  label: string;
  photo: InspectionPhoto | null;
  onOpen: () => void;
}) {
  return (
    <div className="flex-1">
      <p className="mb-1 text-theme-xs text-gray-500">{label}</p>
      {photo ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Open ${label} photo`}
          className="group aspect-[4/3] w-full overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-300"
        >
          {photo.thumbUrl ? (
            <img
              src={photo.thumbUrl}
              alt={label}
              loading="lazy"
              className="h-full w-full object-cover transition group-hover:scale-105"
            />
          ) : (
            <span className="flex h-full items-center justify-center p-2 text-theme-xs text-gray-500">
              No preview
            </span>
          )}
        </button>
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-dashed border-gray-300 text-theme-xs text-gray-500">
          No photo
        </div>
      )}
    </div>
  );
}

/** Under a pair: what the driver answered at pickup and at return (D112); nothing for older inspections. */
function AnswerLine({
  checkIn,
  checkOut,
}: {
  checkIn: string | null;
  checkOut: string | null;
}) {
  if (!checkIn && !checkOut) return null;
  return (
    <p className="mt-2 text-theme-xs text-gray-600">
      Driver said — check-in: {checkIn ?? "not asked"} · check-out:{" "}
      {checkOut ?? "not asked"}
    </p>
  );
}

/** What the viewer is showing: the photos it walks through, which one, and the line under each title. */
interface Viewing {
  photos: InspectionPhoto[];
  captions: string[];
  index: number;
}

/** What "Create charge" is charging: the item and the words for the description. */
interface Charging {
  item: DamageItem;
  title: string;
}

/** The comparison once loaded. */
function CompareBody({ compare }: { compare: Compare }) {
  const driverId = compare.checkOut.driverId;
  const driver = useDriver(driverId);
  const overview = useLedgerOverview(driverId);
  const mark = useMarkDamage(compare.checkOut.id, driverId);
  const unmark = useUnmarkDamage(compare.checkOut.id, driverId);
  const charge = useChargeDamage(compare.checkOut.id, driverId);
  const [viewing, setViewing] = useState<Viewing | null>(null);
  const [charging, setCharging] = useState<Charging | null>(null);
  const [round, setRound] = useState(0);
  const [done, setDone] = useState<string | null>(null);

  const driverName = driver.data
    ? `${driver.data.firstName} ${driver.data.lastName}`
    : "the driver";
  const busy = mark.isPending || unmark.isPending || charge.isPending;
  const error = mark.error ?? unmark.error;
  const checkInRef = compare.checkIn?.reference ?? "";

  const openPair = (
    checkIn: InspectionPhoto | null,
    checkOut: InspectionPhoto | null,
    first: "in" | "out",
  ) => {
    const list: { photo: InspectionPhoto; caption: string }[] = [];
    if (checkIn) list.push({ photo: checkIn, caption: "Check-in" });
    if (checkOut) list.push({ photo: checkOut, caption: "Check-out" });
    const index = list.findIndex(
      (entry) => entry.caption === (first === "in" ? "Check-in" : "Check-out"),
    );
    setViewing({
      photos: list.map((entry) => entry.photo),
      captions: list.map((entry) => entry.caption),
      index: Math.max(0, index),
    });
  };
  const openOne = (photo: InspectionPhoto, caption: string) =>
    setViewing({ photos: [photo], captions: [caption], index: 0 });

  const decisionFor = (
    item: DamageItem | null,
    photo: InspectionPhoto | null,
    title: string,
  ) =>
    photo ? (
      <DamageDecision
        item={item}
        driverId={driverId}
        busy={busy}
        onMark={(description) => {
          setDone(null);
          mark.mutate({ photoId: photo.id, description });
        }}
        onUndo={(target) => unmark.mutate(target.id)}
        onCharge={(target) => {
          setDone(null);
          charge.reset();
          setRound((r) => r + 1);
          setCharging({ item: target, title });
        }}
      />
    ) : (
      <p className="text-sm text-gray-500">
        The check-out has no photo of this, so there is nothing to mark.
      </p>
    );

  return (
    <div className="space-y-6">
      <BackLink to={`/admin/inspections/${compare.checkOut.id}`}>
        Back to the check-out photos
      </BackLink>

      <div className="rounded-2xl border border-gray-200 bg-surface p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-800">
            Compare with check-in
          </h1>
          <Badge size="sm" color="light">
            {driverName}
          </Badge>
        </div>
        {compare.available && compare.checkIn ? (
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-theme-xs text-gray-500">Check-in</dt>
              <dd className="text-sm font-medium text-gray-800">
                <Link
                  className="text-brand-500 hover:underline"
                  to={`/admin/inspections/${compare.checkIn.id}`}
                >
                  {compare.checkIn.reference}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-theme-xs text-gray-500">Check-out</dt>
              <dd className="text-sm font-medium text-gray-800">
                {compare.checkOut.reference}
              </dd>
            </div>
            {/* Typed readings exist only on inspections made before D112; since then staff compare the two photos. */}
            <div>
              <dt className="text-theme-xs text-gray-500">Mileage</dt>
              <dd className="text-sm font-medium text-gray-800">
                {compare.milesDriven === null ? (
                  <span className="font-normal text-gray-600">
                    Compare the two odometer photos below
                  </span>
                ) : (
                  <>
                    {mileageLabel(compare.checkIn.odometerMiles)} →{" "}
                    {mileageLabel(compare.checkOut.odometerMiles)}
                    <span className="ml-2 font-normal text-gray-500">
                      ({milesDrivenLabel(compare.milesDriven)})
                    </span>
                  </>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-theme-xs text-gray-500">Fuel</dt>
              <dd className="text-sm font-medium text-gray-800">
                {compare.fuelChangeEighths === null ? (
                  <span className="font-normal text-gray-600">
                    Compare the two fuel photos below
                  </span>
                ) : (
                  <>
                    {fuelLabel(compare.checkIn.fuelLevel)} →{" "}
                    {fuelLabel(compare.checkOut.fuelLevel)}
                    <span className="ml-2 font-normal text-gray-500">
                      ({fuelChangeLabel(compare.fuelChangeEighths)})
                    </span>
                  </>
                )}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-3 text-sm text-gray-600">{compare.reason}</p>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-error-600">
          {error.message}
        </p>
      )}
      {done && (
        <p
          role="status"
          className="rounded-lg bg-success-50 px-4 py-3 text-sm text-success-700"
        >
          {done}{" "}
          <Link
            to={`/admin/drivers/${driverId}/ledger`}
            className="font-medium underline"
          >
            View the ledger
          </Link>
        </p>
      )}

      {compare.available && (
        <>
          <div className="rounded-2xl border border-gray-200 bg-surface p-6">
            <h2 className="text-base font-semibold text-gray-800">
              The {compare.pairs.length} photos, side by side
            </h2>
            <ul className="mt-2 divide-y divide-gray-100">
              {compare.pairs.map((pair) => (
                <li
                  key={pair.shotId}
                  className="grid gap-4 py-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]"
                  data-testid={`pair-${pair.shotId}`}
                >
                  <div>
                    <p className="mb-2 text-sm font-medium text-gray-800">
                      {shotTitle(pair.shotId)}
                    </p>
                    <div className="flex gap-3">
                      <Thumb
                        label="Check-in"
                        photo={pair.checkIn}
                        onOpen={() =>
                          openPair(pair.checkIn, pair.checkOut, "in")
                        }
                      />
                      <Thumb
                        label="Check-out"
                        photo={pair.checkOut}
                        onOpen={() =>
                          openPair(pair.checkIn, pair.checkOut, "out")
                        }
                      />
                    </div>
                    <AnswerLine
                      checkIn={answerLabel(
                        pair.checkInAnswer,
                        pair.checkInCloseUps.length,
                      )}
                      checkOut={answerLabel(
                        pair.checkOutAnswer,
                        pair.checkOutCloseUps.length,
                      )}
                    />
                    {pair.checkInCloseUps.length > 0 && (
                      <div className="mt-3">
                        <p className="text-theme-xs text-gray-500">
                          Damage already there at pickup (not charged)
                        </p>
                        <div className="mt-1 grid grid-cols-4 gap-2">
                          {pair.checkInCloseUps.map((photo) => (
                            <div key={photo.id}>
                              <Thumb
                                label={`Close-up ${photo.position}`}
                                photo={photo}
                                onOpen={() =>
                                  openOne(photo, `Check-in ${checkInRef}`)
                                }
                              />
                              {photo.driverNote && (
                                <p className="mt-1 text-theme-xs text-gray-500">
                                  “{photo.driverNote}”
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="self-center">
                    {decisionFor(
                      pair.damageItem,
                      pair.checkOut,
                      shotTitle(pair.shotId),
                    )}
                  </div>
                  {pair.checkOutCloseUps.length > 0 && (
                    <ul className="space-y-3 rounded-xl bg-gray-50 p-3 lg:col-span-2">
                      {pair.checkOutCloseUps.map(({ photo, damageItem }) => (
                        <li
                          key={photo.id}
                          className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]"
                        >
                          <div className="flex gap-3">
                            <div className="w-1/3">
                              <Thumb
                                label={`Return close-up ${photo.position}`}
                                photo={photo}
                                onOpen={() => openOne(photo, "Check-out")}
                              />
                            </div>
                            {photo.driverNote && (
                              <p className="self-end text-sm text-gray-600">
                                Driver’s note: “{photo.driverNote}”
                              </p>
                            )}
                          </div>
                          <div className="self-center">
                            {decisionFor(damageItem, photo, photoTitle(photo))}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Damage photos that belong to no shot: inspections made before the per-shot question (D112). */}
          {compare.checkInDamage.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-surface p-6">
              <h2 className="text-base font-semibold text-gray-800">
                Damage already there at pickup ({compare.checkInDamage.length})
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                The driver photographed these on the check-in. They are not
                charged.
              </p>
              {compare.checkInDamage.length === 0 ? (
                <p className="mt-3 text-sm text-gray-500">
                  None reported at pickup.
                </p>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {compare.checkInDamage.map((photo) => (
                    <div key={photo.id}>
                      <Thumb
                        label={photoTitle(photo)}
                        photo={photo}
                        onOpen={() => openOne(photo, `Check-in ${checkInRef}`)}
                      />
                      {photo.driverNote && (
                        <p className="mt-1 text-theme-xs text-gray-500">
                          “{photo.driverNote}”
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {compare.checkOutDamage.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-surface p-6">
              <h2 className="text-base font-semibold text-gray-800">
                Damage photos added at return ({compare.checkOutDamage.length})
              </h2>
              {compare.checkOutDamage.length === 0 ? (
                <p className="mt-3 text-sm text-gray-500">
                  The driver added no damage photos at return.
                </p>
              ) : (
                <ul className="mt-2 divide-y divide-gray-100">
                  {compare.checkOutDamage.map(({ photo, damageItem }) => (
                    <li
                      key={photo.id}
                      className="grid gap-4 py-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]"
                    >
                      <div className="flex gap-3">
                        <div className="w-1/2">
                          <Thumb
                            label={photoTitle(photo)}
                            photo={photo}
                            onOpen={() => openOne(photo, "Check-out")}
                          />
                        </div>
                        {photo.driverNote && (
                          <p className="self-end text-sm text-gray-600">
                            Driver’s note: “{photo.driverNote}”
                          </p>
                        )}
                      </div>
                      <div className="self-center">
                        {decisionFor(damageItem, photo, photoTitle(photo))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}

      <NewEntryDialog
        key={`charge-${round}`}
        isOpen={charging !== null}
        driverId={driverId}
        driverName={driverName}
        balanceCents={overview.data?.balanceCents ?? 0}
        initialMode="debit"
        prefill={
          charging
            ? {
                description: `Damage: ${charging.title} — ${charging.item.description} (${compare.checkOut.reference} vs ${checkInRef})`,
              }
            : undefined
        }
        busy={charge.isPending}
        entryError={charge.error}
        paymentError={null}
        onSaveEntry={(entry) => {
          if (!charging) return;
          charge.mutate(
            { itemId: charging.item.id, entry },
            {
              onSuccess: (result) => {
                setCharging(null);
                setDone(
                  `Charged ${formatCents(result.entry.amountCents)} to ${driverName} (${result.entry.ref}).`,
                );
              },
            },
          );
        }}
        onSavePayment={() => undefined}
        onCancel={() => setCharging(null)}
      />

      {viewing && (
        <PhotoViewer
          photos={viewing.photos}
          captions={viewing.captions}
          index={viewing.index}
          onIndex={(index) => setViewing({ ...viewing, index })}
          onClose={() => setViewing(null)}
          place={null}
        />
      )}
    </div>
  );
}

/**
 * `/admin/inspections/:id/compare`: a check-out beside the check-in it is paired with (Module 3 chat 2, step 3). Staff look at
 * the pairs of shots (with the driver's damage answers and close-ups, D112), mark "New damage" where the check-out shows something the check-in does not, and charge it to the driver's ledger
 * through the ledger's own charge window. Damage already on the check-in is shown read-only and is never charged.
 */
export default function InspectionCompare() {
  const { id = "" } = useParams();
  const compare = useInspectionCompare(id);

  if (compare.isPending) {
    return <p className="text-sm text-gray-500">Loading the comparison...</p>;
  }
  if (compare.isError) {
    return (
      <p role="alert" className="text-sm text-error-600">
        {compare.error.message}
      </p>
    );
  }
  return <CompareBody compare={compare.data} />;
}
