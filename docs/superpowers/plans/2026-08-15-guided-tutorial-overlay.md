# Guided Tutorial Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a true onboarding-style tutorial overlay that spotlights real editor controls, explains beginner terms, and waits for an explicit Next after successful actions.

**Architecture:** Keep tutorial progression in the existing pure tutorial module, extending it with a completion phase before advancement. Add one reusable React overlay that locates existing `data-tutorial-key` targets and renders dimming, spotlight, callout, beginner definitions, and Next. Keep the existing coach panel and Show me button.

**Tech Stack:** React, TypeScript, Vite, Node test runner, existing CSS.

## Global Constraints
- Keep `Show me where` in the coach sidebar.
- Keep target controls clickable while highlighted.
- Do not use glowing, luminous purple, indigo, blue, or teal styling.
- Preserve Premiere/Resolve transfer notes and shortcuts.
- Persist old tutorial progress safely even when `stepComplete` is missing.

---

### Task 1: Tutorial completion state

**Files:**
- Modify: `src/types.ts`
- Modify: `src/lib/tutorial.ts`
- Test: `src/lib/tutorial.test.ts`

**Interfaces:**
- `applyTutorialEvent(progress, event, lessons)` marks `stepComplete: true` when the required event occurs.
- `continueTutorial(progress, lessons)` advances one step/lesson only when the current step is complete.

- [ ] Write failing tests for completion-before-advance and explicit continue.
- [ ] Run `npm run test:run` and confirm the new tests fail.
- [ ] Add optional `stepComplete?: boolean` and implement `continueTutorial`.
- [ ] Run `npm run test:run` and confirm all tests pass.

### Task 2: Beginner tutorial content

**Files:**
- Modify: `src/lib/tutorial.ts`
- Modify: `src/data/lessons.ts`

**Interfaces:**
- `TutorialStep.simpleBody?: string`
- `TutorialStep.term?: { name: string; meaning: string }`

- [ ] Add optional beginner-facing fields to `TutorialStep`.
- [ ] Add plain explanations to the early lessons, including a direct definition of playhead.
- [ ] Keep the professional command name and transfer note intact.

### Task 3: Guided overlay component

**Files:**
- Create: `src/components/GuidedTutorialOverlay.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Props: active step, lesson/step counters, completion state, `onNext`.
- Locates `[data-tutorial-key="${step.target}"]` and recomputes its rectangle on step changes, resize, and scroll.

- [ ] Render four dimmer panels around the target so the target stays visible and clickable.
- [ ] Render a warm-neutral spotlight border and pointer.
- [ ] Render a nearby callout using `simpleBody`, optional term definition, shortcut, and a waiting state.
- [ ] After completion, show `Done` plus a prominent `Next` button.
- [ ] Add responsive positioning so the card stays inside the viewport.

### Task 4: Wire overlay into app

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/CoachPanel.tsx`

**Interfaces:**
- `App` passes `progress.stepComplete` into the overlay.
- `Next` calls `continueTutorial`.
- Coach panel retains `Show me where` and changes its rule copy to explain that successful actions unlock Next.

- [ ] Import and render the overlay above the app shell when a targeted step exists.
- [ ] Update progress percentage to count a completed current step.
- [ ] Keep `Show me where` behavior unchanged.
- [ ] Update coach copy so it no longer claims there is no Next button.

### Task 5: Verification and merge

**Files:**
- No new source files beyond tasks above.

- [ ] Run `npm run test:run`.
- [ ] Run `npm run build`.
- [ ] Open PR to `main`.
- [ ] Confirm CI passes.
- [ ] Squash merge the PR.
- [ ] Confirm post-merge `main` CI passes.