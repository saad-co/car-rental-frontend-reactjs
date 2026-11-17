import { describe, expect, it } from "vitest";
import {
  apiShotOf,
  closeUpSlot,
  fitWithin,
  percent,
  resumePoint,
  type ShotInfo,
} from "./flow";

const shots: ShotInfo[] = ["A", "B", "C", "D"].map((shotId, i) => ({
  shotId,
  position: i + 1,
  required: true,
}));

describe("resumePoint() (D112)", () => {
  const none = () => 0;
  const all = new Set(["A", "B", "C", "D"]);
  const answered = (yes: string[] = []) =>
    new Map(["A", "B", "C", "D"].map((id) => [id, yes.includes(id)]));

  it("starts at the first shot's photo when nothing is done", () => {
    expect(resumePoint(shots, new Set(), new Map(), none)).toEqual({
      kind: "shot",
      index: 0,
    });
  });

  it("resumes at the first shot with no photo, even if a later one has one", () => {
    expect(
      resumePoint(shots, new Set(["A", "B", "D"]), answered(), none),
    ).toEqual({ kind: "shot", index: 2 });
  });

  it("asks the damage question of a shot that has its photo but no answer", () => {
    const answers = new Map([["A", false]]);
    expect(resumePoint(shots, all, answers, none)).toEqual({
      kind: "ask",
      index: 1,
    });
  });

  it("goes to the close-ups of a shot answered yes with none taken yet", () => {
    expect(
      resumePoint(shots, all, answered(["C"]), (id) => (id === "C" ? 0 : 0)),
    ).toEqual({ kind: "closeUp", index: 2 });
    expect(
      resumePoint(shots, all, answered(["C"]), (id) => (id === "C" ? 1 : 0)),
    ).toBeNull();
  });

  it("is null when every shot has its photo and answer", () => {
    expect(resumePoint(shots, all, answered(), none)).toBeNull();
  });

  it("skips a shot that is not required", () => {
    const list = [...shots.slice(0, 3), { ...shots[3], required: false }];
    const answers = new Map([
      ["A", false],
      ["B", false],
      ["C", false],
    ]);
    expect(
      resumePoint(list, new Set(["A", "B", "C"]), answers, none),
    ).toBeNull();
  });
});

describe("close-up slots", () => {
  it("names a close-up's slot after its shot, and tells the API DAMAGE with the parent", () => {
    expect(closeUpSlot("EXT_FRONT")).toBe("DAMAGE@EXT_FRONT");
    expect(apiShotOf("DAMAGE@EXT_FRONT")).toEqual({
      shotId: "DAMAGE",
      parentShotId: "EXT_FRONT",
    });
    expect(apiShotOf("EXT_FRONT")).toEqual({ shotId: "EXT_FRONT" });
  });
});

describe("fitWithin()", () => {
  it("scales the longest side down to the limit and keeps the shape", () => {
    expect(fitWithin(4032, 3024, 2048)).toEqual({ width: 2048, height: 1536 });
    expect(fitWithin(3024, 4032, 2048)).toEqual({ width: 1536, height: 2048 });
  });

  it("never scales a small photo up", () => {
    expect(fitWithin(1000, 800, 2048)).toEqual({ width: 1000, height: 800 });
    expect(fitWithin(2048, 2048, 2048)).toEqual({ width: 2048, height: 2048 });
  });

  it("never returns a zero side", () => {
    expect(fitWithin(100000, 1, 2048).height).toBeGreaterThanOrEqual(1);
  });
});

describe("percent()", () => {
  it("is whole numbers from 0 to 100", () => {
    expect(percent(0, 21)).toBe(0);
    expect(percent(5, 21)).toBe(23);
    expect(percent(21, 21)).toBe(100);
    expect(percent(0, 0)).toBe(0);
    expect(percent(30, 21)).toBe(100);
  });
});
