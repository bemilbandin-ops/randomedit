# Random Edit

Random Edit is a teaching-first browser video editor. Tutorial progress is earned by performing real editing actions inside the workspace; successful actions unlock an explicit Next step.

## What the tutorial teaches

- timeline, playhead and timecode basics
- importing and relinking a local source video
- Space and J/K/L transport habits
- one-frame navigation
- valid In and Out ranges
- Add Edit / Split Clip
- clip selection
- trimming a clip boundary
- ripple delete
- sequence/export settings
- separate project JSON and EDL handoff

The editor also includes marker and basic clip-reordering controls outside the guided curriculum.

The default keyboard preset follows Premiere-style bindings for the core actions. A Resolve preset is included, and every command can be searched and reassigned. Reference columns use the correct Ctrl/Cmd variants for the current platform.

## Requirements

Use Node.js 22.12.0 or newer.

## Run locally

```bash
npm install
npm run dev
```

Open the local Vite URL printed in the terminal.

## Tests

```bash
npm run test:run
```

The suite covers timeline mapping and edit resynchronization, split/trim/ripple operations, project-schema validation and serialization, EDL/timecode output, shortcut normalization/conflicts/platform mappings, tutorial interaction flows, media relinking, modal keyboard behavior, and review-export capability selection.

## Production build

```bash
npm run build
```

## Project format

`*.randomedit.json` stores:

- source file metadata
- ordered sequence clips and their source In/Out boundaries
- markers
- editor/export settings
- keyboard bindings
- tutorial progress

The original media file is intentionally not embedded. When an exported project is reopened, Random Edit asks the learner to relink the source video. Relinking checks that the replacement file's duration matches the saved source closely enough and that it can cover every source range used by the edit.

The project JSON and EDL are separate downloads. The EDL is a compact CMX-style review/handoff file with source and record timecodes for each clip.

## Review video export

Review rendering uses browser-native canvas capture and `MediaRecorder`.

- User-uploaded media can be rendered clip-by-clip.
- Export resolution and fps come from Settings.
- The app checks MediaRecorder, canvas capture and recording-format support before enabling the Render button.
- MP4 is used only when the browser reports an MP4 recording MIME type as supported.
- When MP4 recording is unavailable, the app can fall back to WebM and tells the user that it did so.
- If the browser does not expose an audio track from the media element, the app reports that the exported review is video-only.
- A stalled source render aborts with an error instead of waiting forever.
- The supplied remote example clip is intentionally excluded from review rendering; upload a local clip first.
- Rendering happens in real time because this version relies on browser media playback instead of a native transcoder.

Browser media codec support varies. A file the browser cannot decode cannot be edited or rendered by this browser-only version.

## Scope

This first release deliberately keeps the edit model small: one source video can be split into multiple ordered sequence clips. It does not yet include multi-source bins, layered compositing, transitions, color grading, audio mixing, cloud accounts or collaboration.

In/Out marks are taught and displayed as source-range concepts, but this first version does not yet use the marked range as a separate insert/overwrite command.

The EDL is intended as a compact CMX-style teaching/review handoff. Because the browser app does not read embedded source timecode or source-frame-rate metadata, it should not be treated as a full conform-grade interchange file.
