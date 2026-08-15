import { describe, expect, it } from 'vitest';
import { parseProject, serializeProject, toEdl } from './export';
import type { ProjectState } from '../types';

const project: ProjectState = {
  version: 1,
  name: 'Practice Cut',
  source: { name: 'practice.mp4', duration: 12, width: 1920, height: 1080 },
  clips: [
    { id: 'a', name: 'practice.mp4', sourceStart: 1, sourceEnd: 3 },
    { id: 'b', name: 'practice.mp4', sourceStart: 5, sourceEnd: 8 },
  ],
  markers: [{ id: 'm1', time: 1.5, label: 'Nice cut' }],
  settings: {
    playbackSpeed: 1,
    sequenceFps: 25,
    exportResolution: '1080p',
    exportFps: 25,
    exportFormat: 'webm',
  },
  shortcutProfile: 'premiere',
  shortcutBindings: { playPause: 'Space' },
  tutorial: { lessonIndex: 0, stepIndex: 1, completedLessonIds: [] },
};

describe('project export', () => {
  it('round trips a project through JSON', () => {
    expect(parseProject(serializeProject(project))).toEqual(project);
  });

  it('rejects unsupported project versions', () => {
    expect(() => parseProject('{"version":2,"name":"old"}')).toThrow(/version/i);
  });

  it('writes an ordered CMX-style EDL with source and record timecodes', () => {
    const edl = toEdl(project);
    expect(edl).toContain('TITLE: Practice Cut');
    expect(edl).toContain('001  AX       V     C');
    expect(edl).toContain('00:00:01:00 00:00:03:00 00:00:00:00 00:00:02:00');
    expect(edl).toContain('002  AX       V     C');
    expect(edl).toContain('00:00:05:00 00:00:08:00 00:00:02:00 00:00:05:00');
  });
});
