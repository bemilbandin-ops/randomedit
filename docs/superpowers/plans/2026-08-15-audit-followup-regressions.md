# Remaining Audit Regressions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve the remaining findings from the 30-item Random Edit audit without weakening the regression coverage added in PR #5.

**Architecture:** Extend the existing single-source project model instead of introducing a second editing model. Add small pure helpers for frame snapping, source identity, EDL metadata, and waveform summarization; keep browser-only operations in App adapters; preserve backward compatibility for v1 project JSON through migration while writing v2 projects going forward.

**Tech Stack:** React 19, TypeScript 7, Vite 8, Node 22.12+, Node test runner, Vitest/JSDOM, browser Web Audio, MediaRecorder/canvas APIs, GitHub Actions.

## Global Constraints

- Existing v1 project JSON must remain importable.
- New project exports must preserve the shortcut base preset and stronger source identity metadata.
- Manual edit decisions must snap to the configured sequence frame rate.
- In/Out marks must drive a real edit operation, not remain decorative state.
- Split/Add Edit must operate on the clip under the playhead without requiring an unrelated selection.
- Timeline geometry must remain proportional with many short clips.
- The audio lane must never display invented waveform data.
- CI must use a committed lockfile and `npm ci` once the lockfile is generated.
- Browser-native review recording must have at least one real-browser capability smoke check in CI.

---

### Task 1: Project v2 metadata, shortcut base profile, and source identity

**Files:**
- Modify: `src/types.ts`
- Modify: `src/lib/export.ts`
- Modify: `src/lib/export.test.ts`
- Modify: `src/lib/relink.ts`
- Modify: `src/lib/relink.test.ts`
- Create: `src/lib/mediaIdentity.ts`
- Create: `src/lib/mediaIdentity.test.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- `ProjectState.version` becomes `2` for newly serialized projects while `parseProject` migrates v1 to v2.
- `SourceMeta` gains optional `fileSize`, `fingerprint`, `sourceFps`, `startTimecode`, and `reel` metadata.
- `ProjectState` gains `shortcutBaseProfile: 'premiere' | 'resolve'`.
- `fingerprintMediaFile(file: Blob): Promise<string>` hashes stable sampled bytes plus file size.
- `validateRelinkSource` rejects fingerprint/size mismatches when identity metadata is available and falls back to duration/coverage for legacy v1 projects.

- [ ] Add failing tests for v1 migration, base-profile preservation, identity mismatch, and stable fingerprint output.
- [ ] Run CI and confirm failures are due to missing v2/identity behavior.
- [ ] Implement v2 parsing/migration and sampled media fingerprinting.
- [ ] Wire fingerprint and file size into upload/relink state and project snapshots.
- [ ] Run all tests/build.

### Task 2: Frame-snapped manual editing and selection-independent Add Edit

**Files:**
- Modify: `src/lib/timeline.ts`
- Modify: `src/lib/timeline.test.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/ToolBar.tsx`
- Modify: `src/components/AppTutorial.ui.test.tsx`

**Interfaces:**
- `snapTimeToFrame(time: number, fps: number): number` returns a non-negative frame-aligned time.
- `seekSequence(..., snap = true)` snaps manual seeks; playback time updates remain continuous.
- Mark In/Out, split, and trim consume frame-aligned source/sequence positions.
- Split button is enabled whenever a clip exists under the playhead; it does not depend on selection.

- [ ] Add failing unit/UI regressions for frame snapping and split without selection.
- [ ] Verify RED in CI.
- [ ] Implement shared snapping and remove the Split selection dependency.
- [ ] Verify GREEN in CI.

### Task 3: Make In/Out a real edit range

**Files:**
- Modify: `src/lib/timeline.ts`
- Modify: `src/lib/timeline.test.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/ToolBar.tsx`
- Modify: `src/data/lessons.ts`
- Modify: `src/components/AppTutorial.ui.test.tsx`

**Interfaces:**
- `applySourceRange(clips, clipId, markIn, markOut)` trims the selected/active clip to the valid marked source range when that range intersects the clip.
- Toolbar exposes `Use In/Out` only when a valid range can be applied.
- The mark-range lesson ends by applying the chosen range and requires `range.applied`.

- [ ] Add failing range helper and tutorial regressions.
- [ ] Verify RED.
- [ ] Implement range application and tutorial event wiring.
- [ ] Verify GREEN.

### Task 4: Strengthen EDL source metadata

**Files:**
- Modify: `src/lib/export.ts`
- Modify: `src/lib/export.test.ts`
- Modify: `src/components/SettingsDialog.tsx`
- Modify: `src/App.tsx`
- Modify: `README.md`

**Interfaces:**
- EDL uses a sanitized source reel instead of hard-coded `AX` when supplied.
- Source timecode is offset from `SourceMeta.startTimecode`.
- Project source metadata can be edited for source FPS/start timecode/reel; defaults remain explicit when unavailable from the browser.
- README describes the metadata requirements for conform-oriented handoff rather than claiming browser autodetection.

- [ ] Add failing EDL tests for reel/start-timecode offsets and source metadata persistence.
- [ ] Verify RED.
- [ ] Implement metadata-aware EDL generation and editing UI.
- [ ] Verify GREEN.

### Task 5: Replace fake waveform and remove short-clip distortion

**Files:**
- Create: `src/lib/audioWaveform.ts`
- Create: `src/lib/audioWaveform.test.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/Timeline.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- `summarizeAudioSamples(channelData, bucketCount)` returns normalized real peak magnitudes.
- Upload attempts `AudioContext.decodeAudioData`; failure produces no waveform rather than invented bars.
- Timeline accepts `audioPeaks: number[] | null` and renders real peaks only when available.
- Clip/audio segment CSS removes fixed minimum widths that distort proportional geometry.

- [ ] Add failing waveform summarization tests.
- [ ] Verify RED.
- [ ] Implement decoding adapter + real waveform rendering and remove min-width distortion.
- [ ] Verify GREEN.

### Task 6: Correct Mac shortcut display semantics

**Files:**
- Modify: `src/data/shortcuts.ts`
- Modify: `src/data/shortcuts.test.ts`
- Modify: `src/components/ShortcutDialog.tsx`

**Interfaces:**
- Runtime binding remains browser-key compatible (`Shift+Delete`).
- Reference display can separately say `Shift+Forward Delete` for Premiere on macOS.

- [ ] Add a failing Mac Ripple Delete display regression.
- [ ] Verify RED.
- [ ] Separate runtime binding from human-readable reference display.
- [ ] Verify GREEN.

### Task 7: Deterministic install and real-browser recording smoke test

**Files:**
- Modify: `package.json`
- Create: `package-lock.json` from GitHub Actions npm resolution.
- Create: `scripts/browser-media-smoke.mjs`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- CI uses `npm ci`.
- A Chromium/Chrome smoke script exercises `canvas.captureStream()` and `MediaRecorder` in a real browser process and fails clearly when unavailable.
- The workflow temporarily publishes the generated lockfile as an artifact if needed to bootstrap the committed lockfile, then the bootstrap step is removed.

- [ ] Bootstrap a lockfile through GitHub Actions and download the artifact.
- [ ] Commit the generated lockfile.
- [ ] Add a real-browser MediaRecorder/canvas smoke check using the runner's installed Chrome and a pinned lightweight browser-control dependency if required.
- [ ] Switch CI to `npm ci`.
- [ ] Verify push and pull-request CI on the exact final head.

### Task 8: Final audit reconciliation

**Files:**
- Modify: `README.md`
- Update PR #5 body.

- [ ] Re-check all original 30 findings against the final branch.
- [ ] Run full tests/build/browser smoke CI.
- [ ] Compare branch to main for scope creep.
- [ ] Update PR #5 with an explicit 30/30 resolution table and any environmental caveats that are not product defects.
