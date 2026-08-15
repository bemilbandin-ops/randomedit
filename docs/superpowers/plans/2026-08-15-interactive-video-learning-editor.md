# Interactive Video Learning Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based beginner video editor where lessons advance only after real editing actions, with professional terminology/shortcuts, progress persistence, and portable project/review export.

**Architecture:** Vite + React + TypeScript single-page app. Pure editing logic lives in small utility modules; UI components receive state/actions from `App.tsx`. Browser APIs handle local media, persistence, keyboard input, downloads, and optional review-video rendering.

**Tech Stack:** React 19, TypeScript, Vite, Lucide React, Vitest, React Testing Library, CSS.

## Global Constraints

- Dark neutral UI; do not use glowing/luminous purple, indigo, blue, or teal.
- Tutorials must complete from real user actions, not text-only “Next” buttons.
- Start with an example video, then teach upload of the user’s own video.
- Terminology and shortcuts should transfer directly to Premiere Pro / DaVinci Resolve.
- Premiere-compatible preset is the default; Resolve preset and customization are available.
- Persist progress/settings/shortcuts locally; media files themselves are not persisted.
- Export project JSON and CMX3600-style EDL; offer browser-native review-video export when supported.

---

### Task 1: Scaffold, data model, and pure editing logic

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`
- Create: `src/main.tsx`, `src/types.ts`
- Create: `src/lib/timeline.ts`, `src/lib/timeline.test.ts`
- Create: `src/lib/export.ts`, `src/lib/export.test.ts`
- Create: `src/lib/shortcuts.ts`, `src/lib/shortcuts.test.ts`

**Interfaces:**
- `Clip { id, name, sourceStart, sourceEnd }`
- `sequenceDuration(clips): number`
- `sequenceToSourceTime(clips, sequenceTime): { clipIndex, sourceTime }`
- `sourceToSequenceTime(clips, clipIndex, sourceTime): number`
- `splitClip(clips, clipId, sourceTime): Clip[]`
- `trimClip(clips, clipId, edge, sourceTime): Clip[]`
- `rippleDeleteClip(clips, clipId): Clip[]`
- `serializeProject(project): string`
- `parseProject(json): ProjectState`
- `toEdl(project): string`
- `normalizeShortcut(event): string`
- `findShortcutConflict(bindings, commandId, shortcut): ShortcutCommand | undefined`

- [ ] Write failing tests for timeline mapping, split and ripple delete.
- [ ] Run `npm test -- --run` and confirm the timeline tests fail before implementation.
- [ ] Implement the minimal timeline utilities and rerun tests.
- [ ] Add export serialization/validation/EDL tests and implementation.
- [ ] Add shortcut normalization/conflict tests and implementation.
- [ ] Run the complete unit suite.

### Task 2: Curriculum, persistence, and shortcut presets

**Files:**
- Create: `src/data/lessons.ts`
- Create: `src/data/shortcuts.ts`
- Create: `src/hooks/useLocalStorage.ts`
- Create: `src/lib/tutorial.ts`, `src/lib/tutorial.test.ts`

**Interfaces:**
- `Lesson` contains ordered `TutorialStep[]`.
- Each step has `requiredEvent` and optional predicate data.
- `applyTutorialEvent(progress, event): TutorialProgress` advances only when the current step matches.
- Premiere preset uses professional defaults including Space, J/K/L, I/O, Ctrl/Cmd+K Add Edit, Shift+Delete Ripple Delete, M marker, V selection, C razor.
- Resolve preset covers shared transport/marking keys and Resolve-style edit mappings.

- [ ] Write tests proving irrelevant events do not advance a lesson and correct events do.
- [ ] Implement lesson event progression.
- [ ] Add local-storage hook with safe JSON fallback and versioned keys.
- [ ] Add preset command database with categories, descriptions and professional equivalents.
- [ ] Run unit tests.

### Task 3: Editor workspace and interactive teaching UI

**Files:**
- Create: `src/App.tsx`
- Create: `src/components/TopBar.tsx`
- Create: `src/components/LessonRail.tsx`
- Create: `src/components/CoachPanel.tsx`
- Create: `src/components/VideoMonitor.tsx`
- Create: `src/components/Timeline.tsx`
- Create: `src/components/ToolBar.tsx`
- Create: `src/styles.css`

**Behavior:**
- Load the CC0 example video by default.
- Import local video using an object URL and reset the editable source/clip sequence.
- Map sequence playhead time to source video time.
- Play clip ranges in order; at a clip end seek to the next clip start.
- Support Space, J/K/L, frame-step, I/O, split/add-edit, selection, delete/ripple delete, marker, and tool shortcuts.
- Tutorial coach listens to emitted editor events and highlights the relevant control using `data-tutorial-key` attributes.
- Timeline clips are selectable and expose trim-to-playhead start/end controls plus split/delete/reorder actions.

- [ ] Build the app shell and verify it renders without media.
- [ ] Add example media and transport controls.
- [ ] Add upload and sequence initialization.
- [ ] Add timeline seek/select/split/trim/delete/reorder behavior.
- [ ] Add keyboard command dispatch.
- [ ] Wire tutorial events to the editor actions.
- [ ] Apply responsive dark neutral styling with amber/coral/green accents only.

### Task 4: Settings, searchable shortcuts, progress, and project import/export

**Files:**
- Create: `src/components/SettingsDialog.tsx`
- Create: `src/components/ShortcutDialog.tsx`
- Create: `src/components/ProgressDialog.tsx`
- Create: `src/components/ExportDialog.tsx`
- Create: `src/lib/download.ts`

**Behavior:**
- Settings: playback speed, sequence frame rate, export resolution/fps/format.
- Shortcut dialog: search by command/key, switch presets, record a new shortcut, display conflicts, reset command/all.
- Progress dialog: lesson percentage, completed skills, current step, reset option.
- Project export downloads `.randomedit.json` and `.edl`.
- Project import validates schema/version and restores edit metadata, then asks for media relink if the file is unavailable.

- [ ] Implement settings persistence and controls.
- [ ] Implement searchable shortcut database and recorder.
- [ ] Implement progress summary.
- [ ] Implement project JSON/EDL download and JSON import/relink flow.
- [ ] Verify keyboard commands ignore typing inside dialogs/inputs.

### Task 5: Review-video rendering, tests, and production verification

**Files:**
- Create: `src/lib/renderReview.ts`
- Create: `src/lib/renderReview.test.ts`
- Create: `README.md`

**Behavior:**
- Detect `MediaRecorder`, canvas capture and MIME support before enabling render.
- Draw the uploaded video into a canvas at the chosen output size while playing each clip range.
- Capture at chosen fps; include an audio track when the browser exposes one from the media element.
- Prefer requested MP4 only when `MediaRecorder.isTypeSupported` says it is available; otherwise clearly fall back to WebM.
- Disable review render for inaccessible/tainted remote example media and explain that user-uploaded media is required.

- [ ] Write capability-selection tests for MP4/WebM fallback.
- [ ] Implement renderer helpers and export flow.
- [ ] Add README with run/build/test instructions and browser-limit notes.
- [ ] Run `npm test -- --run`.
- [ ] Run `npm run build`.
- [ ] Inspect the final diff for missing user requirements, accidental blue/teal/purple styles, placeholder text, and dead controls.
- [ ] Open a pull request from `feat/interactive-video-learning-editor` to `main` with verification results.