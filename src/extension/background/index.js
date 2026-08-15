/* global importScripts */
(function bootstrapBackground() {
  'use strict';

  if (!globalThis.LinkedDraw || !globalThis.LinkedDraw.constants || !globalThis.LinkedDraw.webext || !globalThis.LinkedDraw.urlPolicy || !globalThis.LinkedDraw.imagePolicy) {
    if (typeof importScripts === 'function') {
      importScripts('../shared/constants.js', '../shared/browser-api.js', '../shared/url-policy.js', '../shared/image-policy.js');
    }
  }

  var LD = globalThis.LinkedDraw;
  if (!LD || !LD.webext) return;

  var api = LD.webext.api;
  var maxBytes = LD.constants.maxFetchedImageBytes;
  var manifest = LD.webext.getManifest();
  var hostPermissions = manifest && Array.isArray(manifest.host_permissions) ? manifest.host_permissions : [];
  var allowDevelopment = hostPermissions.some(function (value) {
    return /^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\//i.test(String(value));
  });

  function bytesToBase64(bytes) {
    var chunkSize = 0x8000;
    var binary = '';
    for (var offset = 0; offset < bytes.length; offset += chunkSize) {
      var chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length));
      binary += String.fromCharCode.apply(null, chunk);
    }
    return btoa(binary);
  }

  async function fetchImageAsDataUrl(url) {
    var urlOptions = { allowDevelopment: allowDevelopment };
    if (!LD.urlPolicy.isAllowedMediaUrl(url, urlOptions)) {
      throw new Error('Blocked image URL');
    }

    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timeout = controller ? setTimeout(function () { controller.abort(); }, LD.constants.imageFetchTimeoutMs) : null;

    try {
      var response = await fetch(url, {
        method: 'GET',
        credentials: 'omit',
        cache: 'no-store',
        redirect: 'follow',
        referrerPolicy: 'no-referrer',
        signal: controller ? controller.signal : undefined
      });

      if (!response.ok) {
        throw new Error('Image request failed with HTTP ' + response.status);
      }

      if (!LD.urlPolicy.isAllowedMediaUrl(response.url || url, urlOptions)) {
        throw new Error('Blocked redirected image URL');
      }
      var image = await LD.imagePolicy.readResponse(response, maxBytes, { allowDevelopmentSvg: allowDevelopment });
      var base64 = bytesToBase64(image.bytes);
      return 'data:' + image.mimeType + ';base64,' + base64;
    } catch (error) {
      if (error && error.name === 'AbortError') throw new Error('Image request timed out');
      throw error;
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  api.runtime.onMessage.addListener(function (message, _sender, sendResponse) {
    if (!message || typeof message.type !== 'string') return false;

    if (message.type === LD.constants.messageTypes.ping) {
      sendResponse({ ok: true, version: LD.version });
      return false;
    }

    if (message.type !== LD.constants.messageTypes.fetchImage) return false;

    fetchImageAsDataUrl(String(message.url || ''))
      .then(function (dataUrl) {
        sendResponse({ ok: true, dataUrl: dataUrl });
      })
      .catch(function (error) {
        sendResponse({ ok: false, error: error && error.message ? error.message : String(error) });
      });

    return true;
  });
})();
