import test from 'node:test';
import assert from 'node:assert/strict';
import { loadNamespace } from './load-namespace.mjs';

const LD = await loadNamespace(['content/history.js', 'content/editor.js']);

function editorWithScene(scene) {
  return {
    busy: false,
    backgroundKind: scene.background.kind,
    objects: scene.objects,
    history: LD.history.create(scene, 20),
    commitText: () => {},
    updateControls: () => {},
    scheduleRender: () => {}
  };
}

test('Clear resets the local bitmap and objects while Undo restores the complete scene', () => {
  const original = LD.editorInternals.createScene('current', [
    { type: 'pen', points: [{ x: 12, y: 18 }], color: '#ff3b30', width: 8 }
  ]);
  const editor = editorWithScene(original);

  LD.CoverEditor.prototype.handleAction.call(editor, 'clear');
  assert.equal(editor.backgroundKind, 'neutral');
  assert.equal(editor.objects.length, 0);

  LD.CoverEditor.prototype.handleAction.call(editor, 'undo');
  assert.equal(editor.backgroundKind, 'current');
  assert.equal(JSON.stringify(editor.objects), JSON.stringify(original.objects));
});

test('Clear stays available for a current bitmap and disables only on an empty neutral canvas', () => {
  const clearButton = { disabled: null };
  const undoButton = { disabled: null };
  const redoButton = { disabled: null };
  const safeButton = { setAttribute: () => {} };
  const fontControl = { hidden: false };
  const modal = {
    querySelectorAll: () => [],
    querySelector: selector => ({
      '[data-action="undo"]': undoButton,
      '[data-action="redo"]': redoButton,
      '[data-action="clear"]': clearButton,
      '[data-action="safe-areas"]': safeButton,
      '.ld-font-control': fontControl
    })[selector]
  };
  const editor = {
    modal,
    tool: 'pen',
    busy: false,
    showSafeAreas: true,
    objects: [],
    backgroundKind: 'current',
    history: LD.history.create(LD.editorInternals.createScene('current', []), 20),
    saveButton: { disabled: null }
  };

  LD.CoverEditor.prototype.updateControls.call(editor);
  assert.equal(clearButton.disabled, false);

  editor.backgroundKind = 'neutral';
  LD.CoverEditor.prototype.updateControls.call(editor);
  assert.equal(clearButton.disabled, true);
});

test('neutral scene never passes the decoded LinkedIn bitmap to rendering or export', () => {
  const bitmap = { id: 'decoded-linkedin-cover' };
  assert.equal(LD.editorInternals.backgroundForScene('current', bitmap), bitmap);
  assert.equal(LD.editorInternals.backgroundForScene('neutral', bitmap), null);
});

test('pointer cancellation discards the transient stroke instead of committing it', () => {
  let rendered = 0;
  let releasedPointer = null;
  const editor = {
    activePointerId: 7,
    transient: { type: 'pen', points: [{ x: 10, y: 10 }, { x: 20, y: 20 }], color: '#000000', width: 4 },
    objects: [],
    canvas: { releasePointerCapture: pointerId => { releasedPointer = pointerId; } },
    scheduleRender: () => { rendered += 1; }
  };
  const event = {
    pointerId: 7,
    preventDefault() {},
    stopPropagation() {}
  };

  LD.CoverEditor.prototype.handlePointerCancel.call(editor, event);

  assert.equal(editor.activePointerId, null);
  assert.equal(editor.transient, null);
  assert.equal(editor.objects.length, 0);
  assert.equal(releasedPointer, 7);
  assert.equal(rendered, 1);
});

test('Save is disabled only while a current background is loading', () => {
  const saveButton = { disabled: null };
  const controls = {
    '[data-action="undo"]': { disabled: null },
    '[data-action="redo"]': { disabled: null },
    '[data-action="clear"]': { disabled: null },
    '[data-action="safe-areas"]': { setAttribute: () => {} },
    '.ld-font-control': { hidden: false },
    '[data-action="save"]': saveButton
  };
  const editor = {
    modal: {
      querySelectorAll: () => [],
      querySelector: selector => controls[selector]
    },
    tool: 'pen',
    busy: false,
    showSafeAreas: true,
    objects: [],
    backgroundKind: 'current',
    backgroundPhase: 'loading',
    history: LD.history.create(LD.editorInternals.createScene('current', []), 20),
    saveButton
  };

  LD.CoverEditor.prototype.updateControls.call(editor);
  assert.equal(saveButton.disabled, true);

  editor.backgroundPhase = 'unavailable';
  LD.CoverEditor.prototype.updateControls.call(editor);
  assert.equal(saveButton.disabled, false);

  editor.backgroundKind = 'neutral';
  editor.backgroundPhase = 'disabled';
  LD.CoverEditor.prototype.updateControls.call(editor);
  assert.equal(saveButton.disabled, false);
});
