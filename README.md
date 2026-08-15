# Random Edit

Random Edit is a teaching-first browser video editor. The tutorial does not advance because the learner clicked “Next”; it advances when the learner performs the real editing action inside the workspace.

## What the first version teaches

- timeline, playhead and timecode basics
- importing a local source video
- Space and J/K/L transport habits
- one-frame navigation
- In and Out points
- Add Edit / Split Clip
- clip selection
- trimming a clip boundary
- ripple delete
- markers and basic clip reordering
- sequence/export settings
- project JSON and EDL handoff

The default keyboard preset follows Premiere-style bindings for the core actions. A Resolve preset is included, and every command can be searched and reassigned.

## Run locally

```bash
npm install
npm run dev
```

Open the local Vite URL printed in the terminal.

## Tests

The pure editing modules use Node's built-in test runner, so they do not need a browser DOM.

```bash
npm run test:run
```

The suite covers timeline mapping, split/trim/ripple operations, project serialization, EDL output, shortcut normalization/conflicts, tutorial progression, and review-format fallback.

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

The original media file is intentionally not embedded. When an exported project is reopened, Random Edit asks the learner to relink the source video.

The EDL export is a compact CMX-style review/handoff file with source and record timecodes for each clip.

## Review video export

Review rendering uses browser-native canvas capture and `MediaRecorder`.

- User-uploaded media can be rendered clip-by-clip.
- Export resolution and fps come from Settings.
- MP4 is only used when the browser reports an MP4 recording MIME type as supported.
- When MP4 recording is unavailable, the app can fall back to WebM and tells the user that it did so.
- The supplied remote example clip is intentionally excluded from review rendering; upload a local clip first.
- Rendering happens in real time because this version relies on browser media playback instead of a native transcoder.

Browser media codec support varies. A file the browser cannot decode cannot be edited or rendered by this browser-only version.

## Scope

This first release deliberately keeps the edit model small: one source video can be split into multiple ordered sequence clips. It does not yet include multi-source bins, layered compositing, transitions, color grading, audio mixing, cloud accounts or collaboration.

That constraint keeps the lessons focused on editing concepts that transfer cleanly into full professional NLEs.
