import test from 'node:test';
import assert from 'node:assert/strict';
import { loadNamespace } from './load-namespace.mjs';

const fakeWindow = {
  innerWidth: 1000,
  innerHeight: 800,
  getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1' })
};

const fakeLocation = { hostname: 'www.linkedin.com', pathname: '/in/test/', href: 'https://www.linkedin.com/in/test/' };

const LD = await loadNamespace([
  'shared/constants.js',
  'content/geometry.js',
  'content/banner-detector.js',
  'content/app.js'
], {
  getComputedStyle: fakeWindow.getComputedStyle,
  window: fakeWindow,
  innerWidth: fakeWindow.innerWidth,
  innerHeight: fakeWindow.innerHeight,
  location: fakeLocation,
  document: {},
  setTimeout,
  clearTimeout
});

test('a scan synchronously invalidates the previous profile target after SPA navigation', () => {
  const oldTarget = { editable: true, element: { isConnected: true }, editButton: { isConnected: true } };
  const newTarget = { editable: true, element: { isConnected: true }, editButton: { isConnected: true } };
  const previousDetect = LD.bannerDetector.detect;
  const previousLikely = LD.bannerDetector.isLikelyCoverEditButton;
  const originalHref = fakeLocation.href;
  const originalPathname = fakeLocation.pathname;
  let editorDestroyed = 0;
  const app = {
    destroyed: false,
    lastUrl: originalHref,
    navigationEpoch: 0,
    target: oldTarget,
    editor: { destroy: () => { editorDestroyed += 1; } },
    button: { hidden: false },
    clearScrollTargets: () => {},
    refreshScrollTargets: () => {},
    schedulePosition: () => {},
    hasUsableTarget: LD.LinkedDrawApp.prototype.hasUsableTarget,
    syncNavigation: LD.LinkedDrawApp.prototype.syncNavigation
  };

  try {
    LD.bannerDetector.detect = () => newTarget;
    LD.bannerDetector.isLikelyCoverEditButton = () => true;
    fakeLocation.href = 'https://www.linkedin.com/in/another-profile/';
    fakeLocation.pathname = '/in/another-profile/';

    LD.LinkedDrawApp.prototype.scan.call(app);

    assert.equal(app.navigationEpoch, 1);
    assert.equal(editorDestroyed, 1);
    assert.equal(app.editor, null);
    assert.equal(app.target, newTarget);
  } finally {
    fakeLocation.href = originalHref;
    fakeLocation.pathname = originalPathname;
    LD.bannerDetector.detect = previousDetect;
    LD.bannerDetector.isLikelyCoverEditButton = previousLikely;
  }
});

test('openEditor rejects a concurrent activation while background loading is pending', async () => {
  const previousSettings = LD.settings;
  const previousEditor = LD.CoverEditor;
  const previousI18n = LD.i18n;
  const pendingBackgrounds = [];
  let editorCount = 0;
  LD.settings = { get: async () => ({}) };
  LD.i18n = { t: key => key };
  LD.CoverEditor = function CoverEditor() {
    editorCount += 1;
  };

  const target = {
    editable: true,
    element: { isConnected: true },
    editButton: { isConnected: true }
  };
  const app = {
    editor: null,
    openingEditor: false,
    destroyed: false,
    navigationEpoch: 0,
    button: { hidden: false },
    editorMount: {},
    target: null,
    scan: function () { this.target = target; },
    loadCurrentBackground: () => new Promise(resolve => pendingBackgrounds.push(resolve)),
    showToast: () => {},
    isOpenTargetCurrent: LD.LinkedDrawApp.prototype.isOpenTargetCurrent
  };

  try {
    const firstPromise = LD.LinkedDrawApp.prototype.openEditor.call(app);
    await Promise.resolve();
    await Promise.resolve();
    const secondPromise = LD.LinkedDrawApp.prototype.openEditor.call(app);
    await new Promise(resolve => setTimeout(resolve, 0));
    for (const resolve of pendingBackgrounds) resolve({ dataUrl: null, error: null });

    const [first, second] = await Promise.all([firstPromise, secondPromise]);
    assert.equal(first, true);
    assert.equal(second, false);
    assert.equal(editorCount, 1);
  } finally {
    LD.settings = previousSettings;
    LD.CoverEditor = previousEditor;
    LD.i18n = previousI18n;
  }
});

test('missing current image URL is unavailable instead of an empty successful load', async () => {
  const result = await LD.LinkedDrawApp.prototype.loadCurrentBackground.call({}, { imageUrl: null }, { includeCurrentBackground: true });
  assert.equal(result.phase, 'unavailable');
  assert.equal(Boolean(result.error), true);
});

test('disabled current-background composition opens as a neutral scene', async () => {
  const result = await LD.LinkedDrawApp.prototype.loadCurrentBackground.call({}, { imageUrl: 'https://media.licdn.com/cover.jpg' }, { includeCurrentBackground: false });
  assert.equal(result.phase, 'disabled');
  assert.equal(result.dataUrl, null);
  assert.equal(result.error, null);
});

test('navigation during background loading prevents editor creation', async () => {
  const previousSettings = LD.settings;
  const previousEditor = LD.CoverEditor;
  const previousI18n = LD.i18n;
  const pendingBackgrounds = [];
  let editorCount = 0;
  LD.settings = { get: async () => ({}) };
  LD.i18n = { t: key => key };
  LD.CoverEditor = function CoverEditor() { editorCount += 1; };

  const target = {
    editable: true,
    element: { isConnected: true },
    editButton: { isConnected: true }
  };
  const app = {
    editor: null,
    openingEditor: false,
    destroyed: false,
    navigationEpoch: 0,
    button: { hidden: false },
    editorMount: {},
    target: null,
    scan: function () { this.target = target; },
    loadCurrentBackground: () => new Promise(resolve => pendingBackgrounds.push(resolve)),
    showToast: () => {},
    isOpenTargetCurrent: LD.LinkedDrawApp.prototype.isOpenTargetCurrent
  };

  try {
    const opening = LD.LinkedDrawApp.prototype.openEditor.call(app);
    while (pendingBackgrounds.length === 0) await new Promise(resolve => setTimeout(resolve, 0));
    app.navigationEpoch = 1;
    app.target = null;
    pendingBackgrounds[0]({ phase: 'loading', dataUrl: 'data:image/png;base64,cover', error: null });
    assert.equal(await opening, false);
    assert.equal(editorCount, 0);
  } finally {
    LD.settings = previousSettings;
    LD.CoverEditor = previousEditor;
    LD.i18n = previousI18n;
  }
});

test('successful native completion survives expected LinkedIn target replacement', async () => {
  const previousSettings = LD.settings;
  const previousEditor = LD.CoverEditor;
  const previousI18n = LD.i18n;
  const previousNativeUpload = LD.nativeUpload;
  let editorOptions = null;
  const toasts = [];
  const target = {
    editable: true,
    element: { isConnected: true },
    editButton: { isConnected: true },
    imageUrl: 'https://media.licdn.com/cover.jpg'
  };
  LD.settings = { get: async () => ({ includeCurrentBackground: false }) };
  LD.i18n = { t: key => key };
  LD.CoverEditor = function CoverEditor(options) { editorOptions = options; };
  LD.nativeUpload = {
    deleteCover: async () => {
      target.element.isConnected = false;
      target.editButton.isConnected = false;
      return { status: 'success', reason: 'banner-image-removed' };
    }
  };
  const app = {
    editor: null,
    openingEditor: false,
    destroyed: false,
    navigationEpoch: 0,
    button: { hidden: false },
    editorMount: {},
    target: null,
    scan: function () { this.target = target; },
    loadCurrentBackground: async () => ({ phase: 'disabled', dataUrl: null, error: null }),
    showToast: function (message, kind) { toasts.push({ message, kind }); },
    isOpenTargetCurrent: LD.LinkedDrawApp.prototype.isOpenTargetCurrent,
    isOpenOperationPageCurrent: LD.LinkedDrawApp.prototype.isOpenOperationPageCurrent
  };

  try {
    assert.equal(await LD.LinkedDrawApp.prototype.openEditor.call(app), true);
    const result = await editorOptions.onDelete();
    assert.equal(result.status, 'success');
    assert.equal(app.editor, null);
    assert.deepEqual(toasts, [{ message: 'deleteCoverSuccess', kind: 'success' }]);
  } finally {
    LD.settings = previousSettings;
    LD.CoverEditor = previousEditor;
    LD.i18n = previousI18n;
    LD.nativeUpload = previousNativeUpload;
  }
});
