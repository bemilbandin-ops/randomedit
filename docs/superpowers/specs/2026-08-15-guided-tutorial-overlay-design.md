# Guided Tutorial Overlay Design

## Goal
Turn the existing tutorial from a text-first checklist into a real onboarding-style guided tour while keeping the existing `Show me where` button.

## Interaction
- Every active tutorial step with a target gets a fixed guided overlay.
- The rest of the app is dimmed while the target stays visually clear and clickable.
- A strong outline and pointer make the target obvious.
- A nearby callout explains the action in plain beginner language.
- Beginner terms can be defined inline, e.g. `Playhead = the vertical line that shows where you are in the video.`
- When the required editor action occurs, the step changes to a visible `Done` state and exposes a `Next` button.
- `Next` advances the tutorial. Editor actions no longer silently jump to the next instruction.
- `Show me where` remains in the coach sidebar and re-scrolls/re-highlights the current target.

## Scope
Use one reusable overlay component for all targeted steps. Keep the existing lesson rail, coach sidebar, shortcuts, progress storage, and Premiere/Resolve transfer notes. Do not block editing controls outside the spotlight at the DOM level; the overlay is visual guidance, not a modal trap.

## Data changes
`TutorialProgress` gains an optional `stepComplete` flag for backward-compatible local storage. Matching tutorial events mark the current step complete. A separate continue action advances the step/lesson and clears the flag.

`TutorialStep` gains optional beginner-facing fields such as `simpleBody` and `term` so professional wording can coexist with plain explanations.

## Visual rules
Use the existing dark neutral palette. No glowing purple/indigo/blue/teal effects. Spotlight styling should use the app's warm neutral/accent colors, solid borders, shadow, and dimming only.

## Testing
Add pure state tests proving that editor actions mark a step complete without advancing and that `Next` advances correctly. Production build must pass after the overlay and copy changes.