import assert from 'node:assert/strict';
import test from 'node:test';
import * as shortcuts from './shortcuts.ts';
import { referenceBinding } from './shortcuts.ts';

test('uses Mac reference bindings when the preset defines them', () => {
  assert.equal(referenceBinding('addEdit', 'premiere', true), 'Cmd+K');
  assert.equal(referenceBinding('addEdit', 'resolve', true), 'Cmd+B');
  assert.equal(referenceBinding('undo', 'premiere', true), 'Cmd+Z');
});

test('keeps Windows reference bindings on non-Mac platforms', () => {
  assert.equal(referenceBinding('addEdit', 'premiere', false), 'Ctrl+K');
  assert.equal(referenceBinding('addEdit', 'resolve', false), 'Ctrl+B');
});

test('shows Premiere macOS Ripple Delete as Shift plus Forward Delete without breaking runtime key matching', () => {
  const referenceDisplayBinding = (shortcuts as Record<string, unknown>).referenceDisplayBinding;
  assert.equal(typeof referenceDisplayBinding, 'function');
  const display = referenceDisplayBinding as (commandId: string, profile: 'premiere' | 'resolve', isMac: boolean) => string;
  assert.equal(referenceBinding('rippleDelete', 'premiere', true), 'Shift+Delete');
  assert.equal(display('rippleDelete', 'premiere', true), 'Shift+Forward Delete');
});
