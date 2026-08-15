import type { Clip, ClipEdge } from '../types.ts';

const clipDuration = (clip: Clip) => Math.max(0, clip.sourceEnd - clip.sourceStart);

export interface TimelineClipClickAction {
  seekTime: number;
  tutorialSeek: true;
  selectClipId: string | null;
  split: boolean;
}

export function timelineClipClickAction(
  activeTool: string,
  clipId: string,
  sequenceTime: number,
): TimelineClipClickAction {
  const selectionMode = activeTool === 'selection';
  return {
    seekTime: sequenceTime,
    tutorialSeek: true,
    selectClipId: selectionMode ? clipId : null,
    split: !selectionMode,
  };
}

export function sequenceDuration(clips: Clip[]): number {
  return clips.reduce((total, clip) => total + clipDuration(clip), 0);
}

export function sequenceToSourceTime(
  clips: Clip[],
  sequenceTime: number,
): { clipIndex: number; sourceTime: number } {
  if (clips.length === 0) {
    return { clipIndex: -1, sourceTime: 0 };
  }

  const total = sequenceDuration(clips);
  let remaining = Math.min(Math.max(sequenceTime, 0), total);

  for (let index = 0; index < clips.length; index += 1) {
    const clip = clips[index];
    const duration = clipDuration(clip);
    const isLast = index === clips.length - 1;

    if (remaining < duration || isLast) {
      return {
        clipIndex: index,
        sourceTime: clip.sourceStart + Math.min(remaining, duration),
      };
    }

    remaining -= duration;
  }

  const lastIndex = clips.length - 1;
  return { clipIndex: lastIndex, sourceTime: clips[lastIndex].sourceEnd };
}

export function sourceToSequenceTime(clips: Clip[], clipIndex: number, sourceTime: number): number {
  if (clipIndex < 0 || clipIndex >= clips.length) return 0;

  let sequenceTime = 0;
  for (let index = 0; index < clipIndex; index += 1) {
    sequenceTime += clipDuration(clips[index]);
  }

  const clip = clips[clipIndex];
  const withinClip = Math.min(Math.max(sourceTime, clip.sourceStart), clip.sourceEnd) - clip.sourceStart;
  return sequenceTime + withinClip;
}

export function splitClip(clips: Clip[], clipId: string, sourceTime: number): Clip[] {
  const index = clips.findIndex((clip) => clip.id === clipId);
  if (index < 0) return clips;

  const clip = clips[index];
  if (sourceTime <= clip.sourceStart || sourceTime >= clip.sourceEnd) return clips;

  const left: Clip = {
    ...clip,
    id: `${clip.id}-a-${sourceTime.toFixed(3)}`,
    sourceEnd: sourceTime,
  };
  const right: Clip = {
    ...clip,
    id: `${clip.id}-b-${sourceTime.toFixed(3)}`,
    sourceStart: sourceTime,
  };

  return [...clips.slice(0, index), left, right, ...clips.slice(index + 1)];
}

export function trimClip(clips: Clip[], clipId: string, edge: ClipEdge, sourceTime: number): Clip[] {
  const index = clips.findIndex((clip) => clip.id === clipId);
  if (index < 0) return clips;

  const clip = clips[index];
  if (sourceTime <= clip.sourceStart || sourceTime >= clip.sourceEnd) return clips;

  const trimmed: Clip = edge === 'start'
    ? { ...clip, sourceStart: sourceTime }
    : { ...clip, sourceEnd: sourceTime };

  return clips.map((item, itemIndex) => (itemIndex === index ? trimmed : item));
}

export function rippleDeleteClip(clips: Clip[], clipId: string): Clip[] {
  return clips.filter((clip) => clip.id !== clipId);
}

export function moveClip(clips: Clip[], clipId: string, direction: -1 | 1): Clip[] {
  const index = clips.findIndex((clip) => clip.id === clipId);
  if (index < 0) return clips;

  const target = index + direction;
  if (target < 0 || target >= clips.length) return clips;

  const next = [...clips];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
