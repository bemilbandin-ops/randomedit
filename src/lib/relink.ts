import type { Clip, SourceMeta } from '../types.ts';

const DURATION_TOLERANCE_SECONDS = 0.1;
const FINGERPRINT_SAMPLE_BYTES = 256 * 1024;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function fingerprintMediaFile(blob: Blob): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('This browser cannot verify source-file identity because Web Crypto is unavailable.');
  }

  const ranges: Array<[number, number]> = [];
  if (blob.size <= FINGERPRINT_SAMPLE_BYTES * 3) {
    ranges.push([0, blob.size]);
  } else {
    ranges.push(
      [0, FINGERPRINT_SAMPLE_BYTES],
      [Math.floor((blob.size - FINGERPRINT_SAMPLE_BYTES) / 2), Math.floor((blob.size - FINGERPRINT_SAMPLE_BYTES) / 2) + FINGERPRINT_SAMPLE_BYTES],
      [blob.size - FINGERPRINT_SAMPLE_BYTES, blob.size],
    );
  }

  const sampleBuffers = await Promise.all(
    ranges.map(([start, end]) => blob.slice(start, end).arrayBuffer()),
  );
  const sizePrefix = new TextEncoder().encode(`size:${blob.size};`);
  const totalLength = sizePrefix.byteLength + sampleBuffers.reduce((total, buffer) => total + buffer.byteLength, 0);
  const payload = new Uint8Array(totalLength);
  payload.set(sizePrefix, 0);
  let offset = sizePrefix.byteLength;
  sampleBuffers.forEach((buffer) => {
    payload.set(new Uint8Array(buffer), offset);
    offset += buffer.byteLength;
  });

  const digest = await globalThis.crypto.subtle.digest('SHA-256', payload);
  return `sha256:${bytesToHex(new Uint8Array(digest))}`;
}

export function validateRelinkSource(
  expected: SourceMeta | null,
  actual: SourceMeta,
  clips: Clip[],
): string | null {
  const requiredSourceEnd = clips.reduce((latest, clip) => Math.max(latest, clip.sourceEnd), 0);
  if (actual.duration + DURATION_TOLERANCE_SECONDS < requiredSourceEnd) {
    return `This video is too short for the imported edit. The timeline uses source media through ${requiredSourceEnd.toFixed(2)}s, but this file is ${actual.duration.toFixed(2)}s long.`;
  }

  if (expected?.fingerprint) {
    if (!actual.fingerprint) {
      return 'This project contains a source fingerprint, but the selected video could not be verified. Choose the original source file.';
    }
    if (actual.fingerprint !== expected.fingerprint) {
      return 'This video does not match the source fingerprint saved with the project. Choose the original source file.';
    }
    if (
      expected.fileSize !== undefined
      && actual.fileSize !== undefined
      && actual.fileSize !== expected.fileSize
    ) {
      return 'This video does not match the source file size saved with the project. Choose the original source file.';
    }
  }

  if (expected) {
    const tolerance = Math.max(DURATION_TOLERANCE_SECONDS, expected.duration * 0.001);
    if (Math.abs(actual.duration - expected.duration) > tolerance) {
      return `This video's duration does not match the project source. Expected about ${expected.duration.toFixed(2)}s, but this file is ${actual.duration.toFixed(2)}s long.`;
    }
  }

  return null;
}
