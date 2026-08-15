# Random Edit

Random Edit is a teaching-first browser video editor. Tutorial progress is earned by performing real editing actions inside the workspace; successful actions unlock an explicit Next step.

## What the tutorial teaches

- timeline, playhead and timecode basics
- importing and relinking a local source video
- Space and J/K/L transport habits
- one-frame navigation
- marking and applying source In/Out ranges
- Add Edit / Split Clip at the playhead
- clip selection
- trimming a clip boundary
- ripple delete
- sequence/export settings and source handoff metadata
- separate project JSON and EDL handoff

The editor also includes marker and basic clip-reordering controls outside the guided curriculum.

The default keyboard preset follows Premiere-style bindings for the core actions. A Resolve preset is included, and every command can be searched and reassigned. Reference columns use the correct platform wording while runtime bindings remain browser-key compatible.

## Requirements

Use Node.js 22.12.0 or newer.

Chrome or Chromium is only required for the real-browser media-recording smoke test. The application itself runs in browsers that support the media features it uses.

## Run locally

```bash
npm ci
npm run dev
```

Open the local Vite URL printed in the terminal.

## Tests

```bash
npm run test:run
npm run test:browser-media
```

The unit/UI suite covers timeline mapping and edit resynchronization, frame-snapped split/trim/seek operations, applied In/Out ranges, project-schema migration and serialization, source relink identity checks, EDL/timecode output, real audio-peak summarization, shortcut normalization/conflicts/platform mappings, tutorial interaction flows, modal keyboard behavior, and review-export capability selection.

`npm run test:browser-media` launches local headless Chrome/Chromium and verifies that `canvas.captureStream()` plus `MediaRecorder` can produce a non-empty recording. CI runs both test groups before the production build.

## Production build

```bash
npm run build
```

## Project format

New `*.randomedit.json` exports use project format version 2 and store:

- source name, duration and dimensions
- source file size and a sampled SHA-256 fingerprint for relink identity
- optional/confirmed source frame rate, source start timecode and reel name for EDL handoff
- ordered sequence clips and their source In/Out boundaries
- markers
- editor/export settings
- keyboard profile, custom bindings and the base preset used by per-command Reset
- tutorial progress

Version 1 project JSON remains importable and is migrated in memory to the current model. Older projects did not contain a fingerprint or shortcut base preset, so legacy relinking falls back to source-duration/range checks and the reset preset is inferred from the saved shortcut profile.

The original media file is intentionally not embedded. For newly exported local-source projects, relinking checks the saved fingerprint/file size as well as duration and source-range coverage. A renamed copy of the same media can relink; a different same-duration video is rejected when identity metadata is available.

The project JSON and EDL are separate downloads.

## EDL handoff

The EDL is a compact CMX-style non-drop-frame handoff file. It uses the saved source reel, source start timecode and source frame rate for source-side timecodes, and the sequence frame rate for record-side timing.

Browsers do not reliably expose embedded production timecode, reel names or source frame-rate metadata from arbitrary video files. Random Edit therefore initializes explicit defaults and lets you confirm/correct those source values in Settings before exporting an EDL. For a professional conform, verify those values against the original camera/transcode metadata and the target NLE.

## Source range and frame accuracy

Manual timeline seeks and edit points are snapped to the configured sequence frame rate. Split, trim, markers and applied In/Out ranges therefore land on the same frame grid used by frame stepping and the displayed sequence timecode.

Mark In and Mark Out now create a real source range. `Use In/Out` trims the clip under the playhead to the valid marked range, so the tutorial no longer teaches marks as decorative state.

## Audio waveform

For a local upload, Random Edit asks the browser to decode the media audio with Web Audio and summarizes the actual channel samples into waveform peaks. If the browser cannot decode an audio track, the A1 lane stays empty instead of inventing a decorative waveform.

## Review video export

Review rendering uses browser-native canvas capture and `MediaRecorder`.

- User-uploaded media can be rendered clip-by-clip.
- Export resolution and fps come from Settings.
- The app checks MediaRecorder, canvas capture and recording-format support before enabling the Render button.
- MP4 is used only when the browser reports an MP4 recording MIME type as supported.
- When MP4 recording is unavailable, the app can fall back to WebM and tells the user that it did so.
- If the browser does not expose an audio track from the media element, the app reports that the exported review is video-only rather than silently implying that audio was preserved.
- A stalled source render aborts with an error instead of waiting forever.
- The supplied remote example clip is intentionally excluded from review rendering; upload a local clip first.
- Rendering happens in real time because this version relies on browser media playback instead of a native transcoder.
- CI includes a real headless-Chrome canvas/MediaRecorder recording smoke test in addition to JSDOM/unit coverage.

Browser media codec support varies. A file the browser cannot decode cannot be edited or rendered by this browser-only version.

## Scope

This release deliberately keeps the edit model small: one source video can be split into multiple ordered sequence clips. It does not yet include multi-source bins, layered compositing, transitions, color grading, audio mixing, cloud accounts or collaboration.

The source-identity fingerprint is sampled rather than a hash of every byte so large local videos do not need to be read completely just to save/relink a project. It is intended to prevent accidental wrong-source relinking, not to provide a cryptographic chain-of-custody system.
