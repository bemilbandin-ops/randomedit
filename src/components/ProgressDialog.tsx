import { CheckCircle2, Circle, RotateCcw } from 'lucide-react';
import { Modal } from './Modal.tsx';
import type { TutorialLesson } from '../lib/tutorial.ts';
import type { TutorialProgress } from '../types.ts';

interface ProgressDialogProps {
  lessons: TutorialLesson[];
  progress: TutorialProgress;
  percent: number;
  onReset: () => void;
  onClose: () => void;
}

export function ProgressDialog({ lessons, progress, percent, onReset, onClose }: ProgressDialogProps) {
  return (
    <Modal title="Learning progress" subtitle="Progress is saved in this browser." onClose={onClose}>
      <div className="progress-summary">
        <div className="progress-ring" style={{ '--progress': `${percent * 3.6}deg` } as React.CSSProperties}>
          <span>{percent}%</span>
        </div>
        <div>
          <strong>{progress.completedLessonIds.length} of {lessons.length} lessons complete</strong>
          <p>The app only counts a step after its real editor action fires.</p>
        </div>
      </div>

      <div className="progress-lessons">
        {lessons.map((lesson, index) => {
          const complete = progress.completedLessonIds.includes(lesson.id);
          const current = index === progress.lessonIndex;
          return (
            <div className={`progress-lesson ${current ? 'progress-lesson--current' : ''}`} key={lesson.id}>
              {complete ? <CheckCircle2 size={17} /> : <Circle size={16} />}
              <div>
                <strong>{lesson.title}</strong>
                <span>{complete ? 'Complete' : current ? `Current · step ${progress.stepIndex + 1}` : 'Not started'}</span>
              </div>
            </div>
          );
        })}
      </div>

      <button className="danger-button" type="button" onClick={onReset}>
        <RotateCcw size={15} /> Reset course progress
      </button>
    </Modal>
  );
}
