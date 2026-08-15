(function (LD) {
  'use strict';

  var rasterMimeTypes = Object.freeze([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif'
  ]);

  function normalizeMimeType(value) {
    return String(value || '').split(';')[0].trim().toLowerCase();
  }

  function isAllowedMimeType(value, options) {
    var mimeType = normalizeMimeType(value);
    if (rasterMimeTypes.indexOf(mimeType) >= 0) return true;
    return Boolean(options && options.allowDevelopmentSvg && mimeType === 'image/svg+xml');
  }

  function declaredContentLength(response) {
    var value = Number(response && response.headers && response.headers.get('content-length'));
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  function assertWithinLimit(size, maxBytes) {
    if (size > maxBytes) throw new Error('Image exceeds fetch size limit');
  }

  function assertMimeType(value, options) {
    var mimeType = normalizeMimeType(value);
    if (!isAllowedMimeType(mimeType, options)) throw new Error('Unsupported image type');
    return mimeType;
  }

  async function readResponse(response, maxBytes, options) {
    var mimeType = assertMimeType(response && response.headers && response.headers.get('content-type'), options);
    var declared = declaredContentLength(response);
    if (declared !== null) assertWithinLimit(declared, maxBytes);

    if (response.body && typeof response.body.getReader === 'function') {
      var reader = response.body.getReader();
      var chunks = [];
      var total = 0;
      while (true) {
        var item = await reader.read();
        if (item.done) break;
        var chunk = item.value instanceof Uint8Array ? item.value : new Uint8Array(item.value || 0);
        total += chunk.byteLength;
        if (total > maxBytes) {
          if (typeof reader.cancel === 'function') await reader.cancel();
          throw new Error('Image exceeds fetch size limit');
        }
        chunks.push(chunk);
      }
      var bytes = new Uint8Array(total);
      var offset = 0;
      chunks.forEach(function (chunk) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      });
      return { mimeType: mimeType, bytes: bytes };
    }

    var buffer = await response.arrayBuffer();
    assertWithinLimit(buffer.byteLength, maxBytes);
    return { mimeType: mimeType, bytes: new Uint8Array(buffer) };
  }

  function validateDataUrl(value, maxBytes, options) {
    var source = String(value || '');
    var match = /^data:([^;,]+);base64,([a-z0-9+/]*={0,2})$/i.exec(source);
    if (!match) return { ok: false, error: 'Unsupported image data URL' };
    var mimeType;
    try {
      mimeType = assertMimeType(match[1], options);
    } catch (error) {
      return { ok: false, error: error.message };
    }
    var padding = match[2].endsWith('==') ? 2 : (match[2].endsWith('=') ? 1 : 0);
    var estimatedBytes = Math.floor(match[2].length * 3 / 4) - padding;
    if (estimatedBytes > maxBytes) return { ok: false, error: 'Image exceeds fetch size limit' };
    return { ok: true, mimeType: mimeType, dataUrl: source };
  }

  LD.imagePolicy = Object.freeze({
    normalizeMimeType: normalizeMimeType,
    isAllowedMimeType: isAllowedMimeType,
    readResponse: readResponse,
    validateDataUrl: validateDataUrl
  });
})(globalThis.LinkedDraw = globalThis.LinkedDraw || {});
