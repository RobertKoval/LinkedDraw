import test from 'node:test';
import assert from 'node:assert/strict';
import { loadNamespace } from './load-namespace.mjs';

const LD = await loadNamespace(['content/editor.js'], {
  confirm: () => true
});
LD.i18n = { t: key => key };

function deleteEditor(result) {
  const classes = new Set();
  return {
    destroyed: false,
    busy: false,
    modal: {
      classList: {
        add: value => classes.add(value),
        remove: value => classes.delete(value)
      }
    },
    onDelete: async () => result,
    setBusy(value) { this.busy = value; },
    setStatus(message, kind) { this.status = { message, kind }; },
    destroy() { this.destroyed = true; },
    classes
  };
}

test('confirmed native deletion closes LinkedDraw only after a successful native result', async () => {
  const editor = deleteEditor({ status: 'success', detail: 'deleted' });
  await LD.CoverEditor.prototype.deleteCover.call(editor);

  assert.equal(editor.destroyed, true);
  assert.equal(editor.classes.has('ld-suspended'), true);
});

test('failed native deletion restores the editor with a localized error instead of internal English detail', async () => {
  const editor = deleteEditor({ status: 'failed', detail: 'Delete action was not found' });
  await LD.CoverEditor.prototype.deleteCover.call(editor);

  assert.equal(editor.destroyed, false);
  assert.equal(editor.busy, false);
  assert.equal(editor.classes.has('ld-suspended'), false);
  assert.deepEqual(editor.status, { message: 'deleteCoverFailed', kind: 'error' });
});

test('Close without changes destroys only the editor and never saves or deletes', () => {
  let cancelCalls = 0;
  let saveCalls = 0;
  let deleteCalls = 0;
  const order = [];
  const editor = {
    destroyed: false,
    onCancel: () => { cancelCalls += 1; order.push('controller'); },
    onSave: () => { saveCalls += 1; },
    onDelete: () => { deleteCalls += 1; },
    destroy(restoreFocus) { this.destroyed = true; order.push(restoreFocus ? 'destroy-focus' : 'destroy'); }
  };

  LD.CoverEditor.prototype.cancel.call(editor);

  assert.equal(editor.destroyed, true);
  assert.equal(cancelCalls, 1);
  assert.equal(saveCalls, 0);
  assert.equal(deleteCalls, 0);
  assert.deepEqual(order, ['controller', 'destroy-focus']);
});
