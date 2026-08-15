import { Check, Circle, LockKeyhole } from 'lucide-react';
import type { TutorialLesson } from '../lib/tutorial.ts';
import type { TutorialProgress } from '../types.ts';

interface LessonRailProps {
  lessons: TutorialLesson[];
  progress: TutorialProgress;
}

export function LessonRail({ lessons, progress }: LessonRailProps) {
  return (
    <aside className="lesson-rail" aria-label="Course lessons">
      <div className="lesson-rail__header">
        <span>Course</span>
        <strong>Editing foundations</strong>
      </div>

      <ol className="lesson-list">
        {lessons.map((lesson, index) => {
          const complete = progress.completedLessonIds.includes(lesson.id);
          const current = index === progress.lessonIndex;
          const locked = index > progress.lessonIndex && !complete;

          return (
            <li
              className={`lesson-item ${current ? 'lesson-item--current' : ''} ${complete ? 'lesson-item--complete' : ''}`}
              key={lesson.id}
            >
              <span className="lesson-item__status" aria-hidden="true">
                {complete ? <Check size={14} /> : locked ? <LockKeyhole size={13} /> : <Circle size={12} />}
              </span>
              <div>
                <span className="lesson-item__number">{String(index + 1).padStart(2, '0')}</span>
                <strong>{lesson.title}</strong>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="lesson-rail__footer">
        <span>Skills transfer directly to a normal NLE timeline.</span>
      </div>
    </aside>
  );
}
