import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App.tsx';
import { lessons } from '../data/lessons.ts';
import type { TutorialStep } from '../lib/tutorial.ts';
import type { TutorialProgress } from '../types.ts';
import { GuidedTutorialOverlay } from './GuidedTutorialOverlay.tsx';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const PROGRESS_KEY = 'randomedit.progress.v1';

function completedBefore(lessonIndex: number): string[] {
  return lessons.slice(0, lessonIndex).map((lesson) => lesson.id);
}

function setProgress(progress: TutorialProgress): void {
  window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

async function click(element: Element): Promise<void> {
  await act(async () => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

async function changeSelect(select: HTMLSelectElement, value: string): Promise<void> {
  await act(async () => {
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

describe('guided tutorial integration', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    window.localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);

    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        x: 100,
        y: 100,
        top: 100,
        left: 100,
        right: 500,
        bottom: 160,
        width: 400,
        height: 60,
        toJSON: () => ({}),
      }),
    });
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:test'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    document.body.innerHTML = '';
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  async function renderApp(progress: TutorialProgress): Promise<void> {
    setProgress(progress);
    await act(async () => {
      root.render(<App />);
    });
  }

  it('counts a completed current step before Next is pressed', async () => {
    await renderApp({
      lessonIndex: 0,
      stepIndex: 0,
      completedLessonIds: [],
      stepComplete: true,
    });

    const totalSteps = lessons.reduce((total, lesson) => total + lesson.steps.length, 0);
    const expectedPercent = Math.round((1 / totalSteps) * 100);
    const progressButton = document.querySelector('.topbar__actions .toolbar-button');

    expect(progressButton?.textContent).toContain(`${expectedPercent}%`);
  });

  it('keeps one tutorial state even when localStorage writes fail', async () => {
    setProgress({
      lessonIndex: 0,
      stepIndex: 1,
      completedLessonIds: [],
      stepComplete: false,
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });

    await act(async () => {
      root.render(<App />);
    });

    const ruler = document.querySelector('[data-tutorial-key="timeline-ruler"]');
    expect(ruler).not.toBeNull();
    await click(ruler!);

    expect(document.querySelector('.guided-next')?.textContent).toContain('Next');
  });

  it('keeps unrelated mouse and keyboard controls usable during guided steps', async () => {
    await renderApp({ lessonIndex: 0, stepIndex: 0, completedLessonIds: [], stepComplete: false });

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true }));
    });
    expect(document.querySelector('.statusbar')?.textContent).toContain('Razor / Blade tool');

    const settings = document.querySelector('[data-tutorial-key="settings"]');
    expect(settings).not.toBeNull();
    await click(settings!);
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('keeps unrelated keyboard commands available after Done until Next', async () => {
    await renderApp({ lessonIndex: 0, stepIndex: 0, completedLessonIds: [], stepComplete: true });

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true }));
    });

    expect(document.querySelector('.statusbar')?.textContent).toContain('Razor / Blade tool');
    expect(document.querySelector('.guided-next')).not.toBeNull();
  });

  it('keeps the completed highlighted target usable while Next is shown', async () => {
    const targetClick = vi.fn();
    const onNext = vi.fn();
    const step: TutorialStep = {
      id: 'destructive-example',
      title: 'Do it once',
      body: 'Perform this action once.',
      requiredEvent: 'clip.split',
      target: 'destructive-target',
    };

    await act(async () => {
      root.render(
        <>
          <button type="button" data-tutorial-key="destructive-target" onClick={targetClick}>Target action</button>
          <GuidedTutorialOverlay
            step={step}
            lessonNumber={1}
            totalLessons={1}
            stepNumber={1}
            totalSteps={1}
            complete
            onNext={onNext}
          />
        </>,
      );
    });

    const target = document.querySelector('[data-tutorial-key="destructive-target"]');
    expect(target).not.toBeNull();
    await click(target!);
    expect(targetClick).toHaveBeenCalledTimes(1);

    const next = document.querySelector('.guided-next');
    expect(next).not.toBeNull();
    await click(next!);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('does not complete Mark Out when there is no positive In-to-Out range', async () => {
    await renderApp({
      lessonIndex: 3,
      stepIndex: 0,
      completedLessonIds: completedBefore(3),
      stepComplete: false,
    });

    const markIn = document.querySelector('[data-tutorial-key="mark-in"]');
    expect(markIn).not.toBeNull();
    await click(markIn!);

    const next = document.querySelector('.guided-next');
    expect(next).not.toBeNull();
    await click(next!);

    const markOut = document.querySelector('[data-tutorial-key="mark-out"]');
    expect(markOut).not.toBeNull();
    await click(markOut!);

    expect(document.querySelector('.guided-next')).toBeNull();
  });

  it('does not lock unrelated controls when a tutorial target is missing', async () => {
    const otherClick = vi.fn();
    const step: TutorialStep = {
      id: 'missing-target',
      title: 'Missing target',
      body: 'The target is intentionally absent.',
      requiredEvent: 'test.missing',
      target: 'not-mounted',
    };

    await act(async () => {
      root.render(
        <>
          <button type="button" onClick={otherClick}>Still usable</button>
          <GuidedTutorialOverlay
            step={step}
            lessonNumber={1}
            totalLessons={1}
            stepNumber={1}
            totalSteps={1}
            complete={false}
            onNext={() => undefined}
          />
        </>,
      );
    });

    expect(document.querySelector('.guided-card')).toBeNull();
    const other = Array.from(document.querySelectorAll('button')).find((button) => button.textContent === 'Still usable');
    expect(other).toBeDefined();
    await click(other!);
    expect(otherClick).toHaveBeenCalledTimes(1);
  });

  it('focuses dialogs, closes them with Escape, and restores focus to the opener', async () => {
    await renderApp({
      lessonIndex: lessons.length - 1,
      stepIndex: lessons[lessons.length - 1].steps.length,
      completedLessonIds: lessons.map((lesson) => lesson.id),
      stepComplete: false,
    });

    const settings = document.querySelector('[data-tutorial-key="settings"]') as HTMLButtonElement | null;
    expect(settings).not.toBeNull();
    settings!.focus();
    await click(settings!);

    const dialog = document.querySelector('[role="dialog"]');
    const close = document.querySelector('[aria-label="Close dialog"]');
    expect(dialog).not.toBeNull();
    expect(close).not.toBeNull();
    expect(document.activeElement).toBe(close);

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(settings);
  });

  it('requires separate project JSON and EDL downloads before completing handoff', async () => {
    await renderApp({
      lessonIndex: 6,
      stepIndex: 0,
      completedLessonIds: completedBefore(6),
      stepComplete: false,
    });

    const settingsButton = document.querySelector('[data-tutorial-key="settings"]');
    expect(settingsButton).not.toBeNull();
    await click(settingsButton!);

    const settingsOptions = document.querySelector('[data-tutorial-key="settings-options"]');
    expect(settingsOptions).not.toBeNull();

    const speed = settingsOptions!.querySelector('select') as HTMLSelectElement | null;
    expect(speed).not.toBeNull();
    await changeSelect(speed!, '0.5');

    const nextAfterSettings = document.querySelector('.guided-next');
    expect(nextAfterSettings).not.toBeNull();
    await click(nextAfterSettings!);
    expect(document.querySelector('[role="dialog"]')).toBeNull();

    const exportButton = document.querySelector('[data-tutorial-key="export-project"]');
    expect(exportButton).not.toBeNull();
    await click(exportButton!);

    const downloadProject = document.querySelector('[data-tutorial-key="download-project"]');
    expect(downloadProject).not.toBeNull();
    await click(downloadProject!);

    const nextAfterProject = document.querySelector('.guided-next');
    expect(nextAfterProject).not.toBeNull();
    await click(nextAfterProject!);

    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.body.textContent).not.toContain('Foundation complete');

    const exportAgain = document.querySelector('[data-tutorial-key="export-project"]');
    expect(exportAgain).not.toBeNull();
    await click(exportAgain!);

    const downloadEdl = document.querySelector('[data-tutorial-key="download-edl"]');
    expect(downloadEdl).not.toBeNull();
    await click(downloadEdl!);

    const nextAfterEdl = document.querySelector('.guided-next');
    expect(nextAfterEdl).not.toBeNull();
    await click(nextAfterEdl!);

    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.body.textContent).toContain('Foundation complete');
  });
});
