import assert from 'node:assert/strict';
import test from 'node:test';
import { lessons as courseLessons } from '../data/lessons.ts';
import { applyTutorialEvent, continueTutorial, type TutorialLesson } from './tutorial.ts';
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

test('marks the active step done instead of silently advancing', () => {
  assert.deepEqual(applyTutorialEvent(initial, { type: 'transport.played' }, lessons), {
    lessonIndex: 0,
    stepIndex: 0,
    completedLessonIds: [],
    stepComplete: true,
  });
});

test('ignores repeated editor events after the active step is already done', () => {
  const done: TutorialProgress = { ...initial, stepComplete: true };
  assert.deepEqual(applyTutorialEvent(done, { type: 'transport.played' }, lessons), done);
});

test('next advances one step only after the required action is done', () => {
  const done: TutorialProgress = { ...initial, stepComplete: true };
  assert.deepEqual(continueTutorial(done, lessons), {
    lessonIndex: 0,
    stepIndex: 1,
    completedLessonIds: [],
    stepComplete: false,
  });
});

test('next does nothing before the required editor action', () => {
  assert.deepEqual(continueTutorial(initial, lessons), initial);
});

test('next completes a lesson and advances to the next lesson', () => {
  const progress: TutorialProgress = {
    lessonIndex: 0,
    stepIndex: 1,
    completedLessonIds: [],
    stepComplete: true,
  };
  assert.deepEqual(continueTutorial(progress, lessons), {
    lessonIndex: 1,
    stepIndex: 0,
    completedLessonIds: ['transport'],
    stepComplete: false,
  });
});

test('next finishes the final lesson without moving past the course', () => {
  const progress: TutorialProgress = {
    lessonIndex: 1,
    stepIndex: 0,
    completedLessonIds: ['transport'],
    stepComplete: true,
  };
  assert.deepEqual(continueTutorial(progress, lessons), {
    lessonIndex: 1,
    stepIndex: 1,
    completedLessonIds: ['transport', 'cut'],
    stepComplete: false,
  });
});

test('the real final lesson includes a review-video handoff check before project files', () => {
  const finalLesson = courseLessons[courseLessons.length - 1];
  const reviewStep = finalLesson.steps.find((step) => step.id === 'review-video');
  assert.equal(reviewStep?.requiredEvent, 'review.checked');
  assert.equal(finalLesson.steps.some((step) => step.requiredEvent === 'project.exported'), true);
  assert.equal(finalLesson.steps.some((step) => step.requiredEvent === 'edl.exported'), true);
});
