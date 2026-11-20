import { describe, expect, it } from "vitest";
import { contactChanges } from "./contactChanges";

const current = { email: "pat@test.dev", phone: "+13057210909" };

describe("contactChanges", () => {
  it("sends nothing when nothing changed, however the values are written", () => {
    expect(
      contactChanges(current, {
        email: " PAT@test.dev ",
        phone: "(305) 721-0909",
      }),
    ).toEqual({});
    expect(
      contactChanges(current, {
        email: "pat@test.dev",
        phone: "+1 305 721 0909",
      }),
    ).toEqual({});
  });

  it("sends only the phone when only the phone changed", () => {
    expect(
      contactChanges(current, {
        email: "pat@test.dev",
        phone: "(708) 855-9218",
      }),
    ).toEqual({ phone: "(708) 855-9218" });
  });

  it("sends only the email when only the email changed, trimmed", () => {
    expect(
      contactChanges(current, {
        email: " grahambaker36@gmail.com ",
        phone: "(305) 721-0909",
      }),
    ).toEqual({ email: "grahambaker36@gmail.com" });
  });

  it("sends both when both changed", () => {
    expect(
      contactChanges(current, { email: "new@test.dev", phone: "7088559218" }),
    ).toEqual({ email: "new@test.dev", phone: "7088559218" });
  });

  it("sends an emptied box, so the server answers with its error and nothing is lost silently", () => {
    expect(
      contactChanges(current, { email: "", phone: "(305) 721-0909" }),
    ).toEqual({ email: "" });
  });
});
