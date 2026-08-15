# Interactive Video Learning Editor — Design

## Goal
Build a desktop-first browser video editor whose main purpose is teaching beginners the editing habits and vocabulary used in professional tools. Every lesson is completed by performing the action inside the editor, not by reading a static instruction page.

## Product shape
The app uses one workspace with four persistent regions:

1. **Top bar** — project name, lesson progress, shortcut profile, settings, project export, and review-video export.
2. **Lesson rail** — a short curriculum with completion states and the current skill.
3. **Editor workspace** — source/program monitor, transport controls, editing tools, timecode, and a simple single-source timeline with video/audio tracks.
4. **Interactive coach** — the current goal, a short explanation, the equivalent Premiere/Resolve term, the shortcut, and a live completion check tied to editor events.

The dark theme uses neutral charcoal surfaces with warm amber/coral accents and muted green success states. It must not use glowing/luminous purple, indigo, blue, or teal.

## Curriculum
The first curriculum is intentionally small and practical:

1. **Meet the timeline** — start with an example video, play/pause it, click the timeline, and understand playhead/timecode.
2. **Bring your own clip** — upload a local video; lesson completion requires a successful media load.
3. **Navigate like an editor** — use Space, J/K/L, left/right frame stepping, and scrub the playhead.
4. **Mark a usable range** — set In and Out points with I/O and see the selected source range.
5. **Make the first cut** — split at the playhead using the professional “Add Edit / Blade” concept, then select a clip.
6. **Trim and ripple** — change a clip boundary and remove a segment while closing the gap.
7. **Review and hand off** — change export preferences, export a quick review video when the browser supports it, and download a portable project JSON plus CMX3600-style EDL.

Each step emits an app event such as `media.imported`, `transport.played`, `mark.in`, `clip.split`, or `project.exported`. The tutorial only advances after its required event/condition is satisfied. A “Show me” control may focus or pulse the relevant control, but the user still performs the action.

## Professional transfer
Use professional names instead of simplified names where possible: timeline, playhead, source timecode, In/Out, Add Edit, Blade, ripple delete, selection tool, sequence, frame rate, and deliver/export.

The app ships with a Premiere-compatible shortcut preset as the default. Confirmed Adobe defaults used in the first preset include Space for play/stop, I/O for Mark In/Out, Ctrl/Cmd+K for Add Edit, Shift+Delete for Ripple Delete, M for marker, V for Selection, C for Razor, and J/K/L shuttle behavior. A Resolve preset is also available for shared editorial conventions such as Space, J/K/L, I/O and its blade/edit mappings. Users can customize commands and the app warns about conflicts.

## Editing model
Version 1 edits one source media file at a time but allows that source to be split into many sequence clips. A clip stores:

- `id`
- `name`
- `sourceStart`
- `sourceEnd`

The sequence duration is the sum of all clip durations. Timeline time maps to source time through the ordered clip list. During playback, when source playback reaches a clip end, the player seeks to the next clip start. This makes split, trim, delete, reorder and ripple operations real while keeping the browser implementation understandable.

Uploaded video is represented by an object URL and is not persisted across reloads. Persisted project metadata records the expected filename and duration so a reopened project can ask the user to relink the media.

## Data and persistence
No backend is required for the first version.

`localStorage` stores:

- lesson completion and current lesson
- editor preferences
- export preferences
- shortcut preset/custom bindings

The current editing project stays in React state and can be downloaded as JSON. Importing the JSON restores the edit decisions and prompts for media relinking when needed.

## Settings
Settings include:

- playback speed: 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x
- sequence frame rate: 23.976, 24, 25, 29.97, 30, 50, 59.94, 60
- export resolution: source, 720p, 1080p, 1440p, 2160p
- export fps: source, 24, 25, 30, 50, 60
- export format preference: WebM or MP4 when supported by the browser

Changing frame rate updates frame stepping/timecode math but does not transcode the source until export.

## Keyboard shortcut system
A searchable shortcut database lists command name, category, current binding, Premiere equivalent and Resolve equivalent where known. Users can:

- search by command or key
- switch Premiere/Resolve presets
- click a command and press a new key combination
- see and resolve conflicts
- reset one command or the whole preset

Keyboard listeners ignore text inputs and dialogs where typing is expected.

## Project and review export
**Project JSON** contains project metadata, source metadata, clips, markers, tutorial progress, settings, and shortcuts.

**EDL** exports each sequence clip as a numbered video edit with source/record timecodes. This gives a compact review/handoff artifact that uses terminology familiar in professional post workflows.

**Review video** uses browser-native `MediaRecorder` and canvas capture when supported. The renderer plays the sequence clip-by-clip into an offscreen canvas at the selected resolution/fps and records to the requested supported container. If MP4 recording is not available, the UI explains the fallback to WebM rather than pretending MP4 was produced.

## Error handling
- Unsupported/corrupt media shows an inline import error and does not advance the lesson.
- Project import validates version and required fields before replacing editor state.
- Shortcut conflicts are blocked until the user reassigns or clears one binding.
- Review export checks `MediaRecorder`, canvas capture, and MIME support before starting.
- Remote example-video failure leaves the app usable and lets the user jump directly to upload.

## Testing
Use Vitest for pure logic and React Testing Library for key interaction flows.

Minimum coverage:

- timeline time mapping, split, trim and ripple delete
- shortcut normalization/conflict detection
- EDL/project serialization
- lesson event completion rules
- settings persistence defaults

Manual browser verification covers video upload, actual playback, keyboard control, tutorial progression, responsive desktop layout, project download/import, and review export capability detection.

## Scope decisions
Version 1 deliberately excludes multi-source bins, multi-track compositing, transitions/effects, color grading, audio mixing, cloud accounts and collaboration. Those would distract from the core teaching loop and can be added after the beginner editing curriculum is proven.