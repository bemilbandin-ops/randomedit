import assert from 'node:assert/strict';
import test from 'node:test';
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
  const actual = { ...expected, duration: 30 };
  assert.match(validateRelinkSource(expected, actual, clips) ?? '', /duration/i);
});

test('rejects a relink that cannot cover the latest source time used by the edit', () => {
  const actual = { ...expected, duration: 54.8 };
  assert.match(validateRelinkSource(null, actual, clips) ?? '', /55/);
});
