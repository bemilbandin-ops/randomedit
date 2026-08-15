import assert from 'node:assert/strict';
import test from 'node:test';
import * as timeline from './timeline.ts';
import {
  moveClip,
  rippleDeleteClip,
  sequenceDuration,
  sequenceTimeAfterEdit,
  sequenceToSourceTime,
  sourceToSequenceTime,
  splitClip,
  timelineClipClickAction,
  trimClip,
} from './timeline.ts';
import type { Clip } from '../types.ts';

const clips: Clip[] = [
  { id: 'a', name: 'Shot A', sourceStart: 0, sourceEnd: 4 },
  { id: 'b', name: 'Shot B', sourceStart: 10, sourceEnd: 13 },
];

test('calculates edited sequence duration', () => {
  assert.equal(sequenceDuration(clips), 7);
});

test('maps sequence time to the correct source clip and source time', () => {
  assert.deepEqual(sequenceToSourceTime(clips, 5), { clipIndex: 1, sourceTime: 11 });
});

test('maps source time in a chosen clip back to sequence time', () => {
  assert.equal(sourceToSequenceTime(clips, 1, 12), 6);
});

test('splits one clip without changing total duration', () => {
  const next = splitClip(clips, 'a', 2);
  assert.equal(next.length, 3);
  assert.deepEqual(
    { sourceStart: next[0].sourceStart, sourceEnd: next[0].sourceEnd },
    { sourceStart: 0, sourceEnd: 2 },
  );
  assert.deepEqual(
    { sourceStart: next[1].sourceStart, sourceEnd: next[1].sourceEnd },
    { sourceStart: 2, sourceEnd: 4 },
  );
  assert.equal(sequenceDuration(next), 7);
});

test('snaps split edit points to the configured frame grid', () => {
  const next = splitClip(clips, 'a', 1.03, 25);
  assert.equal(next[0].sourceEnd, 1.04);
  assert.equal(next[1].sourceStart, 1.04);
});

test('trims a selected edge to the playhead', () => {
  const fromStart = trimClip(clips, 'a', 'start', 1)[0];
  const fromEnd = trimClip(clips, 'a', 'end', 3)[0];
  assert.deepEqual({ sourceStart: fromStart.sourceStart, sourceEnd: fromStart.sourceEnd }, { sourceStart: 1, sourceEnd: 4 });
  assert.deepEqual({ sourceStart: fromEnd.sourceStart, sourceEnd: fromEnd.sourceEnd }, { sourceStart: 0, sourceEnd: 3 });
});

test('snaps trim edit points to the configured frame grid', () => {
  const fromStart = trimClip(clips, 'a', 'start', 1.03, 25)[0];
  assert.equal(fromStart.sourceStart, 1.04);
});

test('ignores trim values outside the clip', () => {
  assert.deepEqual(trimClip(clips, 'a', 'start', 5), clips);
});

test('ripple deletes the selected clip by removing it from the ordered sequence', () => {
  assert.deepEqual(rippleDeleteClip(clips, 'a'), [clips[1]]);
});

test('moves clips left and right without mutating the input', () => {
  const moved = moveClip(clips, 'b', -1);
  assert.deepEqual(moved.map((clip) => clip.id), ['b', 'a']);
  assert.deepEqual(clips.map((clip) => clip.id), ['a', 'b']);
});

test('keeps the same source frame under the playhead after trimming a clip start', () => {
  const before: Clip[] = [{ id: 'a', name: 'Shot A', sourceStart: 0, sourceEnd: 10 }];
  const after = trimClip(before, 'a', 'start', 5);
  assert.equal(sequenceTimeAfterEdit(before, 5, after), 0);
});

test('keeps the same source frame under the playhead after reordering clips', () => {
  const after = moveClip(clips, 'b', -1);
  assert.equal(sequenceTimeAfterEdit(clips, 5, after), 1);
});

test('falls back to a valid clamped sequence time if the active source segment was deleted', () => {
  const after = rippleDeleteClip(clips, 'b');
  assert.equal(sequenceTimeAfterEdit(clips, 6, after), 4);
});

// Regression: tutorial step 2 must count the normal action of clicking a timeline clip.
test('clicking a timeline clip in selection mode seeks and selects so tutorial step 2 can complete', () => {
  assert.deepEqual(timelineClipClickAction('selection', 'a', 2.25), {
    seekTime: 2.25,
    tutorialSeek: true,
    selectClipId: 'a',
    split: false,
  });
});

test('manual timeline clicks snap to the configured sequence frame grid', () => {
  assert.deepEqual(timelineClipClickAction('selection', 'a', 2.253, 25), {
    seekTime: 2.24,
    tutorialSeek: true,
    selectClipId: 'a',
    split: false,
  });
});

test('clicking a timeline clip with the razor still seeks before splitting', () => {
  assert.deepEqual(timelineClipClickAction('razor', 'a', 2.25), {
    seekTime: 2.25,
    tutorialSeek: true,
    selectClipId: null,
    split: true,
  });
});

test('applies a valid In/Out source range to the chosen clip', () => {
  const applySourceRange = (timeline as Record<string, unknown>).applySourceRange;
  assert.equal(typeof applySourceRange, 'function');
  const apply = applySourceRange as (items: Clip[], id: string, markIn: number, markOut: number, fps?: number) => Clip[];
  const next = apply(clips, 'a', 1.03, 3.01, 25);
  assert.deepEqual(
    { sourceStart: next[0].sourceStart, sourceEnd: next[0].sourceEnd },
    { sourceStart: 1.04, sourceEnd: 3 },
  );
});

test('summarizes real audio sample peaks instead of inventing decorative bars', () => {
  const summarizeAudioSamples = (timeline as Record<string, unknown>).summarizeAudioSamples;
  assert.equal(typeof summarizeAudioSamples, 'function');
  const summarize = summarizeAudioSamples as (samples: Float32Array, buckets: number) => number[];
  const peaks = summarize(new Float32Array([0, 0.25, -0.5, 1, -0.25, 0.5, 0, -1]), 4);
  assert.deepEqual(peaks, [0.25, 1, 0.5, 1]);
});
