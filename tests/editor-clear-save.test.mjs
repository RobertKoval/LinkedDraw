import test from 'node:test';
import assert from 'node:assert/strict';
import { loadNamespace } from './load-namespace.mjs';

let confirmCalls = 0;
class TestFile {
  constructor(parts, name, options) {
    this.parts = parts;
    this.name = name;
    this.type = options.type;
  }
}

const LD = await loadNamespace(['content/editor.js'], {
  File: TestFile,
  confirm: () => {
    confirmCalls += 1;
    return false;
  }
});

LD.i18n = { t: key => key };
LD.log = () => {};
LD.renderer = {
  encodeWithinLimit: async () => ({
    blob: { bytes: 1 },
    extension: 'png',
    mimeType: 'image/png'
  })
};

test('saving an explicitly cleared neutral canvas never asks to overwrite a missing old background', async () => {
  let saveCalls = 0;
  const editor = {
    busy: false,
    destroyed: false,
    backgroundKind: 'neutral',
    backgroundImage: null,
    backgroundError: new Error('old cover unavailable'),
    backgroundOverrideConfirmed: false,
    settings: { includeCurrentBackground: true },
    objects: [],
    modal: { classList: { add: () => {}, remove: () => {} } },
    commitText: () => {},
    updateControls: () => {},
    setBusy(value) { this.busy = value; },
    setStatus(message, kind) { this.status = { message, kind }; },
    onSave: async () => {
      saveCalls += 1;
      return { status: 'success' };
    },
    destroy() { this.destroyed = true; }
  };

  await LD.CoverEditor.prototype.save.call(editor);

  assert.equal(confirmCalls, 0);
  assert.equal(saveCalls, 1);
  assert.equal(editor.destroyed, true);
});

test('saving while the current background is still decoding is blocked', async () => {
  let encodeCalls = 0;
  let saveCalls = 0;
  const editor = {
    busy: false,
    destroyed: false,
    backgroundKind: 'current',
    backgroundPhase: 'loading',
    backgroundImage: null,
    backgroundError: null,
    backgroundOverrideConfirmed: false,
    settings: { includeCurrentBackground: true },
    objects: [],
    modal: { classList: { add: () => {}, remove: () => {} } },
    commitText: () => {},
    updateControls: () => {},
    setBusy(value) { this.busy = value; },
    setStatus(message, kind) { this.status = { message, kind }; },
    onSave: async () => { saveCalls += 1; return { status: 'success' }; },
    destroy() { this.destroyed = true; }
  };
  const previousRenderer = LD.renderer;
  LD.renderer = {
    encodeWithinLimit: async () => {
      encodeCalls += 1;
      return { blob: {}, extension: 'png', mimeType: 'image/png' };
    }
  };

  try {
    await LD.CoverEditor.prototype.save.call(editor);
  } finally {
    LD.renderer = previousRenderer;
  }

  assert.equal(encodeCalls, 0);
  assert.equal(saveCalls, 0);
  assert.equal(editor.busy, false);
});

test('background decode failure becomes unavailable and still requires explicit overwrite confirmation', async () => {
  let saveCalls = 0;
  const previousRenderer = LD.renderer;
  LD.renderer = { loadImage: async () => { throw new Error('decode failed'); } };
  const editor = {
    backgroundDataUrl: 'data:image/png;base64,broken',
    backgroundError: null,
    backgroundPhase: 'loading',
    backgroundImage: null,
    destroyed: false,
    setStatus(message, kind) { this.status = { message, kind }; },
    updateControls() {},
    scheduleRender() {},
    busy: false,
    backgroundKind: 'current',
    backgroundOverrideConfirmed: false,
    settings: { includeCurrentBackground: true },
    objects: [],
    modal: { classList: { add: () => {}, remove: () => {} } },
    commitText: () => {},
    updateControls: () => {},
    setBusy(value) { this.busy = value; },
    onSave: async () => { saveCalls += 1; return { status: 'success' }; },
    destroy() { this.destroyed = true; }
  };

  try {
    await LD.CoverEditor.prototype.loadBackground.call(editor);
    await LD.CoverEditor.prototype.save.call(editor);
  } finally {
    LD.renderer = previousRenderer;
  }

  assert.equal(editor.backgroundPhase, 'unavailable');
  assert.equal(Boolean(editor.backgroundError), true);
  assert.equal(saveCalls, 0);
});

test('a destroyed editor ignores a background decode that resolves later', async () => {
  let resolveImage;
  const previousRenderer = LD.renderer;
  LD.renderer = { loadImage: () => new Promise(resolve => { resolveImage = resolve; }) };
  const editor = {
    backgroundDataUrl: 'data:image/png;base64,slow',
    backgroundError: null,
    backgroundPhase: 'loading',
    backgroundImage: null,
    destroyed: false,
    setStatus() {},
    updateControls() {},
    scheduleRender() {}
  };
  const pending = LD.CoverEditor.prototype.loadBackground.call(editor);
  editor.destroyed = true;
  resolveImage({ id: 'decoded' });
  await pending;
  LD.renderer = previousRenderer;

  assert.equal(editor.backgroundImage, null);
  assert.equal(editor.backgroundPhase, 'loading');
});

test('failed upload displays localized copy instead of adapter detail', async () => {
  let saveCalls = 0;
  const previousRenderer = LD.renderer;
  LD.renderer = {
    encodeWithinLimit: async () => ({ blob: {}, extension: 'png', mimeType: 'image/png' })
  };
  const editor = {
    busy: false,
    destroyed: false,
    backgroundKind: 'neutral',
    backgroundPhase: 'disabled',
    backgroundImage: null,
    settings: { includeCurrentBackground: true },
    objects: [],
    modal: { classList: { add: () => {}, remove: () => {} } },
    commitText: () => {},
    updateControls: () => {},
    setBusy(value) { this.busy = value; },
    setStatus(message, kind) { this.status = { message, kind }; },
    onSave: async () => { saveCalls += 1; return { status: 'failed', detail: 'LinkedIn native dialog accepted the generated cover (dialog-closed).' }; },
    destroy() { this.destroyed = true; }
  };

  try {
    await LD.CoverEditor.prototype.save.call(editor);
  } finally {
    LD.renderer = previousRenderer;
  }

  assert.equal(saveCalls, 1);
  assert.deepEqual(editor.status, { message: 'uploadFailed', kind: 'error' });
});

test('closing without changes during encoding prevents the pending native save', async () => {
  let resolveEncode;
  let saveCalls = 0;
  const previousRenderer = LD.renderer;
  LD.renderer = {
    encodeWithinLimit: () => new Promise(resolve => { resolveEncode = resolve; })
  };
  const editor = {
    busy: false,
    destroyed: false,
    backgroundKind: 'neutral',
    backgroundPhase: 'disabled',
    backgroundImage: null,
    settings: { includeCurrentBackground: true },
    objects: [],
    modal: { classList: { add: () => {}, remove: () => {} } },
    commitText: () => {},
    updateControls: () => {},
    setBusy(value) { this.busy = value; },
    setStatus() {},
    onSave: async () => { saveCalls += 1; return { status: 'success' }; },
    onCancel: () => {},
    destroy() { this.destroyed = true; }
  };

  const pendingSave = LD.CoverEditor.prototype.save.call(editor);
  await Promise.resolve();
  LD.CoverEditor.prototype.cancel.call(editor);
  resolveEncode({ blob: {}, extension: 'png', mimeType: 'image/png' });
  await pendingSave;
  LD.renderer = previousRenderer;

  assert.equal(saveCalls, 0);
});
