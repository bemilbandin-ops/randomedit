import assert from 'node:assert/strict';
import test from 'node:test';
import { formatTimecode, parseProject, serializeProject, toEdl } from './export.ts';
import type { ProjectState } from '../types.ts';

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

test('round trips a project through JSON', () => {
  assert.deepEqual(parseProject(serializeProject(project)), project);
});

test('rejects unsupported project versions', () => {
  assert.throws(() => parseProject('{"version":2,"name":"old"}'), /version/i);
});

test('rejects malformed clip boundaries', () => {
  const malformed = {
    ...project,
    clips: [{ id: 'a', name: 'practice.mp4', sourceStart: 1, sourceEnd: 'three' }],
  };
  assert.throws(() => parseProject(JSON.stringify(malformed)), /invalid project/i);
});

test('rejects invalid nested settings', () => {
  const malformed = {
    ...project,
    settings: { ...project.settings, exportFormat: 'mov' },
  };
  assert.throws(() => parseProject(JSON.stringify(malformed)), /invalid project/i);
});

test('rejects missing tutorial or shortcut state', () => {
  const { tutorial: _tutorial, ...withoutTutorial } = project;
  const { shortcutBindings: _bindings, ...withoutBindings } = project;
  assert.throws(() => parseProject(JSON.stringify(withoutTutorial)), /invalid project/i);
  assert.throws(() => parseProject(JSON.stringify(withoutBindings)), /invalid project/i);
});

test('rejects invalid source metadata', () => {
  const malformed = {
    ...project,
    source: { ...project.source!, duration: -2 },
  };
  assert.throws(() => parseProject(JSON.stringify(malformed)), /invalid project/i);
});

test('writes an ordered CMX-style EDL with source and record timecodes', () => {
  const edl = toEdl(project);
  assert.match(edl, /TITLE: Practice Cut/);
  assert.match(edl, /001  AX       V     C/);
  assert.match(edl, /00:00:01:00 00:00:03:00 00:00:00:00 00:00:02:00/);
  assert.match(edl, /002  AX       V     C/);
  assert.match(edl, /00:00:05:00 00:00:08:00 00:00:02:00 00:00:05:00/);
});

test('uses the actual fractional frame rate when converting elapsed time to NDF timecode', () => {
  assert.equal(formatTimecode(3600, 29.97), '00:59:56:12');
});

test('uses corrected fractional-rate timecodes in EDL output', () => {
  const fractional: ProjectState = {
    ...project,
    source: { name: 'long.mp4', duration: 4000, width: 1920, height: 1080 },
    clips: [{ id: 'long', name: 'long.mp4', sourceStart: 3600, sourceEnd: 3601 }],
    settings: { ...project.settings, sequenceFps: 29.97 },
  };
  const edl = toEdl(fractional);
  assert.match(edl, /00:59:56:12/);
});
