import fs from 'node:fs';

export interface ImageDimensions {
  width: number;
  height: number;
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const GIF87A_SIGNATURE = Buffer.from('GIF87a', 'ascii');
const GIF89A_SIGNATURE = Buffer.from('GIF89a', 'ascii');

// JPEG SOF (start-of-frame) marker codes — 0xC0-0xCF minus 0xC4 (DHT), 0xC8
// (JPG, reserved), 0xCC (DAC), which share the numeric range but are NOT
// frame headers and must not be read as one.
const JPEG_SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);
// Markers with no length field / payload (RSTn, TEM). SOI (0xD8) and EOI
// (0xD9) are handled explicitly by the caller/loop, not via this set.
const JPEG_NO_LENGTH_MARKERS = new Set([0x01, 0xd0, 0xd1, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7]);

type ImageFormat = 'png' | 'jpeg' | 'gif';

/**
 * Reads the intrinsic pixel width/height of an image by parsing its file
 * header directly — no image-dimension npm dependency (this repo's asset
 * gates are dependency-free by policy). Covers exactly the formats actually
 * committed under `public/images/projects/` today (confirmed empirically:
 * `find public -iname '*.png' -o -iname '*.jpg' -o -iname '*.gif'` — no
 * WebP/SVG/BMP is ever a `media[].src`): PNG, JPEG, GIF.
 *
 * Never returns a guess and never swallows a problem into a false "it's
 * fine": every failure mode below throws, so the caller (the content-
 * validation gate) can distinguish "dimensions don't match" from "couldn't
 * even read the dimensions" — the same three-state discipline
 * `scripts/check-deps-drift.mjs` applies to its own inputs (clean / drift /
 * inconclusive), applied here to a single file. Throws for:
 *  - the file not existing / not being readable (propagates `fs`'s error)
 *  - a signature this parser doesn't recognize (unsupported format — e.g.
 *    WebP, SVG, BMP) — named explicitly, never silently treated as a pass
 *  - a recognized signature whose header is truncated/malformed enough that
 *    dimensions can't be extracted (e.g. a JPEG with no SOF marker, a PNG
 *    whose first chunk isn't IHDR)
 */
export function readImageDimensions(absolutePath: string): ImageDimensions {
  const buffer = fs.readFileSync(absolutePath);
  const format = detectFormat(buffer, absolutePath);
  switch (format) {
    case 'png':
      return readPngDimensions(buffer, absolutePath);
    case 'jpeg':
      return readJpegDimensions(buffer, absolutePath);
    case 'gif':
      return readGifDimensions(buffer, absolutePath);
  }
}

function detectFormat(buffer: Buffer, absolutePath: string): ImageFormat {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG_SIGNATURE)) return 'png';
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';
  if (
    buffer.length >= 6 &&
    (buffer.subarray(0, 6).equals(GIF87A_SIGNATURE) || buffer.subarray(0, 6).equals(GIF89A_SIGNATURE))
  ) {
    return 'gif';
  }

  const preview = buffer.subarray(0, Math.min(buffer.length, 12)).toString('hex');
  throw new Error(
    `${absolutePath}: unrecognized image format (first bytes: ${preview || '<empty file>'}) — this parser supports PNG, JPEG, and GIF only; a format outside that set must fail loudly here, not be assumed to match`,
  );
}

function readPngDimensions(buffer: Buffer, absolutePath: string): ImageDimensions {
  // Signature (8) + length (4) + "IHDR" (4) + width (4) + height (4) = 24.
  if (buffer.length < 24) {
    throw new Error(`${absolutePath}: PNG file is too short (${buffer.length} bytes) to contain an IHDR chunk`);
  }
  const chunkType = buffer.subarray(12, 16).toString('ascii');
  if (chunkType !== 'IHDR') {
    // Per the PNG spec the IHDR chunk MUST be first; anything else means the
    // file is corrupt/truncated in a way we won't try to guess past.
    throw new Error(`${absolutePath}: PNG's first chunk is "${chunkType}", expected "IHDR" — cannot read dimensions`);
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

function readGifDimensions(buffer: Buffer, absolutePath: string): ImageDimensions {
  // Signature (6) + Logical Screen Descriptor width (2) + height (2) = 10.
  if (buffer.length < 10) {
    throw new Error(
      `${absolutePath}: GIF file is too short (${buffer.length} bytes) to contain a Logical Screen Descriptor`,
    );
  }
  const width = buffer.readUInt16LE(6);
  const height = buffer.readUInt16LE(8);
  return { width, height };
}

function readJpegDimensions(buffer: Buffer, absolutePath: string): ImageDimensions {
  let offset = 2; // past the SOI marker (FF D8) that `detectFormat` already confirmed

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      throw new Error(
        `${absolutePath}: malformed JPEG — expected a marker (0xFF) at byte ${offset}, found 0x${buffer[offset].toString(16).padStart(2, '0')}`,
      );
    }

    // A marker code may be preceded by any number of 0xFF fill bytes.
    let markerOffset = offset + 1;
    while (markerOffset < buffer.length && buffer[markerOffset] === 0xff) markerOffset += 1;
    if (markerOffset >= buffer.length) {
      throw new Error(`${absolutePath}: malformed JPEG — truncated marker sequence starting at byte ${offset}`);
    }

    const marker = buffer[markerOffset];
    offset = markerOffset + 1;

    if (marker === 0xd9) break; // EOI — no more segments to scan
    if (marker === 0xd8) continue; // a stray/duplicate SOI; no length field
    if (JPEG_NO_LENGTH_MARKERS.has(marker)) continue; // RSTn / TEM — no length field, no payload

    if (offset + 2 > buffer.length) {
      throw new Error(`${absolutePath}: malformed JPEG — truncated before segment length at byte ${offset}`);
    }
    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2) {
      throw new Error(
        `${absolutePath}: malformed JPEG — segment length ${segmentLength} at byte ${offset} is smaller than the length field itself`,
      );
    }

    if (JPEG_SOF_MARKERS.has(marker)) {
      // Payload: precision (1) + height (2) + width (2) + ... — payload
      // starts right after the 2 length bytes, i.e. at `offset + 2`. The
      // last byte actually read is `offset + 6` (the second byte of the
      // width field, via `readUInt16BE(offset + 5)`), which requires
      // `buffer.length >= offset + 7` — off-by-one from the more obvious
      // `offset + 6 > buffer.length`, which lets `offset + 6 === buffer.length`
      // through and made `readUInt16BE(offset + 5)` throw a raw, unhelpful
      // Node `RangeError` ("Attempt to access memory outside buffer bounds")
      // instead of this file's own clean "malformed JPEG" message. Caught by
      // an adversarial SOF-buffer-ends-exactly-at-the-width-field test in
      // image-dimensions.test.ts.
      if (offset + 7 > buffer.length) {
        throw new Error(`${absolutePath}: malformed JPEG — SOF segment truncated at byte ${offset}`);
      }
      const height = buffer.readUInt16BE(offset + 3);
      const width = buffer.readUInt16BE(offset + 5);
      return { width, height };
    }

    offset += segmentLength;
  }

  throw new Error(`${absolutePath}: no SOF (start-of-frame) marker found before end of file — cannot determine JPEG dimensions`);
}
