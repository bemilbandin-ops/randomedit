import { describe, expect, it } from 'vitest';
import { findShortcutConflict, normalizeShortcut } from './shortcuts';
import type { ShortcutBindings } from '../types';

describe('shortcut helpers', () => {
  it('normalizes common key combinations', () => {
    expect(normalizeShortcut({ key: 'k', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false })).toBe('Ctrl+K');
    expect(normalizeShortcut({ key: ' ', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false })).toBe('Space');
    expect(normalizeShortcut({ key: 'ArrowLeft', ctrlKey: false, metaKey: false, altKey: false, shiftKey: true })).toBe('Shift+ArrowLeft');
  });

  it('finds an existing binding owned by another command', () => {
    const bindings: ShortcutBindings = {
      addEdit: 'Ctrl+K',
      playPause: 'Space',
    };
    expect(findShortcutConflict(bindings, 'playPause', 'Ctrl+K')).toBe('addEdit');
  });

  it('does not report the command being edited as a conflict', () => {
    const bindings: ShortcutBindings = { addEdit: 'Ctrl+K' };
    expect(findShortcutConflict(bindings, 'addEdit', 'Ctrl+K')).toBeUndefined();
  });
});
