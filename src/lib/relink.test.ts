import assert from 'node:assert/strict';
import test from 'node:test';
import * as relink from './relink.ts';
import { validateRelinkSource } from './relink.ts';
import type { Clip, SourceMeta } from '../types.ts';

const expected: SourceMeta = {
  name: 'original.mp4',
  duration: 60,
  width: 1920,
  height: 1080,
};

const clips: Clip[] = [
  { id: 'a', name: 'original.mp4', sourceStart: 5, sourceEnd: 12 },
  { id: 'b', name: 'original.mp4', sourceStart: 40, sourceEnd: 55 },
];

test('accepts the expected source duration within media metadata tolerance', () => {
  const actual = { ...expected, name: 'renamed-original.mp4', duration: 60.02 };
  assert.equal(validateRelinkSource(expected, actual, clips), null);
});

test('rejects a relink whose duration does not match the exported source', () => {
  const actual = { ...expected, duration: 58 };
  assert.match(validateRelinkSource(expected, actual, clips) ?? '', /duration/i);
});

test('rejects a relink that cannot cover the latest source time used by the edit', () => {
  const actual = { ...expected, duration: 54.8 };
  assert.match(validateRelinkSource(null, actual, clips) ?? '', /55/);
});

test('rejects a same-duration relink when the saved media fingerprint differs', () => {
  const expectedWithIdentity = {
    ...expected,
    fileSize: 1000,
    fingerprint: 'sha256:original',
  } as SourceMeta;
  const actual = {
    ...expected,
    name: 'different.mp4',
    fileSize: 1000,
    fingerprint: 'sha256:different',
  } as SourceMeta;
  assert.match(validateRelinkSource(expectedWithIdentity, actual, clips) ?? '', /different source|fingerprint|match/i);
});

test('accepts a renamed relink when the saved fingerprint and file size match', () => {
  const expectedWithIdentity = {
    ...expected,
    fileSize: 1000,
    fingerprint: 'sha256:same',
  } as SourceMeta;
  const actual = {
    ...expected,
    name: 'renamed.mp4',
    fileSize: 1000,
    fingerprint: 'sha256:same',
  } as SourceMeta;
  assert.equal(validateRelinkSource(expectedWithIdentity, actual, clips), null);
});

test('fingerprints the same media bytes deterministically and includes size in the identity', async () => {
  const fingerprintMediaFile = (relink as Record<string, unknown>).fingerprintMediaFile;
  assert.equal(typeof fingerprintMediaFile, 'function');
  const fingerprint = fingerprintMediaFile as (blob: Blob) => Promise<string>;
  const a = await fingerprint(new Blob(['same media bytes']));
  const b = await fingerprint(new Blob(['same media bytes']));
  const c = await fingerprint(new Blob(['same media bytes', '!']));
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.match(a, /^sha256:/);
});
