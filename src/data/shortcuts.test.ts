import assert from 'node:assert/strict';
import test from 'node:test';
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
