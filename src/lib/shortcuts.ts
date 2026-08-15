import type { ShortcutBindings } from '../types.ts';

export interface ShortcutKeyEvent {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

const keyAliases: Record<string, string> = {
  ' ': 'Space',
  Escape: 'Esc',
};

function normalizeKey(key: string): string {
  if (keyAliases[key]) return keyAliases[key];
  if (key.length === 1) return key.toUpperCase();
  return key;
}

export function normalizeShortcut(event: ShortcutKeyEvent): string {
  const parts: string[] = [];
  if (event.ctrlKey) parts.push('Ctrl');
  if (event.metaKey) parts.push('Cmd');
  if (event.altKey) parts.push('Alt');
  if (event.shiftKey) parts.push('Shift');

  const key = normalizeKey(event.key);
  if (!['Control', 'Meta', 'Alt', 'Shift'].includes(event.key)) {
    parts.push(key);
  }

  return parts.join('+');
}

export function findShortcutConflict(
  bindings: ShortcutBindings,
  commandId: string,
  shortcut: string,
): string | undefined {
  return Object.entries(bindings).find(
    ([id, binding]) => id !== commandId && binding === shortcut,
  )?.[0];
}
