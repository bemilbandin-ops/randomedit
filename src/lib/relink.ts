import type { Clip, SourceMeta } from '../types.ts';

const DURATION_TOLERANCE_SECONDS = 0.1;

export function validateRelinkSource(
  expected: SourceMeta | null,
  actual: SourceMeta,
  clips: Clip[],
): string | null {
  const requiredSourceEnd = clips.reduce((latest, clip) => Math.max(latest, clip.sourceEnd), 0);
  if (actual.duration + DURATION_TOLERANCE_SECONDS < requiredSourceEnd) {
    return `This video is too short for the imported edit. The timeline uses source media through ${requiredSourceEnd.toFixed(2)}s, but this file is ${actual.duration.toFixed(2)}s long.`;
  }

  if (expected) {
    const tolerance = Math.max(DURATION_TOLERANCE_SECONDS, expected.duration * 0.001);
    if (Math.abs(actual.duration - expected.duration) > tolerance) {
      return `This video's duration does not match the project source. Expected about ${expected.duration.toFixed(2)}s, but this file is ${actual.duration.toFixed(2)}s long.`;
    }
  }

  return null;
}
