# Audit Critical Regressions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the user-facing failures found in the full repository audit and add regression coverage that prevents the same failures from returning.

**Architecture:** Keep the existing React/Vite structure and pure editing utilities. Remove tutorial-level input trapping, strengthen event/result validation, validate imported project data before state replacement, isolate review rendering from normal playback state, and centralize frame/time mapping helpers so edits resynchronize the viewer correctly.

**Tech Stack:** React 19, TypeScript 7, Vite 8, Node test runner, Vitest + JSDOM, browser MediaRecorder/canvas APIs.

## Global Constraints

- Tutorial guidance must never trap unrelated editor controls at the DOM level.
- A tutorial step completes only after the promised result is valid.
- Imported project JSON must be structurally validated before App state is replaced.
- Review rendering must not be interrupted by App's normal playback synchronization.
- Fractional sequence rates must use the real frame rate for elapsed-time-to-frame conversion.
- Existing Premiere/Resolve shortcut presets and the single-source edit model remain intact.
- Every production behavior change gets a failing regression test first.

---

### Task 1: Make tutorial guidance non-blocking and result-aware

**Files:**
- Modify: `src/components/GuidedTutorialOverlay.tsx`
- Modify: `src/App.tsx`
- Modify: `src/data/lessons.ts`
- Modify: `src/components/AppTutorial.ui.test.tsx`

**Interfaces:**
- The overlay remains visual only and does not cancel document clicks.
- App keyboard shortcuts remain available while a tutorial step is active.
- `mark.out` is emitted only when an In point exists and Out is later than In.

- [ ] Replace the UI regression that expects unrelated actions to be blocked with tests proving timeline navigation/upload remain usable during guided steps.
- [ ] Add a regression proving Mark Out cannot complete at or before Mark In.
- [ ] Run the tutorial UI tests and confirm they fail against the current implementation.
- [ ] Remove document-level click cancellation and tutorial keyboard command gating.
- [ ] Emit Mark Out completion only for a valid positive range and improve the lesson copy to say invalid Out points are not accepted.
- [ ] Run the tutorial UI tests and full unit suite.

### Task 2: Validate project imports before replacing editor state

**Files:**
- Modify: `src/lib/export.ts`
- Modify: `src/lib/export.test.ts`

**Interfaces:**
- `parseProject(json: string): ProjectState` validates nested source, clips, markers, settings, shortcuts, and tutorial fields.
- Invalid numeric ranges, missing required nested fields, and invalid enum values throw `Invalid project file` errors.

- [ ] Add failing tests for malformed clips, malformed settings, missing tutorial/shortcuts, and invalid source metadata.
- [ ] Run export tests and confirm the new cases fail.
- [ ] Add small type-guard helpers and validate every field App later trusts.
- [ ] Run export tests and the complete unit suite.

### Task 3: Prevent review rendering from fighting normal playback

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/lib/renderReview.ts`
- Modify: `src/lib/renderReview.test.ts`

**Interfaces:**
- App maintains `renderingReviewRef` and ignores normal `timeupdate` synchronization while review rendering owns the media element.
- `renderReviewVideo` rejects stalled clip playback after a finite timeout instead of waiting forever.
- `reviewExportCapability(requestedFormat, environment)` reports whether the current browser exposes recorder/canvas/MIME support.

- [ ] Add failing tests for review capability detection and stalled-render timeout behavior using a controlled fake environment.
- [ ] Run renderer tests and confirm the new cases fail.
- [ ] Add review ownership guard in App, finite stall timeout in the renderer, and capability detection helper.
- [ ] Pass capability state into ExportDialog so unsupported browsers see a disabled Render button and explanation before clicking.
- [ ] Run renderer/UI tests and the full suite.

### Task 4: Resynchronize the viewer after timeline edits and fix fractional timecode

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/lib/timeline.ts`
- Modify: `src/lib/timeline.test.ts`
- Modify: `src/lib/export.ts`
- Modify: `src/lib/export.test.ts`

**Interfaces:**
- `sequenceTimeForSourceFrameAfterEdit(...)` or equivalent helper preserves the edited source frame when possible and clamps to the edited sequence otherwise.
- UI/EDL timecode uses `round(seconds * actualFps)` frames with `round(actualFps)` as the nominal display base.

- [ ] Add failing tests for trimming a clip start while preserving the source frame, reordering around the playhead, and 29.97 NDF timecode at long durations.
- [ ] Run timeline/export tests and confirm failures.
- [ ] Add the minimal mapping helper and call `syncVideoToSequence` after trim, move, undo, and ripple edits.
- [ ] Correct elapsed-time-to-frame conversion in App and EDL generation.
- [ ] Run timeline/export tests and the complete suite.

### Task 5: Correct tutorial/export claims and modal keyboard behavior

**Files:**
- Modify: `src/data/lessons.ts`
- Modify: `src/components/Modal.tsx`
- Modify: `src/components/AppTutorial.ui.test.tsx`
- Modify: `README.md`
- Modify: `package.json`

**Interfaces:**
- Final tutorial copy accurately says JSON and EDL are separate downloads.
- Modal closes on Escape, focuses its dialog/first interactive control on open, and restores focus on close where possible.
- `package.json` declares the Node runtime floor used by CI/tooling; README documents it.

- [ ] Add failing modal Escape/focus regression coverage.
- [ ] Run UI tests and confirm failure.
- [ ] Implement modal keyboard/focus behavior.
- [ ] Correct handoff tutorial/README claims and document Node 22.12+.
- [ ] Add `engines.node` to package.json.
- [ ] Run all tests and production build.

### Task 6: Final verification

**Files:**
- Review all modified files.

- [ ] Run `npm run test:run` through CI and confirm all tests pass.
- [ ] Run `npm run build` through CI and confirm production build passes.
- [ ] Compare branch against `main` and inspect every changed file for accidental scope creep.
- [ ] Open a pull request with the verified fixes and a concise list of any lower-priority follow-ups left outside this pass.
