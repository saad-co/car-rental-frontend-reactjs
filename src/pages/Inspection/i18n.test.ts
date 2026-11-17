import { describe, expect, it } from "vitest";
import clientTexts from "../../i18n/inspection-i18n.json";
import extraTexts from "../../i18n/inspection-i18n-extra.json";
import { pickLanguage, shotText, t, vehicleLine } from "./i18n";

/** Every dotted path of every text in an object. */
function paths(node: unknown, prefix = ""): string[] {
  if (typeof node === "string") return [prefix];
  return Object.entries(node as Record<string, unknown>).flatMap(([k, v]) =>
    paths(v, prefix ? `${prefix}.${k}` : k),
  );
}

describe("the client's translation file and our extras", () => {
  it("is the file the client shipped (version 1.2), in English and Spanish", () => {
    expect(clientTexts._meta.version).toBe("1.2");
    expect(clientTexts._meta.languages).toEqual(["en", "es"]);
  });

  it("has the same texts in both languages", () => {
    expect(paths(clientTexts.es).sort()).toEqual(paths(clientTexts.en).sort());
    expect(paths(extraTexts.es).sort()).toEqual(paths(extraTexts.en).sort());
  });

  it("has a title and an instruction for each of the 19 shots, both languages", () => {
    expect(Object.keys(clientTexts.en.shots)).toHaveLength(19);
    for (const language of ["en", "es"] as const) {
      for (const shotId of Object.keys(clientTexts.en.shots)) {
        const text = shotText(language, shotId);
        expect(text.title).not.toBe(shotId);
        expect(text.instruction.length).toBeGreaterThan(10);
      }
    }
  });

  it("has the two mirror shots in our extras, both languages (D112)", () => {
    expect(shotText("en", "EXT_LEFT_MIRROR").title).toBe("Left side mirror");
    expect(shotText("es", "EXT_RIGHT_MIRROR").title).toBe(
      "Espejo lateral derecho",
    );
    for (const language of ["en", "es"] as const) {
      for (const shotId of ["EXT_LEFT_MIRROR", "EXT_RIGHT_MIRROR"]) {
        expect(shotText(language, shotId).instruction.length).toBeGreaterThan(
          10,
        );
      }
    }
  });

  it("asks the damage question and counts the close-ups in both languages", () => {
    expect(t("en", "x.damage_question")).toBe(
      "Is there any damage in this photo?",
    );
    expect(t("es", "x.damage_count", { count: 2 })).toBe("Daños: 2");
    expect(t("en", "x.closeups_taken", { count: 1, max: 5 })).toBe(
      "Damage photos for this part: 1 of 5",
    );
  });
});

describe("t()", () => {
  it("fills the {placeholders}", () => {
    expect(t("en", "capture.progress", { current: 3, total: 19 })).toBe(
      "Photo 3 of 19",
    );
    expect(t("es", "capture.progress", { current: 3, total: 19 })).toBe(
      "Foto 3 de 19",
    );
    expect(
      t("en", "submit.success_body_check_in", { reference: "INS-2026-000123" }),
    ).toBe(
      "Your check-in photos were received. Reference number: INS-2026-000123.",
    );
  });

  it("leaves a placeholder with no value as written, so the gap is visible", () => {
    expect(t("en", "capture.progress", { current: 3 })).toBe(
      "Photo 3 of {total}",
    );
  });

  it("reads our extra words from the same function", () => {
    expect(t("en", "x.next")).toBe("Next");
    expect(t("es", "x.next")).toBe("Siguiente");
  });

  it("uses the client's own words for the welcome screen", () => {
    expect(t("en", "welcome.welcome_headline")).toBe("Welcome to GonzoCar");
    expect(t("es", "welcome.start_button_check_out")).toBe(
      "Comenzar devolución",
    );
  });
});

describe("pickLanguage()", () => {
  it("uses the phone's language: Spanish if it starts with es, otherwise English", () => {
    expect(pickLanguage(null, "es-MX")).toBe("es");
    expect(pickLanguage(null, "ES")).toBe("es");
    expect(pickLanguage(null, "en-US")).toBe("en");
    expect(pickLanguage(null, "fr-FR")).toBe("en");
    expect(pickLanguage(null, undefined)).toBe("en");
  });

  it("keeps a choice the driver already made on this phone", () => {
    expect(pickLanguage("en", "es-MX")).toBe("en");
    expect(pickLanguage("es", "en-US")).toBe("es");
  });

  it("ignores a saved value that is not a language", () => {
    expect(pickLanguage("fr", "es-MX")).toBe("es");
  });
});

describe("vehicleLine()", () => {
  const full = {
    model: "2021 Toyota Camry",
    plate: "AB 12345",
    vinLast4: "3456",
  };

  it("puts the model text where the client's year, make and model go", () => {
    expect(vehicleLine("en", full)).toBe(
      "2021 Toyota Camry · Plate AB 12345 · VIN ending 3456",
    );
    expect(vehicleLine("es", full)).toBe(
      "2021 Toyota Camry · Placa AB 12345 · VIN termina en 3456",
    );
  });

  it("drops the part it has no value for", () => {
    expect(vehicleLine("en", { ...full, plate: null })).toBe(
      "2021 Toyota Camry · VIN ending 3456",
    );
    expect(vehicleLine("en", { ...full, vinLast4: null })).toBe(
      "2021 Toyota Camry · Plate AB 12345",
    );
    expect(
      vehicleLine("en", { model: "Camry", plate: null, vinLast4: null }),
    ).toBe("Camry");
  });
});
