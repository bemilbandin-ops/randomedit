import type { TutorialEvent, TutorialProgress } from '../types.ts';

export interface TutorialTerm {
  name: string;
  meaning: string;
}

export interface TutorialStep {
  id: string;
  title: string;
  body: string;
  simpleBody?: string;
  term?: TutorialTerm;
  requiredEvent: string;
  target?: string;
  shortcut?: string;
  professionalName?: string;
  transferNote?: string;
}

export interface TutorialLesson {
  id: string;
  title: string;
  description?: string;
  steps: TutorialStep[];
}

export function applyTutorialEvent(
  progress: TutorialProgress,
  event: TutorialEvent,
  lessons: TutorialLesson[],
): TutorialProgress {
  if (progress.stepComplete) return progress;

  const lesson = lessons[progress.lessonIndex];
  if (!lesson) return progress;

  const step = lesson.steps[progress.stepIndex];
  if (!step || step.requiredEvent !== event.type) return progress;

  return { ...progress, stepComplete: true };
}

export function continueTutorial(
  progress: TutorialProgress,
  lessons: TutorialLesson[],
): TutorialProgress {
  if (!progress.stepComplete) return progress;

  const lesson = lessons[progress.lessonIndex];
  if (!lesson) return progress;

  if (progress.stepIndex < lesson.steps.length - 1) {
    return {
      ...progress,
      stepIndex: progress.stepIndex + 1,
      stepComplete: false,
    };
  }

  const completedLessonIds = progress.completedLessonIds.includes(lesson.id)
    ? progress.completedLessonIds
    : [...progress.completedLessonIds, lesson.id];

  if (progress.lessonIndex < lessons.length - 1) {
    return {
      lessonIndex: progress.lessonIndex + 1,
      stepIndex: 0,
      completedLessonIds,
      stepComplete: false,
    };
  }

  return {
    lessonIndex: progress.lessonIndex,
    stepIndex: lesson.steps.length,
    completedLessonIds,
    stepComplete: false,
  };
}
