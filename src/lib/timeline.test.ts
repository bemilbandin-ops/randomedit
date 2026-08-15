import { describe, expect, it } from 'vitest';
import {
  moveClip,
  rippleDeleteClip,
  sequenceDuration,
  sequenceToSourceTime,
  sourceToSequenceTime,
  splitClip,
  trimClip,
} from './timeline';
import type { Clip } from '../types';

const clips: Clip[] = [
  { id: 'a', name: 'Shot A', sourceStart: 0, sourceEnd: 4 },
  { id: 'b', name: 'Shot B', sourceStart: 10, sourceEnd: 13 },
];

describe('timeline', () => {
  it('calculates edited sequence duration', () => {
    expect(sequenceDuration(clips)).toBe(7);
  });

  it('maps sequence time to the correct source clip and source time', () => {
    expect(sequenceToSourceTime(clips, 5)).toEqual({ clipIndex: 1, sourceTime: 11 });
  });

  it('maps source time in a chosen clip back to sequence time', () => {
    expect(sourceToSequenceTime(clips, 1, 12)).toBe(6);
  });

  it('splits one clip without changing total duration', () => {
    const next = splitClip(clips, 'a', 2);
    expect(next).toHaveLength(3);
    expect(next[0]).toMatchObject({ sourceStart: 0, sourceEnd: 2 });
    expect(next[1]).toMatchObject({ sourceStart: 2, sourceEnd: 4 });
    expect(sequenceDuration(next)).toBe(7);
  });

  it('trims a selected edge to the playhead', () => {
    expect(trimClip(clips, 'a', 'start', 1)[0]).toMatchObject({ sourceStart: 1, sourceEnd: 4 });
    expect(trimClip(clips, 'a', 'end', 3)[0]).toMatchObject({ sourceStart: 0, sourceEnd: 3 });
  });

  it('ignores trim values outside the clip', () => {
    expect(trimClip(clips, 'a', 'start', 5)).toEqual(clips);
  });

  it('ripple deletes the selected clip by removing it from the ordered sequence', () => {
    expect(rippleDeleteClip(clips, 'a')).toEqual([clips[1]]);
  });

  it('moves clips left and right without mutating the input', () => {
    const moved = moveClip(clips, 'b', -1);
    expect(moved.map((clip) => clip.id)).toEqual(['b', 'a']);
    expect(clips.map((clip) => clip.id)).toEqual(['a', 'b']);
  });
});
