import type { ProjectState } from '../types.ts';

export function serializeProject(project: ProjectState): string {
  return JSON.stringify(project, null, 2);
}

export function parseProject(json: string): ProjectState {
  const value: unknown = JSON.parse(json);

  if (!value || typeof value !== 'object') {
    throw new Error('Invalid project file.');
  }

  const project = value as Partial<ProjectState> & { version?: number };
  if (project.version !== 1) {
    throw new Error(`Unsupported project version: ${String(project.version ?? 'missing')}`);
  }
  if (typeof project.name !== 'string' || !Array.isArray(project.clips) || !project.settings) {
    throw new Error('Invalid project file: required fields are missing.');
  }

  return project as ProjectState;
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
