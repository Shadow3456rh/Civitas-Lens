/**
 * Image utilities — Server-side resize and conversion for LLM vision input.
 *
 * Per PROJECT_CONTEXT: resize images to max 896px longest side before sending
 * to the LLM to stay within 6GB VRAM budget.
 *
 * Server-side only (uses sharp, which is a native Node module).
 */

import sharp from "sharp";

/** Maximum pixel dimension (longest side) before sending to LLM. */
const MAX_DIMENSION = 896;

/** JPEG quality for LLM input (balanced size vs detail). */
const JPEG_QUALITY = 80;

export interface ResizedImage {
  /** JPEG buffer of the resized image. */
  buffer: Buffer;
  /** Original width before resize. */
  originalWidth: number;
  /** Original height before resize. */
  originalHeight: number;
  /** Width after resize. */
  width: number;
  /** Height after resize. */
  height: number;
  /** Whether the image was actually resized (false if already small enough). */
  wasResized: boolean;
}

/**
 * Resize an image buffer so its longest side is at most MAX_DIMENSION (896px).
 * Converts to JPEG regardless of input format.
 *
 * @param input - Raw image buffer (any format sharp supports: JPEG, PNG, WebP, HEIC, etc.)
 * @returns ResizedImage with JPEG buffer and dimension metadata.
 */
export async function resizeForLLM(input: Buffer): Promise<ResizedImage> {
  const metadata = await sharp(input).metadata();
  const originalWidth = metadata.width ?? 0;
  const originalHeight = metadata.height ?? 0;

  const longest = Math.max(originalWidth, originalHeight);
  const needsResize = longest > MAX_DIMENSION;

  let pipeline = sharp(input);

  // Auto-rotate based on EXIF orientation (phones often embed rotation)
  pipeline = pipeline.rotate();

  if (needsResize) {
    pipeline = pipeline.resize({
      width: originalWidth >= originalHeight ? MAX_DIMENSION : undefined,
      height: originalHeight > originalWidth ? MAX_DIMENSION : undefined,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  const outputBuffer = await pipeline
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();

  // Get actual output dimensions
  const outputMeta = await sharp(outputBuffer).metadata();

  return {
    buffer: outputBuffer,
    originalWidth,
    originalHeight,
    width: outputMeta.width ?? originalWidth,
    height: outputMeta.height ?? originalHeight,
    wasResized: needsResize,
  };
}

/**
 * Resize an image and return it as a base64 data URL suitable for the LLM client.
 *
 * @param input - Raw image buffer.
 * @returns A `data:image/jpeg;base64,...` string.
 */
export async function resizeToDataUrl(input: Buffer): Promise<string> {
  const { buffer } = await resizeForLLM(input);
  const base64 = buffer.toString("base64");
  return `data:image/jpeg;base64,${base64}`;
}
