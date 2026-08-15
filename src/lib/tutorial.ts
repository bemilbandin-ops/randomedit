import type { TutorialEvent, TutorialProgress } from '../types.ts';

export interface TutorialStep {
  id: string;
  title: string;
  body: string;
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
  const lesson = lessons[progress.lessonIndex];
  if (!lesson) return progress;

  const step = lesson.steps[progress.stepIndex];
  if (!step || step.requiredEvent !== event.type) return progress;

  if (progress.stepIndex < lesson.steps.length - 1) {
    return { ...progress, stepIndex: progress.stepIndex + 1 };
  }

  const completedLessonIds = progress.completedLessonIds.includes(lesson.id)
    ? progress.completedLessonIds
    : [...progress.completedLessonIds, lesson.id];

  if (progress.lessonIndex < lessons.length - 1) {
    return {
      lessonIndex: progress.lessonIndex + 1,
      stepIndex: 0,
      completedLessonIds,
    };
  }

  return {
    lessonIndex: progress.lessonIndex,
    stepIndex: lesson.steps.length,
    completedLessonIds,
  };
}
