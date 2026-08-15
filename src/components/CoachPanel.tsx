import { CheckCircle2, Crosshair, Keyboard, MoveRight } from 'lucide-react';
import type { TutorialLesson, TutorialStep } from '../lib/tutorial.ts';
import { GuidedTutorialOverlay } from './GuidedTutorialOverlay.tsx';

interface CoachPanelProps {
  lesson?: TutorialLesson;
  step?: TutorialStep;
  overlayStep?: TutorialStep;
  lessonNumber: number;
  totalLessons: number;
  courseComplete: boolean;
  stepComplete: boolean;
  onNext: () => void;
  onShowMe: (target?: string) => void;
}

export function CoachPanel({
  lesson,
  step,
  overlayStep,
  lessonNumber,
  totalLessons,
  courseComplete,
  stepComplete,
  onNext,
  onShowMe,
}: CoachPanelProps) {
  if (courseComplete || !lesson || !step) {
    return (
      <aside className="coach-panel coach-panel--complete">
        <CheckCircle2 size={28} />
        <h2>Foundation complete</h2>
        <p>You have used the core timeline actions instead of just reading about them.</p>
        <div className="coach-callout">
          <strong>Next move</strong>
          <span>Open Premiere Pro or DaVinci Resolve and repeat the same workflow on a small clip.</span>
        </div>
      </aside>
    );
  }

  const stepNumber = Math.min(lesson.steps.indexOf(step) + 1, lesson.steps.length);
  const activeOverlayStep = overlayStep ?? step;

  return (
    <>
      <GuidedTutorialOverlay
        step={activeOverlayStep}
        lessonNumber={lessonNumber}
        totalLessons={totalLessons}
        stepNumber={stepNumber}
        totalSteps={lesson.steps.length}
        complete={stepComplete}
        onNext={onNext}
      />

      <aside className="coach-panel" aria-live="polite">
        <div className="coach-panel__eyeline">
          <span>Lesson {lessonNumber} / {totalLessons}</span>
          <span>Step {stepNumber} / {lesson.steps.length}</span>
        </div>
        <h2>{step.title}</h2>
        <p className="coach-panel__body">{step.body}</p>

        <div className="coach-action">
          <span className="coach-action__icon"><Crosshair size={16} /></span>
          <div>
            <span>Professional name</span>
            <strong>{step.professionalName ?? step.title}</strong>
          </div>
        </div>

        {step.shortcut ? (
          <div className="coach-shortcut">
            <Keyboard size={15} />
            <span>Shortcut</span>
            <kbd>{step.shortcut}</kbd>
          </div>
        ) : null}

        {step.transferNote ? (
          <div className="coach-transfer">
            <span>Why this transfers</span>
            <p>{step.transferNote}</p>
          </div>
        ) : null}

        <button className="secondary-button coach-show" type="button" onClick={() => onShowMe(activeOverlayStep.target)}>
          Show me where
          <MoveRight size={15} />
        </button>

        <p className="coach-panel__rule">Do the highlighted action. When it works, the overlay unlocks Next. “Show me where” re-highlights the target.</p>
      </aside>
    </>
  );
}
