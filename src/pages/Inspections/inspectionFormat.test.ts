import { describe, expect, it } from "vitest";
import {
  coordinatesLabel,
  eventLabel,
  fuelChangeLabel,
  fuelLabel,
  mileageLabel,
  milesDrivenLabel,
  answerLabel,
  photoTitle,
  SHOT_ORDER,
  shotTitle,
  shortHash,
} from "./inspectionFormat";

describe("the staff words for the vehicle photos", () => {
  it("lists the 21 shots in the order the driver takes them, mirrors included (D112)", () => {
    expect(SHOT_ORDER).toHaveLength(21);
    expect(new Set(SHOT_ORDER).size).toBe(21);
    expect(SHOT_ORDER[0]).toBe("EXT_DRIVER_SIDE");
    expect(SHOT_ORDER[2]).toBe("EXT_LEFT_MIRROR");
    expect(SHOT_ORDER[4]).toBe("EXT_FRONT");
    expect(SHOT_ORDER[7]).toBe("EXT_RIGHT_MIRROR");
    expect(SHOT_ORDER[17]).toBe("INT_ODOMETER");
    expect(SHOT_ORDER[18]).toBe("INT_FUEL");
    expect(SHOT_ORDER.at(-1)).toBe("INT_REAR_SEATS");
    expect(shotTitle("EXT_RIGHT_MIRROR")).toBe("Right side mirror");
  });

  it("uses the client's English titles", () => {
    expect(shotTitle("INT_ODOMETER")).toBe("Mileage (odometer)");
    expect(shotTitle("NOT_A_SHOT")).toBe("NOT_A_SHOT");
  });

  it("names a close-up after its shot, and says the driver's answer (D112)", () => {
    expect(
      photoTitle({ shotId: "DAMAGE", position: 2, parentShotId: "EXT_FRONT" }),
    ).toBe("Front — damage close-up 2");
    expect(answerLabel(false, 0)).toBe("No damage");
    expect(answerLabel(true, 1)).toBe("Damage: 1 close-up");
    expect(answerLabel(true, 3)).toBe("Damage: 3 close-ups");
    expect(answerLabel(null, 0)).toBeNull();
    expect(answerLabel(undefined, 0)).toBeNull();
    expect(
      eventLabel({
        type: "damage_answered",
        meta: { shotId: "EXT_LEFT_MIRROR", hasDamage: true },
      }),
    ).toBe("Driver answered “damage” for Left side mirror");
    expect(
      eventLabel({
        type: "photo_uploaded",
        meta: { shotId: "DAMAGE", parentShotId: "EXT_REAR", position: 1 },
      }),
    ).toBe("Rear — damage close-up 1 uploaded");
  });

  it("names a damage photo by its number", () => {
    expect(photoTitle({ shotId: "DAMAGE", position: 2 })).toBe(
      "Damage photo 2",
    );
    expect(photoTitle({ shotId: "EXT_FRONT", position: 1 })).toBe(
      shotTitle("EXT_FRONT"),
    );
  });

  it("says the fuel level in words, with a dash for none", () => {
    expect(fuelLabel("3_4")).toBe("3/4");
    expect(fuelLabel("full")).toBe("Full");
    expect(fuelLabel("empty")).toBe("Empty");
    expect(fuelLabel(null)).toBe("—");
  });

  it("writes the mileage with a thousands separator", () => {
    expect(mileageLabel(84213)).toBe("84,213 mi");
    expect(mileageLabel(0)).toBe("0 mi");
    expect(mileageLabel(null)).toBe("—");
  });

  it("writes a place only when both numbers are there", () => {
    expect(coordinatesLabel(41.88, -87.63)).toBe("41.88000, -87.63000");
    expect(coordinatesLabel(41.88, null)).toBeNull();
    expect(coordinatesLabel(null, null)).toBeNull();
  });

  it("shortens a fingerprint", () => {
    expect(shortHash("a".repeat(64))).toBe("a".repeat(12));
  });
});

describe("the activity log in words", () => {
  it("says what happened", () => {
    expect(eventLabel({ type: "created", meta: null })).toBe("Inspection made");
    expect(eventLabel({ type: "opened", meta: null })).toBe(
      "Driver opened the link",
    );
    expect(eventLabel({ type: "revoked", meta: null })).toBe("Link revoked");
  });

  it("tells a real text from a test-mode one", () => {
    expect(eventLabel({ type: "link_sent", meta: { textMode: "live" } })).toBe(
      "Link texted to the driver",
    );
    expect(
      eventLabel({ type: "link_sent", meta: { textMode: "dry_run" } }),
    ).toMatch(/not sent/);
  });

  it("names the photo and whether it was a retake", () => {
    expect(
      eventLabel({
        type: "photo_uploaded",
        meta: { shotId: "EXT_FRONT", position: 1, retake: false },
      }),
    ).toBe("Front uploaded");
    expect(
      eventLabel({
        type: "photo_uploaded",
        meta: { shotId: "DAMAGE", position: 2, retake: true },
      }),
    ).toBe("Damage photo 2 retaken");
  });

  it("shows the review note and the staff note text", () => {
    expect(
      eventLabel({ type: "reviewed", meta: { note: "Looks fine." } }),
    ).toBe("Marked reviewed: Looks fine.");
    expect(eventLabel({ type: "reviewed", meta: { note: null } })).toBe(
      "Marked reviewed",
    );
    expect(
      eventLabel({ type: "staff_note", meta: { text: "Old scuff." } }),
    ).toBe("Old scuff.");
  });

  it("falls back to the type for one it does not know", () => {
    expect(eventLabel({ type: "something_new", meta: null })).toBe(
      "something_new",
    );
  });
});

describe("compare words", () => {
  it("says miles driven with a thousands separator, or a dash", () => {
    expect(milesDrivenLabel(1001)).toBe("1,001 mi driven");
    expect(milesDrivenLabel(null)).toBe("—");
  });

  it("says the fuel change in eighths of a tank", () => {
    expect(fuelChangeLabel(0)).toBe("Same level");
    expect(fuelChangeLabel(-4)).toBe("4/8 of a tank less");
    expect(fuelChangeLabel(1)).toBe("1/8 of a tank more");
    expect(fuelChangeLabel(null)).toBe("—");
  });

  it("words the damage log lines", () => {
    expect(
      eventLabel({
        type: "damage_marked",
        meta: { shotId: "EXT_FRONT", description: "Cracked bumper" },
      }),
    ).toBe("New damage marked (Front): Cracked bumper");
    expect(
      eventLabel({ type: "damage_cleared", meta: { description: "Cracked" } }),
    ).toBe("Damage cleared: Cracked");
    expect(
      eventLabel({ type: "damage_charged", meta: { ledgerRef: "CH-1042" } }),
    ).toBe("Damage charged to the driver (CH-1042)");
  });
});
