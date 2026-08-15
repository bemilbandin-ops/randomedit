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

  it('blocks unrelated mouse and keyboard actions but keeps Show me where usable', async () => {
    await renderApp({ lessonIndex: 0, stepIndex: 0, completedLessonIds: [], stepComplete: false });

    const settings = document.querySelector('[data-tutorial-key="settings"]');
    expect(settings).not.toBeNull();
    await click(settings!);
    expect(document.querySelector('[role="dialog"]')).toBeNull();

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true }));
    });
    expect(document.querySelector('.statusbar')?.textContent).toContain('Selection tool');

    const showMe = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Show me where'));
    expect(showMe).toBeDefined();
    await click(showMe!);
    expect(document.querySelector('[data-tutorial-key="play-toggle"]')?.classList.contains('tutorial-pulse')).toBe(true);
  });

  it('freezes unrelated keyboard commands after Done until Next', async () => {
    await renderApp({ lessonIndex: 0, stepIndex: 0, completedLessonIds: [], stepComplete: true });

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true }));
    });

    expect(document.querySelector('.statusbar')?.textContent).toContain('Selection tool');
    expect(document.querySelector('.guided-next')).not.toBeNull();
  });

  it('freezes the completed highlighted target itself until Next', async () => {
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
          <button type="button" data-tutorial-key="destructive-target" onClick={targetClick}>Dangerous action</button>
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
    expect(targetClick).not.toHaveBeenCalled();

    const next = document.querySelector('.guided-next');
    expect(next).not.toBeNull();
    await click(next!);
    expect(onNext).toHaveBeenCalledTimes(1);
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

  it('guides Settings inside the modal, closes it on Next, then guides the actual project download', async () => {
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

    const showMe = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Show me where'));
    expect(showMe).toBeDefined();
    await click(showMe!);
    expect(settingsOptions?.classList.contains('tutorial-pulse')).toBe(true);

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

    const nextAfterExport = document.querySelector('.guided-next');
    expect(nextAfterExport).not.toBeNull();
    await click(nextAfterExport!);

    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.body.textContent).toContain('Foundation complete');
  });
});
