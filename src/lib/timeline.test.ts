import assert from 'node:assert/strict';
import test from 'node:test';
import {
  moveClip,
  rippleDeleteClip,
  sequenceDuration,
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

test('trims a selected edge to the playhead', () => {
  const fromStart = trimClip(clips, 'a', 'start', 1)[0];
  const fromEnd = trimClip(clips, 'a', 'end', 3)[0];
  assert.deepEqual({ sourceStart: fromStart.sourceStart, sourceEnd: fromStart.sourceEnd }, { sourceStart: 1, sourceEnd: 4 });
  assert.deepEqual({ sourceStart: fromEnd.sourceStart, sourceEnd: fromEnd.sourceEnd }, { sourceStart: 0, sourceEnd: 3 });
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

// Regression: tutorial step 2 must count the normal action of clicking a timeline clip.
test('clicking a timeline clip in selection mode seeks and selects so tutorial step 2 can complete', () => {
  assert.deepEqual(timelineClipClickAction('selection', 'a', 2.25), {
    seekTime: 2.25,
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
