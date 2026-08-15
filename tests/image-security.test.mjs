import test from 'node:test';
import assert from 'node:assert/strict';
import { loadNamespace } from './load-namespace.mjs';

function headers(values) {
  const normalized = new Map(Object.entries(values).map(([key, value]) => [key.toLowerCase(), String(value)]));
  return { get: key => normalized.get(String(key).toLowerCase()) || null };
}

async function loadBackgroundHarness(response) {
  let listener = null;
  const chrome = {
    runtime: {
      onMessage: { addListener(value) { listener = value; } },
      getManifest() {
        return { host_permissions: ['https://www.linkedin.com/*', 'https://*.licdn.com/*'] };
      }
    },
    storage: { local: {} },
    tabs: {}
  };
  const LD = await loadNamespace([
    'shared/constants.js',
    'shared/browser-api.js',
    'shared/url-policy.js',
    'shared/image-policy.js',
    'background/index.js'
  ], {
    chrome,
    fetch: async () => response,
    AbortController,
    setTimeout,
    clearTimeout,
    Uint8Array,
    btoa: value => Buffer.from(value, 'binary').toString('base64')
  });
  assert.equal(typeof listener, 'function');
  return { LD, listener };
}

function send(listener, message) {
  return new Promise(resolve => {
    const keepChannelOpen = listener(message, {}, resolve);
    assert.equal(keepChannelOpen, true);
  });
}

test('background rejects an oversized streamed image before buffering the full response', async () => {
  let reads = 0;
  let cancelled = false;
  const response = {
    ok: true,
    status: 200,
    url: 'https://media.licdn.com/dms/image/cover.jpg',
    headers: headers({ 'content-type': 'image/jpeg' }),
    body: {
      getReader() {
        return {
          async read() {
            reads += 1;
            return reads === 1
              ? { done: false, value: new Uint8Array(13 * 1024 * 1024) }
              : { done: true, value: undefined };
          },
          async cancel() { cancelled = true; }
        };
      }
    },
    async arrayBuffer() {
      throw new Error('arrayBuffer must not be used when a response stream exists');
    }
  };
  const { LD, listener } = await loadBackgroundHarness(response);
  const result = await send(listener, { type: LD.constants.messageTypes.fetchImage, url: response.url });

  assert.equal(result.ok, false);
  assert.equal(result.error, 'Image exceeds fetch size limit');
  assert.equal(reads, 1);
  assert.equal(cancelled, true);
});

test('background rejects SVG even when the server labels it as an image', async () => {
  const bytes = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>');
  const response = {
    ok: true,
    status: 200,
    url: 'https://media.licdn.com/dms/image/cover.svg',
    headers: headers({ 'content-type': 'image/svg+xml', 'content-length': bytes.byteLength }),
    body: null,
    async arrayBuffer() { return bytes.buffer; }
  };
  const { LD, listener } = await loadBackgroundHarness(response);
  const result = await send(listener, { type: LD.constants.messageTypes.fetchImage, url: response.url });

  assert.equal(result.ok, false);
  assert.equal(result.error, 'Unsupported image type');
});

async function loadAppHarness(fetchImpl) {
  const LinkedDraw = {
    constants: {
      imageFetchTimeoutMs: 10000,
      maxFetchedImageBytes: 12 * 1024 * 1024
    },
    webext: { sendMessage: async () => ({ ok: false, error: 'unexpected background request' }) },
    geometry: { normalizeRect: value => value },
    bannerDetector: {},
    log() {}
  };
  return loadNamespace(['shared/url-policy.js', 'shared/image-policy.js', 'content/app.js'], {
    LinkedDraw,
    location: {
      hostname: 'www.linkedin.com',
      pathname: '/in/example/',
      href: 'https://www.linkedin.com/in/example/',
      origin: 'https://www.linkedin.com'
    },
    fetch: fetchImpl,
    AbortController,
    setTimeout,
    clearTimeout,
    URL,
    FileReader: class FileReader {}
  });
}

test('current-cover loader rejects an SVG data URL instead of decoding page-controlled markup', async () => {
  const LD = await loadAppHarness(async () => { throw new Error('fetch should not run'); });
  const result = await LD.LinkedDrawApp.prototype.loadCurrentBackground.call(
    {},
    { imageUrl: 'data:image/svg+xml;base64,PHN2Zy8+' },
    { includeCurrentBackground: true }
  );

  assert.equal(result.phase, 'unavailable');
  assert.match(result.error, /Unsupported image type/);
});

test('same-origin current-cover loader rejects declared oversize before reading the body', async () => {
  let bodyRead = false;
  const LD = await loadAppHarness(async () => ({
    ok: true,
    status: 200,
    url: 'https://www.linkedin.com/cover.jpg',
    headers: headers({ 'content-type': 'image/jpeg', 'content-length': 13 * 1024 * 1024 }),
    async blob() {
      bodyRead = true;
      throw new Error('oversized response body must not be read');
    }
  }));
  const result = await LD.LinkedDrawApp.prototype.loadCurrentBackground.call(
    {},
    { imageUrl: 'https://www.linkedin.com/cover.jpg' },
    { includeCurrentBackground: true }
  );

  assert.equal(result.phase, 'unavailable');
  assert.match(result.error, /Image exceeds fetch size limit/);
  assert.equal(bodyRead, false);
});
