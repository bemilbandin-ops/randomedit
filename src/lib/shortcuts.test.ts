import assert from 'node:assert/strict';
import test from 'node:test';
import { findShortcutConflict, normalizeShortcut } from './shortcuts.ts';
import type { ShortcutBindings } from '../types.ts';

test('normalizes common key combinations', () => {
  assert.equal(normalizeShortcut({ key: 'k', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false }), 'Ctrl+K');
  assert.equal(normalizeShortcut({ key: ' ', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false }), 'Space');
  assert.equal(normalizeShortcut({ key: 'ArrowLeft', ctrlKey: false, metaKey: false, altKey: false, shiftKey: true }), 'Shift+ArrowLeft');
});

test('finds an existing binding owned by another command', () => {
  const bindings: ShortcutBindings = {
    addEdit: 'Ctrl+K',
    playPause: 'Space',
  };
  assert.equal(findShortcutConflict(bindings, 'playPause', 'Ctrl+K'), 'addEdit');
});

test('does not report the command being edited as a conflict', () => {
  const bindings: ShortcutBindings = { addEdit: 'Ctrl+K' };
  assert.equal(findShortcutConflict(bindings, 'addEdit', 'Ctrl+K'), undefined);
});
