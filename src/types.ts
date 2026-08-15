export type ClipEdge = 'start' | 'end';
export type ShortcutProfile = 'premiere' | 'resolve' | 'custom';
export type ShortcutBaseProfile = 'premiere' | 'resolve';
export type ExportResolution = 'source' | '720p' | '1080p' | '1440p' | '2160p';
export type ExportFormat = 'webm' | 'mp4';

export interface Clip {
  id: string;
  name: string;
  sourceStart: number;
  sourceEnd: number;
}

export interface Marker {
  id: string;
  time: number;
  label: string;
}

export interface EditorSettings {
  playbackSpeed: number;
  sequenceFps: number;
  exportResolution: ExportResolution;
  exportFps: 'source' | number;
  exportFormat: ExportFormat;
}

export interface SourceMeta {
  name: string;
  duration: number;
  width: number;
  height: number;
  fileSize?: number;
  fingerprint?: string;
  sourceFps?: number;
  startTimecode?: string;
  reel?: string;
}

export interface TutorialProgress {
  lessonIndex: number;
  stepIndex: number;
  completedLessonIds: string[];
  stepComplete?: boolean;
}

export interface TutorialEvent {
  type: string;
  payload?: Record<string, unknown>;
}

export interface ShortcutCommand {
  id: string;
  name: string;
  category: string;
  description: string;
  premiere: string;
  resolve: string;
}

export type ShortcutBindings = Record<string, string>;

export interface ProjectState {
  version: 2;
  name: string;
  source: SourceMeta | null;
  clips: Clip[];
  markers: Marker[];
  settings: EditorSettings;
  shortcutProfile: ShortcutProfile;
  shortcutBaseProfile: ShortcutBaseProfile;
  shortcutBindings: ShortcutBindings;
  tutorial: TutorialProgress;
}
