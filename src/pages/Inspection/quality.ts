/**
 * The quick quality check of a photo, done on the phone before it is accepted (spec pp. 5, 12): is it too dark, is it blurry.
 * It only ever warns (the client's texts ask for a retake); the photo is still kept and uploaded, so a driver in a dark garage is
 * never stuck.
 */

/** A picture whose average brightness (0 to 255) is below this reads as "too dark". */
export const DARK_MEAN_LUMA = 45;

/**
 * A picture whose sharpness is below this reads as "blurry". Sharpness is the variance of the Laplacian (how strongly the
 * brightness changes from pixel to pixel) measured on a picture scaled to about 320 px wide: crisp edges give large values, a
 * smeared or out-of-focus picture gives small ones. The number is a starting point to be tuned on real phones.
 */
export const BLUR_SHARPNESS_MIN = 25;

/** The width a picture is scaled to before it is measured. */
export const QUALITY_SAMPLE_WIDTH = 320;

export interface Quality {
  dark: boolean;
  blurry: boolean;
}

export const GOOD_QUALITY: Quality = { dark: false, blurry: false };

/** Brightness of every pixel (0 to 255) from RGBA data. */
function lumaOf(rgba: Uint8ClampedArray, pixels: number): Float32Array {
  const luma = new Float32Array(pixels);
  for (let i = 0; i < pixels; i += 1) {
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    luma[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }
  return luma;
}

/** Average brightness, 0 to 255. */
export function meanLuma(luma: Float32Array): number {
  if (luma.length === 0) return 0;
  let sum = 0;
  for (const value of luma) sum += value;
  return sum / luma.length;
}

/** Variance of the Laplacian (4 neighbours) over the inside of the picture: the sharpness measure. 0 for a flat picture. */
export function laplacianVariance(
  luma: Float32Array,
  width: number,
  height: number,
): number {
  if (width < 3 || height < 3) return 0;
  let sum = 0;
  let sumSquares = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      const laplacian =
        4 * luma[i] -
        luma[i - 1] -
        luma[i + 1] -
        luma[i - width] -
        luma[i + width];
      sum += laplacian;
      sumSquares += laplacian * laplacian;
      count += 1;
    }
  }
  const mean = sum / count;
  return sumSquares / count - mean * mean;
}

/**
 * Judges a picture from its pixels (RGBA, as a canvas gives them). Too dark takes priority: a dark picture also measures as
 * blurry, and one reason is enough to ask for a retake.
 */
export function assessQuality(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): Quality {
  const luma = lumaOf(rgba, width * height);
  if (meanLuma(luma) < DARK_MEAN_LUMA) return { dark: true, blurry: false };
  const blurry = laplacianVariance(luma, width, height) < BLUR_SHARPNESS_MIN;
  return { dark: false, blurry };
}
