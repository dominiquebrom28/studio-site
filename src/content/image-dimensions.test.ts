import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readImageDimensions } from './image-dimensions';

/**
 * Unit tests for the dependency-free image-header parser, against hand-built
 * minimal buffers (not real committed assets — that's what
 * `validate-content.test.ts`'s dimension gate checks, against real content).
 * These pin the parser's own correctness and its failure modes in isolation,
 * one format at a time, including formats/corruptions no real committed
 * asset happens to exercise.
 */

const tmpFiles: string[] = [];

function writeTempFile(name: string, bytes: number[] | Buffer): string {
  const filePath = path.join(os.tmpdir(), `image-dimensions-test-${Date.now()}-${Math.random().toString(36).slice(2)}-${name}`);
  fs.writeFileSync(filePath, Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes));
  tmpFiles.push(filePath);
  return filePath;
}

afterEach(() => {
  while (tmpFiles.length > 0) {
    const f = tmpFiles.pop();
    if (f) fs.rmSync(f, { force: true });
  }
});

function pngWithDimensions(width: number, height: number): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(13, 0);
  const chunkType = Buffer.from('IHDR', 'ascii');
  const dims = Buffer.alloc(8);
  dims.writeUInt32BE(width, 0);
  dims.writeUInt32BE(height, 4);
  // 5 remaining IHDR bytes (bit depth, color type, compression, filter,
  // interlace) — not needed for dimensions, padded with zeros.
  const rest = Buffer.alloc(5);
  return Buffer.concat([signature, length, chunkType, dims, rest]);
}

function gifWithDimensions(width: number, height: number): Buffer {
  const signature = Buffer.from('GIF89a', 'ascii');
  const dims = Buffer.alloc(4);
  dims.writeUInt16LE(width, 0);
  dims.writeUInt16LE(height, 2);
  return Buffer.concat([signature, dims]);
}

function jpegWithDimensions(width: number, height: number): Buffer {
  const soi = Buffer.from([0xff, 0xd8]);
  const sof0Marker = Buffer.from([0xff, 0xc0]);
  // length(2) + precision(1) + height(2) + width(2) + numComponents(1) +
  // 3 bytes per component (id, sampling, quant table) for 3 components.
  const numComponents = 3;
  const length = 2 + 1 + 2 + 2 + 1 + numComponents * 3;
  const segment = Buffer.alloc(length);
  segment.writeUInt16BE(length, 0);
  segment.writeUInt8(8, 2); // precision
  segment.writeUInt16BE(height, 3);
  segment.writeUInt16BE(width, 5);
  segment.writeUInt8(numComponents, 7);
  const eoi = Buffer.from([0xff, 0xd9]);
  return Buffer.concat([soi, sof0Marker, segment, eoi]);
}

describe('readImageDimensions — PNG', () => {
  it('reads width/height from a valid IHDR chunk', () => {
    const filePath = writeTempFile('valid.png', pngWithDimensions(1280, 800));
    expect(readImageDimensions(filePath)).toEqual({ width: 1280, height: 800 });
  });

  it('throws (does not silently pass) on a truncated PNG', () => {
    const filePath = writeTempFile('truncated.png', pngWithDimensions(1280, 800).subarray(0, 16));
    expect(() => readImageDimensions(filePath)).toThrow(/too short/);
  });

  it('throws when the first chunk is not IHDR', () => {
    const valid = pngWithDimensions(100, 100);
    const corrupted = Buffer.from(valid);
    corrupted.write('IDAT', 12, 'ascii'); // overwrite the chunk-type bytes
    const filePath = writeTempFile('wrong-chunk.png', corrupted);
    expect(() => readImageDimensions(filePath)).toThrow(/expected "IHDR"/);
  });
});

describe('readImageDimensions — GIF', () => {
  it('reads width/height from the Logical Screen Descriptor', () => {
    const filePath = writeTempFile('valid.gif', gifWithDimensions(375, 812));
    expect(readImageDimensions(filePath)).toEqual({ width: 375, height: 812 });
  });

  it('accepts the GIF87a signature too, not just GIF89a', () => {
    const buffer = gifWithDimensions(10, 20);
    buffer.write('GIF87a', 0, 'ascii');
    const filePath = writeTempFile('gif87a.gif', buffer);
    expect(readImageDimensions(filePath)).toEqual({ width: 10, height: 20 });
  });

  it('throws on a truncated GIF (no Logical Screen Descriptor)', () => {
    const filePath = writeTempFile('truncated.gif', Buffer.from('GIF89a', 'ascii'));
    expect(() => readImageDimensions(filePath)).toThrow(/too short/);
  });
});

describe('readImageDimensions — JPEG', () => {
  it('reads width/height from an SOF0 segment', () => {
    const filePath = writeTempFile('valid.jpg', jpegWithDimensions(1000, 625));
    expect(readImageDimensions(filePath)).toEqual({ width: 1000, height: 625 });
  });

  it('skips non-SOF segments (e.g. an APP0/JFIF marker) before finding SOF', () => {
    const soi = Buffer.from([0xff, 0xd8]);
    // APP0 "JFIF" segment: FF E0, length 16, then 14 bytes of payload.
    const app0 = Buffer.concat([
      Buffer.from([0xff, 0xe0, 0x00, 0x10]),
      Buffer.from('JFIF\0', 'ascii'),
      Buffer.alloc(9),
    ]);
    const rest = jpegWithDimensions(1280, 800).subarray(2); // drop the SOI, reuse SOF0+EOI
    const filePath = writeTempFile('with-app0.jpg', Buffer.concat([soi, app0, rest]));
    expect(readImageDimensions(filePath)).toEqual({ width: 1280, height: 800 });
  });

  it('throws when no SOF marker exists before EOF', () => {
    const filePath = writeTempFile('no-sof.jpg', Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
    expect(() => readImageDimensions(filePath)).toThrow(/no SOF/);
  });

  it('throws on a truncated SOF segment', () => {
    const filePath = writeTempFile('truncated-sof.jpg', Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08]));
    expect(() => readImageDimensions(filePath)).toThrow(/malformed JPEG/);
  });
});

describe('readImageDimensions — unsupported/unknown formats', () => {
  it('throws loudly on a WebP file rather than silently passing', () => {
    const riff = Buffer.concat([
      Buffer.from('RIFF', 'ascii'),
      Buffer.alloc(4),
      Buffer.from('WEBP', 'ascii'),
    ]);
    const filePath = writeTempFile('image.webp', riff);
    expect(() => readImageDimensions(filePath)).toThrow(/unrecognized image format/);
  });

  it('throws loudly on an SVG (text-based, no binary signature this parser reads)', () => {
    const filePath = writeTempFile('icon.svg', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'utf8'));
    expect(() => readImageDimensions(filePath)).toThrow(/unrecognized image format/);
  });

  it('throws on an empty file rather than returning a default/zero size', () => {
    const filePath = writeTempFile('empty', Buffer.alloc(0));
    expect(() => readImageDimensions(filePath)).toThrow(/unrecognized image format/);
  });

  it('throws (propagates fs error) on a file that does not exist', () => {
    expect(() => readImageDimensions('/definitely/does/not/exist.png')).toThrow();
  });
});
