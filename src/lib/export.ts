import type {
  Clip,
  EditorSettings,
  Marker,
  ProjectState,
  ShortcutBindings,
  ShortcutProfile,
  SourceMeta,
  TutorialProgress,
} from '../types.ts';

export function serializeProject(project: ProjectState): string {
  return JSON.stringify(project, null, 2);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === 'number' && value >= 0;
}

function invalid(detail: string): never {
  throw new Error(`Invalid project file: ${detail}.`);
}

function parseSource(value: unknown): SourceMeta | null {
  if (value === null) return null;
  if (!isRecord(value)) invalid('source metadata is malformed');
  if (
    typeof value.name !== 'string'
    || !isFiniteNumber(value.duration) || value.duration <= 0
    || !isFiniteNumber(value.width) || value.width <= 0
    || !isFiniteNumber(value.height) || value.height <= 0
  ) {
    invalid('source metadata is malformed');
  }
  return {
    name: value.name,
    duration: value.duration,
    width: value.width,
    height: value.height,
  };
}

function parseClip(value: unknown, source: SourceMeta | null): Clip {
  if (!isRecord(value)) invalid('clip data is malformed');
  if (
    typeof value.id !== 'string' || value.id.length === 0
    || typeof value.name !== 'string'
    || !isFiniteNumber(value.sourceStart) || value.sourceStart < 0
    || !isFiniteNumber(value.sourceEnd) || value.sourceEnd <= value.sourceStart
  ) {
    invalid('clip data is malformed');
  }
  if (source && value.sourceEnd > source.duration + 0.001) {
    invalid('clip extends past the source duration');
  }
  return {
    id: value.id,
    name: value.name,
    sourceStart: value.sourceStart,
    sourceEnd: value.sourceEnd,
  };
}

function parseMarker(value: unknown): Marker {
  if (!isRecord(value)) invalid('marker data is malformed');
  if (
    typeof value.id !== 'string' || value.id.length === 0
    || typeof value.label !== 'string'
    || !isFiniteNumber(value.time) || value.time < 0
  ) {
    invalid('marker data is malformed');
  }
  return { id: value.id, label: value.label, time: value.time };
}

function parseSettings(value: unknown): EditorSettings {
  if (!isRecord(value)) invalid('settings are missing or malformed');
  const resolutions = new Set(['source', '720p', '1080p', '1440p', '2160p']);
  const formats = new Set(['webm', 'mp4']);
  const exportFps = value.exportFps;

  if (
    !isFiniteNumber(value.playbackSpeed) || value.playbackSpeed <= 0
    || !isFiniteNumber(value.sequenceFps) || value.sequenceFps <= 0
    || typeof value.exportResolution !== 'string' || !resolutions.has(value.exportResolution)
    || !(exportFps === 'source' || (isFiniteNumber(exportFps) && exportFps > 0))
    || typeof value.exportFormat !== 'string' || !formats.has(value.exportFormat)
  ) {
    invalid('settings are malformed');
  }

  return {
    playbackSpeed: value.playbackSpeed,
    sequenceFps: value.sequenceFps,
    exportResolution: value.exportResolution as EditorSettings['exportResolution'],
    exportFps: exportFps as EditorSettings['exportFps'],
    exportFormat: value.exportFormat as EditorSettings['exportFormat'],
  };
}

function parseShortcutProfile(value: unknown): ShortcutProfile {
  if (value !== 'premiere' && value !== 'resolve' && value !== 'custom') {
    invalid('shortcut profile is malformed');
  }
  return value;
}

function parseShortcutBindings(value: unknown): ShortcutBindings {
  if (!isRecord(value)) invalid('shortcut bindings are missing or malformed');
  const entries = Object.entries(value);
  if (entries.some(([id, binding]) => id.length === 0 || typeof binding !== 'string')) {
    invalid('shortcut bindings are malformed');
  }
  return Object.fromEntries(entries) as ShortcutBindings;
}

function parseTutorial(value: unknown): TutorialProgress {
  if (!isRecord(value)) invalid('tutorial progress is missing or malformed');
  if (
    !isNonNegativeInteger(value.lessonIndex)
    || !isNonNegativeInteger(value.stepIndex)
    || !Array.isArray(value.completedLessonIds)
    || value.completedLessonIds.some((id) => typeof id !== 'string')
    || (value.stepComplete !== undefined && typeof value.stepComplete !== 'boolean')
  ) {
    invalid('tutorial progress is malformed');
  }
  return {
    lessonIndex: value.lessonIndex,
    stepIndex: value.stepIndex,
    completedLessonIds: [...value.completedLessonIds] as string[],
    ...(value.stepComplete === undefined ? {} : { stepComplete: value.stepComplete }),
  };
}

export function parseProject(json: string): ProjectState {
  const value: unknown = JSON.parse(json);
  if (!isRecord(value)) invalid('root value is malformed');

  if (value.version !== 1) {
    throw new Error(`Unsupported project version: ${String(value.version ?? 'missing')}`);
  }
  if (typeof value.name !== 'string') invalid('project name is missing');

  const source = parseSource(value.source ?? null);
  if (!Array.isArray(value.clips)) invalid('clips are missing');
  const clips = value.clips.map((clip) => parseClip(clip, source));
  const markers = value.markers === undefined
    ? []
    : Array.isArray(value.markers)
      ? value.markers.map(parseMarker)
      : invalid('markers are malformed');

  return {
    version: 1,
    name: value.name,
    source,
    clips,
    markers,
    settings: parseSettings(value.settings),
    shortcutProfile: parseShortcutProfile(value.shortcutProfile),
    shortcutBindings: parseShortcutBindings(value.shortcutBindings),
    tutorial: parseTutorial(value.tutorial),
  };
}

function toTimecode(seconds: number, fpsValue: number): string {
  const fps = Math.max(1, Math.round(fpsValue));
  const totalFrames = Math.max(0, Math.round(seconds * fps));
  const frames = totalFrames % fps;
  const totalSeconds = Math.floor(totalFrames / fps);
  const secs = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  return [hours, minutes, secs, frames]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
}

export function toEdl(project: ProjectState): string {
  const fps = project.settings.sequenceFps;
  let recordTime = 0;
  const lines = [`TITLE: ${project.name}`, 'FCM: NON-DROP FRAME', ''];

  project.clips.forEach((clip, index) => {
    const duration = Math.max(0, clip.sourceEnd - clip.sourceStart);
    const event = String(index + 1).padStart(3, '0');
    const sourceIn = toTimecode(clip.sourceStart, fps);
    const sourceOut = toTimecode(clip.sourceEnd, fps);
    const recordIn = toTimecode(recordTime, fps);
    const recordOut = toTimecode(recordTime + duration, fps);

    lines.push(`${event}  AX       V     C        ${sourceIn} ${sourceOut} ${recordIn} ${recordOut}`);
    lines.push(`* FROM CLIP NAME: ${clip.name}`);
    lines.push('');
    recordTime += duration;
  });

  return `${lines.join('\n')}\n`;
}
