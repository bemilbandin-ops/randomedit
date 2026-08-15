import type { Clip, ClipEdge } from '../types.ts';

const clipDuration = (clip: Clip) => Math.max(0, clip.sourceEnd - clip.sourceStart);

export interface TimelineClipClickAction {
  seekTime: number;
  tutorialSeek: true;
  selectClipId: string | null;
  split: boolean;
}

export function snapTimeToFrame(time: number, fps?: number): number {
  const safeTime = Math.max(0, Number.isFinite(time) ? time : 0);
  if (!fps || !Number.isFinite(fps) || fps <= 0) return safeTime;
  return Math.round(safeTime * fps) / fps;
}

export function timelineClipClickAction(
  activeTool: string,
  clipId: string,
  sequenceTime: number,
  fps?: number,
): TimelineClipClickAction {
  const selectionMode = activeTool === 'selection';
  return {
    seekTime: snapTimeToFrame(sequenceTime, fps),
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

export function sequenceTimeAfterEdit(
  beforeClips: Clip[],
  beforeSequenceTime: number,
  afterClips: Clip[],
): number {
  const mapped = sequenceToSourceTime(beforeClips, beforeSequenceTime);
  const beforeClip = mapped.clipIndex >= 0 ? beforeClips[mapped.clipIndex] : undefined;

  if (beforeClip) {
    const afterIndex = afterClips.findIndex((clip) => (
      clip.id === beforeClip.id
      && mapped.sourceTime >= clip.sourceStart
      && mapped.sourceTime <= clip.sourceEnd
    ));
    if (afterIndex >= 0) {
      return sourceToSequenceTime(afterClips, afterIndex, mapped.sourceTime);
    }
  }

  return Math.max(0, Math.min(beforeSequenceTime, sequenceDuration(afterClips)));
}

export function splitClip(clips: Clip[], clipId: string, sourceTime: number, fps?: number): Clip[] {
  const index = clips.findIndex((clip) => clip.id === clipId);
  if (index < 0) return clips;

  const clip = clips[index];
  const editTime = snapTimeToFrame(sourceTime, fps);
  if (editTime <= clip.sourceStart || editTime >= clip.sourceEnd) return clips;

  const left: Clip = {
    ...clip,
    id: `${clip.id}-a-${editTime.toFixed(3)}`,
    sourceEnd: editTime,
  };
  const right: Clip = {
    ...clip,
    id: `${clip.id}-b-${editTime.toFixed(3)}`,
    sourceStart: editTime,
  };

  return [...clips.slice(0, index), left, right, ...clips.slice(index + 1)];
}

export function trimClip(
  clips: Clip[],
  clipId: string,
  edge: ClipEdge,
  sourceTime: number,
  fps?: number,
): Clip[] {
  const index = clips.findIndex((clip) => clip.id === clipId);
  if (index < 0) return clips;

  const clip = clips[index];
  const editTime = snapTimeToFrame(sourceTime, fps);
  if (editTime <= clip.sourceStart || editTime >= clip.sourceEnd) return clips;

  const trimmed: Clip = edge === 'start'
    ? { ...clip, sourceStart: editTime }
    : { ...clip, sourceEnd: editTime };

  return clips.map((item, itemIndex) => (itemIndex === index ? trimmed : item));
}

export function applySourceRange(
  clips: Clip[],
  clipId: string,
  markIn: number,
  markOut: number,
  fps?: number,
): Clip[] {
  const index = clips.findIndex((clip) => clip.id === clipId);
  if (index < 0) return clips;
  const clip = clips[index];
  const rangeStart = Math.max(clip.sourceStart, snapTimeToFrame(markIn, fps));
  const rangeEnd = Math.min(clip.sourceEnd, snapTimeToFrame(markOut, fps));
  if (rangeEnd <= rangeStart) return clips;
  if (rangeStart === clip.sourceStart && rangeEnd === clip.sourceEnd) return clips;
  return clips.map((item, itemIndex) => (
    itemIndex === index ? { ...item, sourceStart: rangeStart, sourceEnd: rangeEnd } : item
  ));
}

export function summarizeAudioSamples(samples: Float32Array, bucketCount: number): number[] {
  const buckets = Math.max(0, Math.floor(bucketCount));
  if (buckets === 0) return [];
  if (samples.length === 0) return Array.from({ length: buckets }, () => 0);

  return Array.from({ length: buckets }, (_, bucketIndex) => {
    const start = Math.floor((bucketIndex * samples.length) / buckets);
    const end = Math.max(start + 1, Math.floor(((bucketIndex + 1) * samples.length) / buckets));
    let peak = 0;
    for (let index = start; index < Math.min(end, samples.length); index += 1) {
      peak = Math.max(peak, Math.min(1, Math.abs(samples[index])));
    }
    return peak;
  });
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
