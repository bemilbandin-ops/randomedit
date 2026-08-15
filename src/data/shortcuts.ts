import type { ShortcutBindings, ShortcutCommand, ShortcutProfile } from '../types.ts';

export interface ShortcutDefinition extends ShortcutCommand {
  premiereMac?: string;
  resolveMac?: string;
}

export const shortcutCommands: ShortcutDefinition[] = [
  { id: 'playPause', name: 'Play / Stop', category: 'Transport', description: 'Toggle sequence playback.', premiere: 'Space', resolve: 'Space' },
  { id: 'shuttleBack', name: 'Shuttle Backward', category: 'Transport', description: 'Play backward. Repeated presses are faster in professional editors.', premiere: 'J', resolve: 'J' },
  { id: 'shuttleStop', name: 'Shuttle Stop', category: 'Transport', description: 'Stop J/K/L shuttle playback.', premiere: 'K', resolve: 'K' },
  { id: 'shuttleForward', name: 'Shuttle Forward', category: 'Transport', description: 'Play forward. Repeated presses are faster in professional editors.', premiere: 'L', resolve: 'L' },
  { id: 'frameBack', name: 'Step Back One Frame', category: 'Transport', description: 'Move the playhead one sequence frame backward.', premiere: 'ArrowLeft', resolve: 'ArrowLeft' },
  { id: 'frameForward', name: 'Step Forward One Frame', category: 'Transport', description: 'Move the playhead one sequence frame forward.', premiere: 'ArrowRight', resolve: 'ArrowRight' },
  { id: 'markIn', name: 'Mark In', category: 'Marking', description: 'Set the start of a source range.', premiere: 'I', resolve: 'I' },
  { id: 'markOut', name: 'Mark Out', category: 'Marking', description: 'Set the end of a source range.', premiere: 'O', resolve: 'O' },
  { id: 'addEdit', name: 'Add Edit / Split Clip', category: 'Editing', description: 'Split the clip under the playhead.', premiere: 'Ctrl+K', premiereMac: 'Cmd+K', resolve: 'Ctrl+B', resolveMac: 'Cmd+B' },
  { id: 'selectionTool', name: 'Selection Tool / Mode', category: 'Tools', description: 'Return to normal clip selection.', premiere: 'V', resolve: 'A' },
  { id: 'razorTool', name: 'Razor / Blade Edit Mode', category: 'Tools', description: 'Choose the cutting tool used to split clips.', premiere: 'C', resolve: 'B' },
  { id: 'rippleDelete', name: 'Ripple Delete', category: 'Editing', description: 'Remove the selected clip and close the gap.', premiere: 'Shift+Delete', premiereMac: 'Shift+Delete', resolve: 'Shift+Backspace', resolveMac: 'Shift+Delete' },
  { id: 'addMarker', name: 'Add Marker', category: 'Marking', description: 'Place a marker at the current timeline time.', premiere: 'M', resolve: 'M' },
  { id: 'undo', name: 'Undo', category: 'General', description: 'Undo the most recent edit action.', premiere: 'Ctrl+Z', premiereMac: 'Cmd+Z', resolve: 'Ctrl+Z', resolveMac: 'Cmd+Z' },
];

export function referenceBinding(
  commandId: string,
  profile: Exclude<ShortcutProfile, 'custom'>,
  isMac: boolean,
): string {
  const command = shortcutCommands.find((item) => item.id === commandId);
  if (!command) return '';
  if (profile === 'premiere') {
    return isMac && command.premiereMac ? command.premiereMac : command.premiere;
  }
  return isMac && command.resolveMac ? command.resolveMac : command.resolve;
}

export function getPresetBindings(profile: Exclude<ShortcutProfile, 'custom'>, isMac: boolean): ShortcutBindings {
  return Object.fromEntries(
    shortcutCommands.map((command) => [command.id, referenceBinding(command.id, profile, isMac)]),
  );
}

export function commandById(id: string): ShortcutDefinition | undefined {
  return shortcutCommands.find((command) => command.id === id);
}
