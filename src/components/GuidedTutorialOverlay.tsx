import { ArrowRight, CheckCircle2, Crosshair } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { TutorialStep } from '../lib/tutorial.ts';
import './GuidedTutorialOverlay.css';

interface GuidedTutorialOverlayProps {
  step?: TutorialStep;
  lessonNumber: number;
  totalLessons: number;
  stepNumber: number;
  totalSteps: number;
  complete: boolean;
  onNext: () => void;
}

interface SpotlightRect {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

const EDGE = 10;
const GAP = 14;
const CARD_WIDTH = 360;
const CARD_HEIGHT_GUESS = 300;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getSpotlightRect(element: HTMLElement): SpotlightRect {
  const rect = element.getBoundingClientRect();
  const left = clamp(rect.left - EDGE, 8, Math.max(8, window.innerWidth - 8));
  const right = clamp(rect.right + EDGE, left, Math.max(left, window.innerWidth - 8));
  const top = clamp(rect.top - EDGE, 8, Math.max(8, window.innerHeight - 8));
  const bottom = clamp(rect.bottom + EDGE, top, Math.max(top, window.innerHeight - 8));

  return {
    top,
    left,
    right,
    bottom,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

function getCardStyle(rect: SpotlightRect): CSSProperties {
  const width = Math.min(CARD_WIDTH, window.innerWidth - 32);
  const maxLeft = Math.max(16, window.innerWidth - width - 16);
  const maxTop = Math.max(16, window.innerHeight - CARD_HEIGHT_GUESS - 16);

  if (rect.right + GAP + width <= window.innerWidth - 16) {
    return {
      left: rect.right + GAP,
      top: clamp(rect.top, 16, maxTop),
      width,
    };
  }

  if (rect.left - GAP - width >= 16) {
    return {
      left: rect.left - GAP - width,
      top: clamp(rect.top, 16, maxTop),
      width,
    };
  }

  const belowTop = rect.bottom + GAP;
  const canFitBelow = belowTop + 180 < window.innerHeight;
  return {
    left: clamp(rect.left, 16, maxLeft),
    top: canFitBelow
      ? clamp(belowTop, 16, maxTop)
      : clamp(rect.top - CARD_HEIGHT_GUESS - GAP, 16, maxTop),
    width,
  };
}

export function GuidedTutorialOverlay({
  step,
  lessonNumber,
  totalLessons,
  stepNumber,
  totalSteps,
  complete,
  onNext,
}: GuidedTutorialOverlayProps) {
  const [rect, setRect] = useState<SpotlightRect | null>(null);

  useEffect(() => {
    if (!step?.target) {
      setRect(null);
      return undefined;
    }

    const target = document.querySelector<HTMLElement>(`[data-tutorial-key="${step.target}"]`);
    if (!target) {
      setRect(null);
      return undefined;
    }

    const ensureVisible = () => {
      const targetRect = target.getBoundingClientRect();
      const outside = targetRect.bottom < 70
        || targetRect.top > window.innerHeight - 70
        || targetRect.right < 20
        || targetRect.left > window.innerWidth - 20;
      if (outside) target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    };

    const update = () => setRect(getSpotlightRect(target));
    ensureVisible();
    update();

    const delayed = window.setTimeout(update, 280);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);

    return () => {
      window.clearTimeout(delayed);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [step?.id, step?.target]);

  useEffect(() => {
    if (!step?.target) return undefined;

    const blockUnrelatedClick = (event: MouseEvent) => {
      const clicked = event.target instanceof Element ? event.target : null;
      if (!clicked) return;

      const target = document.querySelector<HTMLElement>(`[data-tutorial-key="${step.target}"]`);
      const completedTargetIsSafe = complete && step.requiredEvent === 'transport.played';
      const targetIsAllowed = (!complete || completedTargetIsSafe) && Boolean(target?.contains(clicked));
      const allowed = targetIsAllowed
        || Boolean(clicked.closest('.guided-card'))
        || Boolean(clicked.closest('.coach-show'))
        || Boolean(clicked.closest('[aria-label="Close dialog"]'));

      if (allowed) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };

    document.addEventListener('click', blockUnrelatedClick, true);
    return () => document.removeEventListener('click', blockUnrelatedClick, true);
  }, [complete, step?.id, step?.requiredEvent, step?.target]);

  const cardStyle = useMemo(() => (rect ? getCardStyle(rect) : undefined), [rect]);

  if (!step?.target || !rect || !cardStyle) return null;

  return (
    <div className="guided-overlay" aria-live="polite">
      <div className="guided-dim guided-dim--top" style={{ height: rect.top }} />
      <div className="guided-dim guided-dim--bottom" style={{ top: rect.bottom }} />
      <div
        className="guided-dim guided-dim--left"
        style={{ top: rect.top, width: rect.left, height: rect.height }}
      />
      <div
        className="guided-dim guided-dim--right"
        style={{ top: rect.top, left: rect.right, height: rect.height }}
      />

      <div
        className={`guided-spotlight ${complete ? 'guided-spotlight--done' : ''}`}
        style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
        aria-hidden="true"
      />

      <section className={`guided-card ${complete ? 'guided-card--done' : ''}`} style={cardStyle}>
        <div className="guided-card__eyeline">
          <span>Lesson {lessonNumber} / {totalLessons}</span>
          <span>Step {stepNumber} / {totalSteps}</span>
        </div>

        <div className="guided-card__heading">
          <span className="guided-card__icon" aria-hidden="true">
            {complete ? <CheckCircle2 size={19} /> : <Crosshair size={18} />}
          </span>
          <div>
            <small>{complete ? 'Nice — you did it' : 'Do this now'}</small>
            <h2>{step.title}</h2>
          </div>
        </div>

        <p className="guided-card__body">{step.simpleBody ?? step.body}</p>

        {step.term ? (
          <div className="guided-term">
            <strong>{step.term.name}</strong>
            <span>{step.term.meaning}</span>
          </div>
        ) : null}

        {!complete && step.shortcut ? (
          <div className="guided-shortcut">
            <span>Keyboard shortcut</span>
            <kbd>{step.shortcut}</kbd>
          </div>
        ) : null}

        {complete ? (
          <button className="guided-next" type="button" onClick={onNext} autoFocus>
            Next
            <ArrowRight size={17} />
          </button>
        ) : (
          <p className="guided-card__waiting">Use the highlighted control. The step unlocks when the app sees the action.</p>
        )}
      </section>
    </div>
  );
}
