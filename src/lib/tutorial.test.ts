import { describe, expect, it } from 'vitest';
import { applyTutorialEvent, type TutorialLesson } from './tutorial';
import type { TutorialProgress } from '../types';

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

describe('tutorial event progression', () => {
  it('ignores events that do not match the active interactive step', () => {
    expect(applyTutorialEvent(initial, { type: 'mark.in' }, lessons)).toEqual(initial);
  });

  it('advances one step after the required editor action happens', () => {
    expect(applyTutorialEvent(initial, { type: 'transport.played' }, lessons)).toEqual({
      lessonIndex: 0,
      stepIndex: 1,
      completedLessonIds: [],
    });
  });

  it('completes a lesson and advances to the next lesson', () => {
    const progress: TutorialProgress = { lessonIndex: 0, stepIndex: 1, completedLessonIds: [] };
    expect(applyTutorialEvent(progress, { type: 'mark.in' }, lessons)).toEqual({
      lessonIndex: 1,
      stepIndex: 0,
      completedLessonIds: ['transport'],
    });
  });
});
