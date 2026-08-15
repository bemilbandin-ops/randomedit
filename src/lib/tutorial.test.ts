import assert from 'node:assert/strict';
import test from 'node:test';
import { applyTutorialEvent, type TutorialLesson } from './tutorial.ts';
import type { TutorialProgress } from '../types.ts';

const lessons: TutorialLesson[] = [
  {
    id: 'transport',
    title: 'Navigate',
    steps: [
      { id: 'play', title: 'Play the sequence', body: 'Press Space.', requiredEvent: 'transport.played' },
      { id: 'mark', title: 'Mark In', body: 'Press I.', requiredEvent: 'mark.in' },
    ],
  },
  {
    id: 'cut',
    title: 'Cut',
    steps: [{ id: 'split', title: 'Add an edit', body: 'Split at the playhead.', requiredEvent: 'clip.split' }],
  },
];

const initial: TutorialProgress = { lessonIndex: 0, stepIndex: 0, completedLessonIds: [] };

test('ignores events that do not match the active interactive step', () => {
  assert.deepEqual(applyTutorialEvent(initial, { type: 'mark.in' }, lessons), initial);
});

test('advances one step after the required editor action happens', () => {
  assert.deepEqual(applyTutorialEvent(initial, { type: 'transport.played' }, lessons), {
    lessonIndex: 0,
    stepIndex: 1,
    completedLessonIds: [],
  });
});

test('completes a lesson and advances to the next lesson', () => {
  const progress: TutorialProgress = { lessonIndex: 0, stepIndex: 1, completedLessonIds: [] };
  assert.deepEqual(applyTutorialEvent(progress, { type: 'mark.in' }, lessons), {
    lessonIndex: 1,
    stepIndex: 0,
    completedLessonIds: ['transport'],
  });
});
