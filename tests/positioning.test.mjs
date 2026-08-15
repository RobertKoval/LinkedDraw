import test from 'node:test';
import assert from 'node:assert/strict';
import { loadNamespace } from './load-namespace.mjs';

const fakeWindow = {
  innerWidth: 1000,
  innerHeight: 800,
  listeners: new Map(),
  getComputedStyle: element => element.computedStyle || {
    overflow: 'visible',
    overflowX: 'visible',
    overflowY: 'visible'
  },
  addEventListener: function (type, listener) {
    const listeners = this.listeners.get(type) || new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  },
  removeEventListener: function (type, listener) {
    const listeners = this.listeners.get(type);
    if (listeners) listeners.delete(listener);
  },
  dispatchEvent: function (event) {
    for (const listener of this.listeners.get(event.type) || []) listener(event);
  }
};

let mutationObserverOptions = null;

const LD = await loadNamespace(['shared/constants.js', 'content/geometry.js', 'content/banner-detector.js', 'content/app.js'], {
  getComputedStyle: fakeWindow.getComputedStyle,
  window: fakeWindow,
  innerWidth: fakeWindow.innerWidth,
  innerHeight: fakeWindow.innerHeight,
  location: { hostname: 'www.linkedin.com', pathname: '/in/test/', href: 'https://www.linkedin.com/in/test/' },
  document: {},
  requestAnimationFrame: callback => { callback(); return 0; },
  MutationObserver: class {
    observe(_target, options) { mutationObserverOptions = options; }
    disconnect() {}
  },
  setInterval: () => 1,
  clearInterval: () => {},
  clearTimeout: () => {}
});

test('getScrollableAncestors includes nested LinkedIn scroll container and window', () => {
  const main = {
    parentElement: null,
    computedStyle: { overflow: 'hidden scroll', overflowX: 'hidden', overflowY: 'scroll' }
  };
  const wrapper = {
    parentElement: main,
    computedStyle: { overflow: 'visible', overflowX: 'visible', overflowY: 'visible' }
  };
  const anchor = { parentElement: wrapper };

  const targets = LD.positioning.getScrollableAncestors(anchor, fakeWindow);
  assert.equal(targets.length, 2);
  assert.equal(targets[0], main);
  assert.equal(targets[1], fakeWindow);
});

test('isViewportRectVisible rejects wholly off-screen anchors and accepts intersections', () => {
  assert.equal(LD.positioning.isViewportRectVisible({ left: 100, top: -120, right: 300, bottom: -20, width: 200, height: 100 }, fakeWindow), false);
  assert.equal(LD.positioning.isViewportRectVisible({ left: 100, top: -20, right: 300, bottom: 80, width: 200, height: 100 }, fakeWindow), true);
});

test('positionButton hides instead of using banner fallback without a native anchor', () => {
  const app = {
    target: {
      element: { isConnected: true, getBoundingClientRect: () => ({ left: 100, top: 100, right: 900, bottom: 300, width: 800, height: 200 }) },
      editButton: null
    },
    button: {
      hidden: false,
      style: { left: '42px', top: '24px' },
      getBoundingClientRect: () => ({ width: 100, height: 38 })
    }
  };

  LD.LinkedDrawApp.prototype.positionButton.call(app);

  assert.equal(app.button.hidden, true);
  assert.equal(app.button.style.left, '42px');
  assert.equal(app.button.style.top, '24px');
});

test('positionButton hides when the banner element is disconnected', () => {
  const app = {
    target: {
      element: { isConnected: false, getBoundingClientRect: () => ({ left: 100, top: 100, right: 900, bottom: 300, width: 800, height: 200 }) },
      editButton: { isConnected: true, getBoundingClientRect: () => ({ left: 450, top: 100, right: 482, bottom: 148, width: 32, height: 48 }) }
    },
    button: { hidden: false, style: { left: '42px', top: '24px' } }
  };

  LD.LinkedDrawApp.prototype.positionButton.call(app);

  assert.equal(app.button.hidden, true);
});

test('positionButton hides a CSS-hidden banner even when its rectangle remains', () => {
  const app = {
    target: {
      element: {
        isConnected: true,
        computedStyle: { display: 'none', visibility: 'hidden', opacity: '0' },
        getBoundingClientRect: () => ({ left: 100, top: 100, right: 900, bottom: 300, width: 800, height: 200 })
      },
      editButton: { isConnected: true, getBoundingClientRect: () => ({ left: 450, top: 100, right: 482, bottom: 148, width: 32, height: 48 }) }
    },
    button: { hidden: false, style: {}, getBoundingClientRect: () => ({ width: 100, height: 38 }) }
  };

  LD.LinkedDrawApp.prototype.positionButton.call(app);

  assert.equal(app.button.hidden, true);
});

test('positionButton uses the visible native anchor width and viewport coordinates', () => {
  const app = {
    target: {
      element: { isConnected: true, getBoundingClientRect: () => ({ left: 100, top: 100, right: 900, bottom: 300, width: 800, height: 200 }) },
      editButton: { isConnected: true, getBoundingClientRect: () => ({ left: 450, top: 100, right: 482, bottom: 148, width: 32, height: 48 }) }
    },
    button: {
      hidden: false,
      style: {},
      getBoundingClientRect: () => ({ width: 100, height: 38 })
    }
  };

  LD.LinkedDrawApp.prototype.positionButton.call(app);

  assert.equal(app.button.hidden, false);
  assert.equal(app.button.style.left, '340px');
  assert.equal(app.button.style.top, '100px');
});

test('positionButton re-shows the button when a hidden native anchor returns to the viewport', () => {
  const app = {
    target: {
      element: { isConnected: true, getBoundingClientRect: () => ({ left: 100, top: 100, right: 900, bottom: 300, width: 800, height: 200 }) },
      editButton: { isConnected: true, getBoundingClientRect: () => ({ left: 450, top: 100, right: 482, bottom: 148, width: 32, height: 48 }) }
    },
    editor: null,
    button: {
      hidden: true,
      style: {},
      getBoundingClientRect: () => ({ width: 100, height: 38 })
    }
  };

  LD.LinkedDrawApp.prototype.positionButton.call(app);

  assert.equal(app.button.hidden, false);
});

test('scan preserves a connected cover target instead of retargeting it', () => {
  const current = {
    editable: true,
    element: { isConnected: true, getBoundingClientRect: () => ({ left: 100, top: 100, right: 900, bottom: 300, width: 800, height: 200 }) },
    editButton: { isConnected: true, getAttribute: name => name === 'aria-label' ? 'Add background image' : null, textContent: '', tagName: 'BUTTON', getBoundingClientRect: () => ({ left: 450, top: 100, right: 482, bottom: 148, width: 32, height: 48 }) }
  };
  const replacement = { element: { isConnected: true }, editButton: { isConnected: true } };
  const previousDetect = LD.bannerDetector.detect;
  LD.bannerDetector.detect = () => replacement;

  try {
    const app = {
      destroyed: false,
      lastUrl: 'https://www.linkedin.com/in/test/',
      navigationEpoch: 0,
      target: current,
      editor: null,
      button: { hidden: false },
      schedulePosition: () => {},
      syncNavigation: LD.LinkedDrawApp.prototype.syncNavigation,
      hasUsableTarget: LD.LinkedDrawApp.prototype.hasUsableTarget,
      clearScrollTargets: () => {},
      refreshScrollTargets: () => {}
    };

    LD.LinkedDrawApp.prototype.scan.call(app);

    assert.equal(app.target, current);
  } finally {
    LD.bannerDetector.detect = previousDetect;
  }
});

test('scan revalidates a connected target before preserving it', () => {
  const current = {
    editable: true,
    element: { isConnected: true },
    editButton: { isConnected: true, getAttribute: () => null, textContent: '', tagName: 'BUTTON' }
  };
  const replacement = {
    editable: true,
    element: { isConnected: true },
    editButton: { isConnected: true, getAttribute: name => name === 'aria-label' ? 'Add background image' : null, textContent: '', tagName: 'BUTTON' }
  };
  const previousDetect = LD.bannerDetector.detect;
  LD.bannerDetector.detect = () => replacement;

  try {
    const app = {
      destroyed: false,
      lastUrl: 'https://www.linkedin.com/in/test/',
      navigationEpoch: 0,
      target: current,
      editor: null,
      button: { hidden: false },
      schedulePosition: () => {},
      syncNavigation: LD.LinkedDrawApp.prototype.syncNavigation,
      hasUsableTarget: LD.LinkedDrawApp.prototype.hasUsableTarget,
      refreshScrollTargets: () => {},
      clearScrollTargets: () => {}
    };

    LD.LinkedDrawApp.prototype.scan.call(app);

    assert.equal(app.target, replacement);
  } finally {
    LD.bannerDetector.detect = previousDetect;
  }
});

test('refreshScrollTargets installs, dispatches, and replaces nested scroll listeners', () => {
  const listeners = new Map();
  const makeScrollable = parentElement => ({
    parentElement,
    computedStyle: { overflow: 'hidden scroll', overflowX: 'hidden', overflowY: 'scroll' },
    addEventListener: function (type, listener) {
      const entries = listeners.get(this) || [];
      entries.push({ type, listener });
      listeners.set(this, entries);
    },
    removeEventListener: function (type, listener) {
      listeners.set(this, (listeners.get(this) || []).filter(entry => entry.type !== type || entry.listener !== listener));
    },
    dispatchEvent: function (event) {
      for (const entry of listeners.get(this) || []) if (entry.type === event.type) entry.listener(event);
    }
  });
  const main = makeScrollable(null);
  const anchor = { parentElement: main, isConnected: true };
  const replacementMain = makeScrollable(null);
  const replacementAnchor = { parentElement: replacementMain, isConnected: true };
  let scrolls = 0;
  const app = {
    target: { editButton: anchor },
    scrollTargets: [],
    boundScroll: () => { scrolls += 1; },
    clearScrollTargets: LD.LinkedDrawApp.prototype.clearScrollTargets
  };

  LD.LinkedDrawApp.prototype.refreshScrollTargets.call(app);
  main.dispatchEvent({ type: 'scroll' });
  assert.equal(scrolls, 1);
  assert.equal(app.scrollTargets[0], main);
  assert.equal(app.scrollTargets[1], fakeWindow);

  app.target = { editButton: replacementAnchor };
  LD.LinkedDrawApp.prototype.refreshScrollTargets.call(app);
  main.dispatchEvent({ type: 'scroll' });
  replacementMain.dispatchEvent({ type: 'scroll' });
  assert.equal(scrolls, 2);
  assert.equal(app.scrollTargets[0], replacementMain);
});

test('production bind scroll path hides and restores Draw with nested scrolling', () => {
  const listeners = new Set();
  let anchorTop = 100;
  const main = {
    parentElement: null,
    computedStyle: { overflow: 'hidden scroll', overflowX: 'hidden', overflowY: 'scroll' },
    addEventListener: (type, listener) => { if (type === 'scroll') listeners.add(listener); },
    removeEventListener: (type, listener) => { if (type === 'scroll') listeners.delete(listener); },
    dispatchEvent: event => { for (const listener of listeners) listener(event); }
  };
  const banner = {
    isConnected: true,
    parentElement: null,
    getBoundingClientRect: () => ({ left: 100, top: anchorTop, right: 900, bottom: anchorTop + 200, width: 800, height: 200 })
  };
  const anchor = {
    isConnected: true,
    parentElement: main,
    tagName: 'BUTTON',
    textContent: '',
    getAttribute: name => name === 'aria-label' ? 'Add background image' : null,
    getBoundingClientRect: () => ({ left: 450, top: anchorTop, right: 482, bottom: anchorTop + 48, width: 32, height: 48 }),
    querySelector: () => null
  };
  const app = {
    destroyed: false,
    lastUrl: 'https://www.linkedin.com/in/test/',
    editor: null,
    target: { editable: true, element: banner, editButton: anchor },
    button: {
      hidden: false,
      style: {},
      addEventListener: () => {},
      getBoundingClientRect: () => ({ width: 100, height: 38 })
    },
    editorMount: {},
    toastStack: {},
    schedulePosition: LD.LinkedDrawApp.prototype.schedulePosition,
    positionButton: LD.LinkedDrawApp.prototype.positionButton,
    hasUsableTarget: LD.LinkedDrawApp.prototype.hasUsableTarget
  };

  LD.LinkedDrawApp.prototype.bind.call(app);
  assert.equal(mutationObserverOptions.childList, true);
  assert.equal(mutationObserverOptions.subtree, true);
  assert.equal(Boolean(mutationObserverOptions.attributes), false);
  app.refreshScrollTargets = LD.LinkedDrawApp.prototype.refreshScrollTargets;
  app.clearScrollTargets = LD.LinkedDrawApp.prototype.clearScrollTargets;
  app.refreshScrollTargets();

  anchorTop = 900;
  main.dispatchEvent({ type: 'scroll' });
  assert.equal(app.button.hidden, true);

  anchorTop = 100;
  main.dispatchEvent({ type: 'scroll' });
  assert.equal(app.button.hidden, false);

  LD.LinkedDrawApp.prototype.destroy.call(app);
  assert.equal(app.scrollTargets.length, 0);
});

test('positionButton hides while LinkedIn navigation partially occludes the native cover control and restores afterward', async () => {
  let navigationBottom = 52;
  const navigation = { contains: () => false };
  const anchor = {
    isConnected: true,
    parentElement: null,
    contains: node => node === anchor,
    getBoundingClientRect: () => ({ left: 450, top: 20, right: 482, bottom: 68, width: 32, height: 48 })
  };
  const occlusionDocument = {
    elementFromPoint: (_x, y) => y < navigationBottom ? navigation : anchor
  };
  const OccludedLD = await loadNamespace(['shared/constants.js', 'content/geometry.js', 'content/banner-detector.js', 'content/app.js'], {
    getComputedStyle: fakeWindow.getComputedStyle,
    window: fakeWindow,
    innerWidth: fakeWindow.innerWidth,
    innerHeight: fakeWindow.innerHeight,
    location: { hostname: 'www.linkedin.com', pathname: '/in/test/' },
    document: occlusionDocument
  });
  const app = {
    editor: null,
    target: {
      element: {
        isConnected: true,
        getBoundingClientRect: () => ({ left: 100, top: 20, right: 900, bottom: 220, width: 800, height: 200 })
      },
      editButton: anchor
    },
    button: {
      hidden: false,
      style: {},
      getBoundingClientRect: () => ({ width: 100, height: 38 })
    }
  };

  OccludedLD.LinkedDrawApp.prototype.positionButton.call(app);
  assert.equal(app.button.hidden, true);

  navigationBottom = 0;
  OccludedLD.LinkedDrawApp.prototype.positionButton.call(app);
  assert.equal(app.button.hidden, false);
});
