import test from 'node:test';
import assert from 'node:assert/strict';
import { loadNamespace } from './load-namespace.mjs';

const menuLink = {
  tagName: 'A',
  disabled: false,
  textContent: 'Add cover image',
  getAttribute() { return null; },
  getBoundingClientRect() { return { left: 100, top: 100, width: 240, height: 48 }; },
  closest() { return null; }
};
const uploadMenu = {
  getBoundingClientRect() { return { left: 80, top: 80, width: 360, height: 180 }; },
  querySelectorAll(selector) {
    if (selector === 'button, [role="button"], a') return [menuLink];
    return [];
  }
};
const fakeDocument = {
  querySelectorAll(selector) {
    if (selector === '[role="menu"]' || selector === '[role="listbox"]') return [uploadMenu];
    return [];
  }
};

const LD = await loadNamespace([
  'shared/constants.js',
  'content/geometry.js',
  'content/banner-detector.js',
  'content/native-upload.js'
], {
  getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1', backgroundImage: 'none' }),
  document: fakeDocument,
  setTimeout,
  clearTimeout
});

function fakeFileInput(overrides = {}) {
  return {
    disabled: false,
    multiple: false,
    name: 'cover-image',
    id: 'cover-file',
    getAttribute(name) {
      if (name === 'accept') return 'image/png,image/jpeg';
      return null;
    },
    closest() { return {}; },
    ...overrides
  };
}

function fakeButton({ text = 'Save', disabled = false, inDialog = true, rect = { left: 650, top: 480, width: 90, height: 36 } } = {}) {
  const dialog = {
    getBoundingClientRect() {
      return { left: 200, top: 100, width: 600, height: 450 };
    }
  };
  return {
    tagName: 'BUTTON',
    disabled,
    textContent: text,
    getAttribute(name) {
      if (name === 'aria-label' || name === 'title') return '';
      if (name === 'aria-disabled') return disabled ? 'true' : 'false';
      return null;
    },
    getBoundingClientRect() { return rect; },
    closest() { return inDialog ? dialog : null; },
    _dialog: dialog
  };
}

function fakeAction({ text, tagName = 'DIV', role = 'button', disabled = false, click = () => {} }) {
  return {
    tagName,
    disabled,
    textContent: text,
    click,
    getAttribute(name) {
      if (name === 'role') return role;
      if (name === 'aria-disabled') return disabled ? 'true' : 'false';
      if (name === 'aria-label' || name === 'title') return '';
      return null;
    },
    getBoundingClientRect() { return { left: 100, top: 100, width: 180, height: 42 }; },
    closest() { return null; },
    scrollIntoView() {}
  };
}

function fakeSurface(text, actions) {
  return {
    textContent: text,
    getAttribute() { return ''; },
    getBoundingClientRect() { return { left: 80, top: 80, width: 500, height: 300 }; },
    querySelectorAll(selector) {
      if (selector === 'button, [role="button"], a') return actions;
      return [];
    }
  };
}

test('native upload prefers a new image input inside the native dialog', () => {
  const input = fakeFileInput();
  const initial = new Set();
  assert(LD.nativeUpload.scoreFileInput(input, initial) >= 150);
});

test('native upload recognizes localized confirm actions and rejects cancel', () => {
  const save = fakeButton({ text: 'Зберегти' });
  const saveScore = LD.nativeUpload.scoreActionButton(save, 'confirm', save._dialog);
  const cancel = fakeButton({ text: 'Скасувати' });
  const cancelScore = LD.nativeUpload.scoreActionButton(cancel, 'confirm', cancel._dialog);
  assert(saveScore >= 90);
  assert.equal(cancelScore, -1000);
});

test('native upload finds LinkedIn menu link that opens the single-photo dialog', () => {
  assert.equal(LD.nativeUpload.findDialogAction('upload'), menuLink);
});

test('disabled native controls are never selected', () => {
  const button = fakeButton({ text: 'Save', disabled: true });
  assert.equal(LD.nativeUpload.scoreActionButton(button, 'confirm', button._dialog), -1000);
  assert.equal(LD.nativeUpload.scoreFileInput(fakeFileInput({ disabled: true }), new Set()), -1000);
});

test('native upload rejects pre-existing generic and avatar inputs for a cover session', () => {
  const generic = fakeFileInput({ name: 'attachment', id: 'attachment-file' });
  const avatar = fakeFileInput({ name: 'profile-photo', id: 'avatar-upload' });
  const coverDialog = fakeSurface('Cover photo Change photo', []);
  const unrelatedDialog = fakeSurface('Post attachments', []);
  const session = { initialInputs: new Set([generic, avatar]), surface: coverDialog };
  generic.closest = () => unrelatedDialog;
  avatar.closest = () => unrelatedDialog;

  assert.equal(LD.nativeUpload.scoreFileInput(generic, session.initialInputs, session), -1000);
  assert.equal(LD.nativeUpload.scoreFileInput(avatar, session.initialInputs, session), -1000);
});

test('native upload rejects a pre-existing cover input outside the active cover surface', () => {
  const staleCover = fakeFileInput({ name: 'cover-image', id: 'cover-file' });
  const coverDialog = fakeSurface('Cover photo Change photo', []);
  staleCover.closest = () => null;
  const session = { initialInputs: new Set([staleCover]), surface: coverDialog };

  assert.equal(LD.nativeUpload.scoreFileInput(staleCover, session.initialInputs, session), -1000);
});

test('native upload accepts a new input in the bound cover dialog and rejects a new unrelated-dialog input', () => {
  const coverDialog = fakeSurface('Cover photo Change photo', []);
  const unrelatedDialog = fakeSurface('Post attachments', []);
  const coverInput = fakeFileInput({ name: 'upload' });
  const unrelatedInput = fakeFileInput({ name: 'upload', id: 'attachment-file' });
  coverInput.closest = () => coverDialog;
  unrelatedInput.closest = () => unrelatedDialog;
  const session = { initialInputs: new Set(), surface: coverDialog };

  assert(LD.nativeUpload.scoreFileInput(coverInput, session.initialInputs, session) >= 20);
  assert.equal(LD.nativeUpload.scoreFileInput(unrelatedInput, session.initialInputs, session), -1000);
});

test('native upload rejects a detached file input until a cover action explicitly arms it', () => {
  const coverDialog = fakeSurface('Add a cover image Upload single photo', []);
  const detachedInput = fakeFileInput({ name: '', id: '' });
  detachedInput.closest = () => null;
  const session = {
    initialInputs: new Set(),
    surface: coverDialog,
    detachedInputAuthorization: { phase: 'inactive' }
  };

  assert.equal(LD.nativeUpload.scoreFileInput(detachedInput, session.initialInputs, session), -1000);
});

test('native upload accepts only the detached input created by the current cover action', () => {
  const coverDialog = fakeSurface('Add a cover image Upload single photo', []);
  const staleInput = fakeFileInput({ name: '', id: '' });
  const currentInput = fakeFileInput({ name: '', id: '' });
  staleInput.closest = () => null;
  currentInput.closest = () => null;
  const initialInputs = new Set();
  const actionBaseline = new Set([staleInput]);
  const session = {
    initialInputs,
    surface: coverDialog,
    detachedInputAuthorization: { phase: 'armed', baseline: actionBaseline }
  };

  assert.equal(LD.nativeUpload.scoreFileInput(staleInput, initialInputs, session), -1000);
  assert(LD.nativeUpload.scoreFileInput(currentInput, initialInputs, session) >= 20);
});

async function runDetachedUploadFlow(flow) {
  let now = 0;
  let state = 'page';
  const clicks = [];
  const dispatched = [];
  const staleInput = fakeFileInput({ name: '', id: '' });
  const currentInput = fakeFileInput({
    name: '',
    id: '',
    dispatchEvent(event) { dispatched.push(event.type); }
  });
  staleInput.closest = () => null;
  currentInput.closest = () => null;
  const inputs = [staleInput];

  const uploadSingle = fakeAction({
    text: 'Upload single photo',
    click: () => {
      clicks.push('upload-single');
      inputs.push(currentInput);
      state = 'picker-with-input';
    }
  });
  const picker = fakeSurface('Add a cover image Upload single photo', [uploadSingle]);
  const changePhoto = fakeAction({
    text: 'Change photo',
    click: () => { clicks.push('change-photo'); state = 'picker'; }
  });
  const editor = fakeSurface('Cover photo Change photo Delete', [changePhoto]);
  const editCover = fakeAction({
    text: 'Edit cover image',
    tagName: 'A',
    role: '',
    click: () => { clicks.push('edit-cover'); state = 'editor'; }
  });
  const menu = fakeSurface('Edit cover image Create a slideshow', [editCover]);
  const editButton = fakeAction({
    text: 'Edit background image',
    click: () => {
      clicks.push('edit-button');
      if (flow === 'existing-cover') state = 'menu';
      else if (flow === 'direct-input') {
        inputs.push(currentInput);
        state = 'direct-input';
      } else state = 'picker';
    }
  });

  const uploadDocument = {
    querySelectorAll(selector) {
      if (selector === 'input[type="file"]') return inputs;
      if (selector === '[role="menu"]' || selector === '[role="listbox"]') return state === 'menu' ? [menu] : [];
      if (selector === 'dialog[open]' || selector === '[role="dialog"]' || selector === '.artdeco-modal' || selector === '[data-test-modal]') {
        if (state === 'editor') return [editor];
        if (state === 'picker' || state === 'picker-with-input') return [picker];
      }
      return [];
    }
  };
  class TestEvent {
    constructor(type) { this.type = type; }
  }
  class TestDataTransfer {
    constructor() {
      this.files = [];
      this.items = { add: file => { this.files.push(file); } };
    }
  }
  class TestInput {}
  const FlowLD = await loadNamespace([
    'shared/constants.js',
    'content/geometry.js',
    'content/banner-detector.js',
    'content/native-upload.js'
  ], {
    Date: { now: () => { now += 1000; return now; } },
    DataTransfer: TestDataTransfer,
    Event: TestEvent,
    HTMLInputElement: TestInput,
    getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1', backgroundImage: 'none' }),
    document: uploadDocument,
    setTimeout: callback => { callback(); return 1; },
    clearTimeout() {}
  });
  const target = {
    editButton,
    imageUrl: flow === 'existing-cover' ? 'https://media.licdn.com/cover-old.jpg' : null
  };
  FlowLD.bannerDetector.detect = () => target;

  const result = await FlowLD.nativeUpload.uploadCover(
    { name: 'linked-draw.png' },
    target,
    { autoConfirmUpload: false }
  );

  return { result, clicks, staleInput, currentInput, dispatched };
}

test('uploadCover hands a detached Safari input off for a profile without a cover', async () => {
  const flow = await runDetachedUploadFlow('no-cover');

  assert.equal(flow.result.status, 'handed-off');
  assert.equal(flow.result.reason, 'native-confirmation-pending');
  assert.deepEqual(flow.clicks, ['edit-button', 'upload-single']);
  assert.equal(flow.staleInput.files, undefined);
  assert.equal(flow.currentInput.files.length, 1);
  assert.deepEqual(flow.dispatched, ['input', 'change']);
});

test('uploadCover replaces an existing cover through Edit, Change photo, and Upload', async () => {
  const flow = await runDetachedUploadFlow('existing-cover');

  assert.equal(flow.result.status, 'handed-off');
  assert.equal(flow.result.reason, 'native-confirmation-pending');
  assert.deepEqual(flow.clicks, ['edit-button', 'edit-cover', 'change-photo', 'upload-single']);
  assert.equal(flow.staleInput.files, undefined);
  assert.equal(flow.currentInput.files.length, 1);
});

test('uploadCover authorizes a detached input created directly by the initial native edit action', async () => {
  const flow = await runDetachedUploadFlow('direct-input');

  assert.equal(flow.result.status, 'handed-off');
  assert.equal(flow.result.reason, 'native-confirmation-pending');
  assert.deepEqual(flow.clicks, ['edit-button']);
  assert.equal(flow.staleInput.files, undefined);
  assert.equal(flow.currentInput.files.length, 1);
});

test('native delete finds localized cover-editor and Delete actions only in a cover surface', () => {
  const editEnglish = fakeAction({ text: 'Edit cover image', tagName: 'A', role: '' });
  const editUkrainian = fakeAction({ text: 'Редагувати обкладинку', tagName: 'A', role: '' });
  assert.equal(LD.nativeUpload.findCoverEditorAction(fakeSurface('Cover image', [editEnglish])), editEnglish);
  assert.equal(LD.nativeUpload.findCoverEditorAction(fakeSurface('Обкладинка', [editUkrainian])), editUkrainian);

  const deleteEnglish = fakeAction({ text: 'Delete' });
  const deleteUkrainian = fakeAction({ text: 'Видалити' });
  assert.equal(LD.nativeUpload.findDeleteAction(fakeSurface('Cover photo Edit Change photo Delete', [deleteEnglish])), deleteEnglish);
  assert.equal(LD.nativeUpload.findDeleteAction(fakeSurface('Обкладинка Редагувати Видалити', [deleteUkrainian])), deleteUkrainian);
  assert.equal(LD.nativeUpload.findDeleteAction(fakeSurface('Delete conversation', [deleteEnglish])), null);
});

async function runDeleteFlow(afterDeleteState) {
  let state = 'page';
  const clicks = [];
  const editButton = fakeAction({
    text: '',
    click: () => { clicks.push('edit-button'); state = 'menu'; }
  });
  const editCover = fakeAction({
    text: 'Edit cover image',
    tagName: 'A',
    role: '',
    click: () => { clicks.push('edit-cover'); state = 'dialog'; }
  });
  const deleteAction = fakeAction({
    text: 'Delete',
    click: () => { clicks.push('delete'); state = 'deleted'; }
  });
  const menu = fakeSurface('Edit cover image Create a slideshow', [editCover]);
  const dialog = fakeSurface('Cover photo Edit Change photo Delete', [deleteAction]);
  const deleteDocument = {
    querySelector() { return null; },
    querySelectorAll(selector) {
      if ((selector === '[role="menu"]' || selector === '[role="listbox"]') && state === 'menu') return [menu];
      if ((selector === 'dialog[open]' || selector === '[role="dialog"]' || selector === '.artdeco-modal' || selector === '[data-test-modal]') && state === 'dialog') return [dialog];
      return [];
    }
  };
  const DeleteLD = await loadNamespace([
    'shared/constants.js',
    'content/geometry.js',
    'content/banner-detector.js',
    'content/native-upload.js'
  ], {
    getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1', backgroundImage: 'none' }),
    document: deleteDocument,
    setTimeout,
    clearTimeout
  });

  const target = { editable: true, editButton, imageUrl: 'https://media.licdn.com/cover.jpg' };
  DeleteLD.bannerDetector.detect = () => {
    if (state !== 'deleted') return target;
    if (afterDeleteState === 'removed-image') return { ...target, imageUrl: null };
    return null;
  };

  return {
    result: await DeleteLD.nativeUpload.deleteCover(target),
    clicks
  };
}

test('deleteCover hands off when the native dialog closes without observable cover removal', async () => {
  const { result, clicks } = await runDeleteFlow('missing-target');
  assert.equal(result.status, 'handed-off');
  assert.deepEqual(clicks, ['edit-button', 'edit-cover', 'delete']);
});

test('deleteCover reports success only after stable evidence that the cover image was removed', async () => {
  const { result, clicks } = await runDeleteFlow('removed-image');
  assert.equal(result.status, 'success');
  assert.equal(result.reason, 'banner-image-removed');
  assert.deepEqual(clicks, ['edit-button', 'edit-cover', 'delete']);
});

test('native delete refuses to click when the detected banner is no longer the editor target', async () => {
  let clicked = false;
  const originalElement = {};
  const otherElement = {};
  const target = {
    element: originalElement,
    editButton: fakeAction({ text: '', click: () => { clicked = true; } }),
    imageUrl: 'https://media.licdn.com/cover-old.jpg'
  };
  const MismatchLD = await loadNamespace([
    'shared/constants.js',
    'content/geometry.js',
    'content/banner-detector.js',
    'content/native-upload.js'
  ], {
    getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1', backgroundImage: 'none' }),
    document: { querySelectorAll() { return []; } },
    setTimeout,
    clearTimeout
  });
  MismatchLD.bannerDetector.detect = () => ({ element: otherElement, editButton: fakeAction({ text: '' }), imageUrl: target.imageUrl });

  const result = await MismatchLD.nativeUpload.deleteCover(target);
  assert.equal(result.status, 'failed');
  assert.equal(clicked, false);
});

test('native delete aborts before clicking when navigation invalidates the session', async () => {
  let clicked = false;
  const target = {
    editButton: fakeAction({ text: '', click: () => { clicked = true; } }),
    imageUrl: 'https://media.licdn.com/cover-old.jpg'
  };
  const GuardLD = await loadNamespace([
    'shared/constants.js',
    'content/geometry.js',
    'content/banner-detector.js',
    'content/native-upload.js'
  ], {
    getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1', backgroundImage: 'none' }),
    document: { querySelectorAll() { return []; } },
    setTimeout,
    clearTimeout
  });
  GuardLD.bannerDetector.detect = () => target;

  const result = await GuardLD.nativeUpload.deleteCover(target, () => false);
  assert.equal(result.status, 'failed');
  assert.equal(result.reason, 'navigation-changed');
  assert.equal(clicked, false);
});

test('native delete keeps success when LinkedIn replaces the edit node after the native click', async () => {
  let state = 'page';
  const oldUrl = 'https://media.licdn.com/cover-old.jpg';
  const targetElement = {};
  const deleteClicks = [];
  const editButton = fakeAction({ text: '', click: () => { state = 'menu'; deleteClicks.push('edit-button'); } });
  const editCover = fakeAction({ text: 'Edit cover image', tagName: 'A', role: '', click: () => { state = 'dialog'; deleteClicks.push('edit-cover'); } });
  const deleteAction = fakeAction({ text: 'Delete', click: () => { state = 'deleted'; deleteClicks.push('delete'); } });
  const menu = fakeSurface('Edit cover image Create a slideshow', [editCover]);
  const dialog = fakeSurface('Cover photo Edit Change photo Delete', [deleteAction]);
  const document = {
    querySelectorAll(selector) {
      if ((selector === '[role="menu"]' || selector === '[role="listbox"]') && state === 'menu') return [menu];
      if ((selector === 'dialog[open]' || selector === '[role="dialog"]' || selector === '.artdeco-modal' || selector === '[data-test-modal]') && state === 'dialog') return [dialog];
      return [];
    }
  };
  const ReplaceLD = await loadNamespace([
    'shared/constants.js',
    'content/geometry.js',
    'content/banner-detector.js',
    'content/native-upload.js'
  ], {
    getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1', backgroundImage: 'none' }),
    document,
    setTimeout,
    clearTimeout
  });
  ReplaceLD.bannerDetector.detect = () => state === 'deleted'
    ? { element: targetElement, imageUrl: null, editButton: null }
    : { element: targetElement, imageUrl: oldUrl, editButton };
  const target = { element: targetElement, editButton, imageUrl: oldUrl };
  const result = await ReplaceLD.nativeUpload.deleteCover(target, () => state === 'page', () => true);

  assert.equal(result.status, 'success');
  assert.equal(result.reason, 'banner-image-removed');
  assert.deepEqual(deleteClicks, ['edit-button', 'edit-cover', 'delete']);
});

async function runUploadConfirmationFlow({ previewOnly }) {
  let state = 'dialog';
  const oldUrl = 'https://media.licdn.com/cover-old.jpg';
  const previewUrl = 'blob:https://www.linkedin.com/preview';
  const savedUrl = 'https://media.licdn.com/cover-new.jpg';
  const saveAction = fakeAction({
    text: 'Save',
    click: () => { state = 'saved'; }
  });
  const dialog = fakeSurface('Cover photo Save', [saveAction]);
  const uploadDocument = {
    querySelectorAll(selector) {
      if ((selector === 'dialog[open]' || selector === '[role="dialog"]' || selector === '.artdeco-modal' || selector === '[data-test-modal]') && state === 'dialog') return [dialog];
      return [];
    }
  };
  const UploadLD = await loadNamespace([
    'shared/constants.js',
    'content/geometry.js',
    'content/banner-detector.js',
    'content/native-upload.js'
  ], {
    getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1', backgroundImage: 'none' }),
    document: uploadDocument,
    setTimeout,
    clearTimeout
  });
  UploadLD.bannerDetector.detect = () => ({ imageUrl: state === 'dialog' ? (previewOnly ? previewUrl : oldUrl) : (previewOnly ? previewUrl : savedUrl) });
  const session = { initialDialogs: new Set(), initialMenus: new Set(), surface: dialog };
  return UploadLD.nativeUpload.confirmNativeDialogs(oldUrl, session);
}

test('native upload hands off when preview URL changed before Save but no post-save change is observable', async () => {
  const result = await runUploadConfirmationFlow({ previewOnly: true });
  assert.equal(result.success, false);
  assert.equal(result.reason, 'postcondition-unconfirmed');
});

test('native upload reports success only after stable post-save cover evidence', async () => {
  const result = await runUploadConfirmationFlow({ previewOnly: false });
  assert.equal(result.success, true);
  assert.equal(result.reason, 'banner-changed-after-confirm');
});

test('native upload reports success when a profile without a cover gains one after Save', async () => {
  let state = 'dialog';
  const savedUrl = 'https://media.licdn.com/cover-new.jpg';
  const saveAction = fakeAction({ text: 'Save', click: () => { state = 'saved'; } });
  const dialog = fakeSurface('Add cover photo Save', [saveAction]);
  const uploadDocument = {
    querySelectorAll(selector) {
      if ((selector === 'dialog[open]' || selector === '[role="dialog"]' || selector === '.artdeco-modal' || selector === '[data-test-modal]') && state === 'dialog') return [dialog];
      return [];
    }
  };
  const UploadLD = await loadNamespace([
    'shared/constants.js',
    'content/geometry.js',
    'content/banner-detector.js',
    'content/native-upload.js'
  ], {
    getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1', backgroundImage: 'none' }),
    document: uploadDocument,
    setTimeout,
    clearTimeout
  });
  UploadLD.bannerDetector.detect = () => ({ imageUrl: state === 'saved' ? savedUrl : null });

  const result = await UploadLD.nativeUpload.confirmNativeDialogs(null, {
    initialDialogs: new Set(),
    initialMenus: new Set(),
    surface: dialog
  });

  assert.equal(result.success, true);
  assert.equal(result.reason, 'banner-added-after-confirm');
});

test('native upload does not treat another banner as post-save evidence', async () => {
  let state = 'dialog';
  const oldUrl = 'https://media.licdn.com/cover-old.jpg';
  const saveAction = fakeAction({ text: 'Save', click: () => { state = 'saved'; } });
  const dialog = fakeSurface('Cover photo Save', [saveAction]);
  const targetElement = {};
  const otherElement = {};
  const uploadDocument = {
    querySelectorAll(selector) {
      if ((selector === 'dialog[open]' || selector === '[role="dialog"]' || selector === '.artdeco-modal' || selector === '[data-test-modal]') && state === 'dialog') return [dialog];
      return [];
    }
  };
  const UploadLD = await loadNamespace([
    'shared/constants.js',
    'content/geometry.js',
    'content/banner-detector.js',
    'content/native-upload.js'
  ], {
    getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1', backgroundImage: 'none' }),
    document: uploadDocument,
    setTimeout,
    clearTimeout
  });
  UploadLD.bannerDetector.detect = () => ({ element: state === 'dialog' ? targetElement : otherElement, imageUrl: state === 'dialog' ? oldUrl : 'https://media.licdn.com/other-cover.jpg' });
  const session = { initialDialogs: new Set(), initialMenus: new Set(), surface: dialog, target: { element: targetElement } };
  const result = await UploadLD.nativeUpload.confirmNativeDialogs(oldUrl, session);

  assert.equal(result.success, false);
  assert.equal(result.reason, 'postcondition-unconfirmed');
});
