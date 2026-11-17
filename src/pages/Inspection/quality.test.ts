import { describe, expect, it } from "vitest";
import {
  assessQuality,
  DARK_MEAN_LUMA,
  laplacianVariance,
  meanLuma,
} from "./quality";

/** RGBA pixels from a function of (x, y) returning a grey level. */
function picture(
  width: number,
  height: number,
  grey: (x: number, y: number) => number,
) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const value = grey(x, y);
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
      data[i + 3] = 255;
    }
  }
  return data;
}

const checkerboard = (x: number, y: number) => ((x + y) % 2 === 0 ? 220 : 120);

describe("assessQuality()", () => {
  it("calls a black picture too dark, and not blurry as well", () => {
    expect(
      assessQuality(
        picture(40, 30, () => 0),
        40,
        30,
      ),
    ).toEqual({
      dark: true,
      blurry: false,
    });
  });

  it("calls a dim but detailed picture too dark", () => {
    const dim = (x: number, y: number) => ((x + y) % 2 === 0 ? 60 : 10);
    expect(assessQuality(picture(40, 30, dim), 40, 30).dark).toBe(true);
  });

  it("calls a bright flat picture blurry, not dark", () => {
    expect(
      assessQuality(
        picture(40, 30, () => 200),
        40,
        30,
      ),
    ).toEqual({
      dark: false,
      blurry: true,
    });
  });

  it("calls a smooth gradient blurry", () => {
    const gradient = (x: number) => 100 + x * 2;
    expect(assessQuality(picture(40, 30, gradient), 40, 30)).toEqual({
      dark: false,
      blurry: true,
    });
  });

  it("passes a bright picture with sharp detail", () => {
    expect(assessQuality(picture(40, 30, checkerboard), 40, 30)).toEqual({
      dark: false,
      blurry: false,
    });
  });
});

describe("the measures", () => {
  it("meanLuma is the average brightness", () => {
    const data = picture(4, 4, () => 100);
    expect(meanLuma(new Float32Array(16).fill(100))).toBe(100);
    expect(assessQuality(data, 4, 4).dark).toBe(false);
    expect(DARK_MEAN_LUMA).toBeGreaterThan(0);
  });

  it("laplacianVariance is zero for a flat picture and large for hard edges", () => {
    const flat = new Float32Array(100).fill(80);
    expect(laplacianVariance(flat, 10, 10)).toBe(0);
    const edges = new Float32Array(100);
    for (let i = 0; i < 100; i += 1) edges[i] = i % 2 === 0 ? 255 : 0;
    expect(laplacianVariance(edges, 10, 10)).toBeGreaterThan(1000);
  });

  it("laplacianVariance is zero for a picture too small to measure", () => {
    expect(laplacianVariance(new Float32Array(4), 2, 2)).toBe(0);
  });
});
