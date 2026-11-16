import { fitWithin } from "./flow";
import {
  assessQuality,
  GOOD_QUALITY,
  QUALITY_SAMPLE_WIDTH,
  type Quality,
} from "./quality";

/** The longest side of an uploaded photo, in pixels (spec: scaled down so a 12 MP phone photo is not sent whole). */
export const MAX_PHOTO_SIDE = 2048;
/** JPEG quality of an uploaded photo. */
export const PHOTO_QUALITY = 0.8;

export interface CompressedPhoto {
  blob: Blob;
  /** When the phone says the photo was taken (the file's modified time, or now for a live shot), ISO 8601; null when unknown. */
  capturedAt: string | null;
  /** The quick check: too dark, blurry. A warning only. */
  quality: Quality;
}

/**
 * Scales a picture down to at most 2048 px on the longest side, saves it as JPEG (quality 0.8) and checks its quality. A photo is
 * then a few hundred KB, not 5 MB, so it uploads on a weak signal; it also turns an iPhone's HEIC into the JPEG the server accepts.
 */
function encode(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  capturedAt: string | null,
): Promise<CompressedPhoto> {
  const { width, height } = fitWithin(
    sourceWidth,
    sourceHeight,
    MAX_PHOTO_SIDE,
  );
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot draw the photo.");
  context.drawImage(source, 0, 0, width, height);
  const quality = measure(canvas, width, height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve({ blob, capturedAt, quality })
          : reject(new Error("This browser could not save the photo.")),
      "image/jpeg",
      PHOTO_QUALITY,
    ),
  );
}

/** Runs the quality check on a small copy of the picture. A failure of the check itself never stops the photo. */
function measure(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
): Quality {
  try {
    const sample = fitWithin(width, height, QUALITY_SAMPLE_WIDTH);
    const small = document.createElement("canvas");
    small.width = sample.width;
    small.height = sample.height;
    const context = small.getContext("2d", { willReadFrequently: true });
    if (!context) return GOOD_QUALITY;
    context.drawImage(canvas, 0, 0, sample.width, sample.height);
    const { data } = context.getImageData(0, 0, sample.width, sample.height);
    return assessQuality(data, sample.width, sample.height);
  } catch (error) {
    console.warn("The photo quality check could not run.", error);
    return GOOD_QUALITY;
  }
}

/**
 * A photo from the phone's camera app (the file input). The browser applies the photo's rotation (EXIF) when it decodes the
 * file. The capture time is the file's modified time.
 * @throws when the browser cannot read the file as a picture; the screen shows "we could not read that photo".
 */
export async function compressPhoto(file: File): Promise<CompressedPhoto> {
  const bitmap = await createImageBitmap(file);
  try {
    const capturedAt =
      file.lastModified > 0 ? new Date(file.lastModified).toISOString() : null;
    return await encode(bitmap, bitmap.width, bitmap.height, capturedAt);
  } finally {
    bitmap.close();
  }
}

/** A frame taken from the live camera (the viewfinder). The capture time is now. */
export function compressFrame(
  video: HTMLVideoElement,
): Promise<CompressedPhoto> {
  return encode(
    video,
    video.videoWidth,
    video.videoHeight,
    new Date().toISOString(),
  );
}
