import test from 'node:test';
import assert from 'node:assert/strict';
import { loadNamespace } from './load-namespace.mjs';

const LD = await loadNamespace(['content/editor.js']);

test('shortcut handling uses the original Shadow DOM event target', () => {
  const textarea = { tagName: 'TEXTAREA' };
  const shadowHost = { tagName: 'DIV' };
  const event = {
    target: shadowHost,
    composedPath() { return [textarea, shadowHost]; }
  };
  assert.equal(LD.editorInternals.originalEventTarget(event), textarea);
  assert.equal(LD.editorInternals.isEditableTarget(LD.editorInternals.originalEventTarget(event)), true);
});

test('shortcut target falls back to event.target outside Shadow DOM', () => {
  const button = { tagName: 'BUTTON' };
  assert.equal(LD.editorInternals.originalEventTarget({ target: button }), button);
  assert.equal(LD.editorInternals.isEditableTarget(button), false);
});

test('dialog focus wraps from the last control to the first on Tab', () => {
  const first = { id: 'first' };
  const middle = { id: 'middle' };
  const last = { id: 'last' };
  assert.equal(LD.editorInternals.focusWrapTarget([first, middle, last], last, false), first);
  assert.equal(LD.editorInternals.focusWrapTarget([first, middle, last], middle, false), null);
});

test('dialog focus wraps from the first control to the last on Shift+Tab', () => {
  const first = { id: 'first' };
  const last = { id: 'last' };
  assert.equal(LD.editorInternals.focusWrapTarget([first, last], first, true), last);
  assert.equal(LD.editorInternals.focusWrapTarget([], first, true), null);
});
