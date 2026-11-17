import { describe, expect, it } from "vitest";
import {
  firstMissingIndex,
  fitWithin,
  parseMileage,
  percent,
  readingOf,
  type ShotInfo,
} from "./flow";

const shots: ShotInfo[] = ["A", "B", "C", "D"].map((shotId, i) => ({
  shotId,
  position: i + 1,
  required: true,
}));

describe("firstMissingIndex()", () => {
  it("starts at the first shot when nothing is done", () => {
    expect(firstMissingIndex(shots, new Set())).toBe(0);
  });

  it("resumes at the first shot with no photo, even if a later one has one", () => {
    expect(firstMissingIndex(shots, new Set(["A", "B", "D"]))).toBe(2);
  });

  it("is null when every required shot has a photo", () => {
    expect(firstMissingIndex(shots, new Set(["A", "B", "C", "D"]))).toBeNull();
  });

  it("skips a shot that is not required", () => {
    const list = [...shots.slice(0, 3), { ...shots[3], required: false }];
    expect(firstMissingIndex(list, new Set(["A", "B", "C"]))).toBeNull();
  });
});

describe("readingOf()", () => {
  it("links the mileage to the odometer shot and the fuel level to the fuel shot", () => {
    expect(readingOf("INT_ODOMETER")).toBe("odometer");
    expect(readingOf("INT_FUEL")).toBe("fuel");
    expect(readingOf("EXT_FRONT")).toBeNull();
  });
});

describe("parseMileage()", () => {
  it("reads whole numbers typed with digits only", () => {
    expect(parseMileage("84213")).toBe(84213);
    expect(parseMileage(" 84213 ")).toBe(84213);
    expect(parseMileage("0")).toBe(0);
  });

  it("refuses anything else", () => {
    for (const bad of [
      "",
      "  ",
      "84k",
      "84,213",
      "84.2",
      "-5",
      "1e3",
      "12345678",
    ]) {
      expect(parseMileage(bad)).toBeNull();
    }
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
    expect(percent(0, 19)).toBe(0);
    expect(percent(5, 19)).toBe(26);
    expect(percent(19, 19)).toBe(100);
    expect(percent(0, 0)).toBe(0);
    expect(percent(30, 19)).toBe(100);
  });
});
