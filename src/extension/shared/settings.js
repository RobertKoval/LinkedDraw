(function (LD) {
  'use strict';

  var defaults = Object.freeze({
    autoConfirmUpload: true,
    includeCurrentBackground: true,
    showSafeAreas: true,
    outputFormat: 'png',
    jpegQuality: 0.92,
    defaultTool: 'pen',
    defaultColor: '#ff3b30',
    defaultWidth: 8,
    defaultFontSize: 42
  });

  var allowedTools = ['pen', 'line', 'arrow', 'rect', 'text', 'eraser'];

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function sanitizeColor(value) {
    return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value).toLowerCase() : defaults.defaultColor;
  }

  function sanitize(raw) {
    raw = raw || {};
    return {
      autoConfirmUpload: raw.autoConfirmUpload !== false,
      includeCurrentBackground: raw.includeCurrentBackground !== false,
      showSafeAreas: raw.showSafeAreas !== false,
      outputFormat: raw.outputFormat === 'jpeg' ? 'jpeg' : 'png',
      jpegQuality: clamp(Number(raw.jpegQuality) || defaults.jpegQuality, 0.55, 0.98),
      defaultTool: allowedTools.indexOf(raw.defaultTool) >= 0 ? raw.defaultTool : defaults.defaultTool,
      defaultColor: sanitizeColor(raw.defaultColor),
      defaultWidth: Math.round(clamp(Number(raw.defaultWidth) || defaults.defaultWidth, 1, 48)),
      defaultFontSize: Math.round(clamp(Number(raw.defaultFontSize) || defaults.defaultFontSize, 16, 120))
    };
  }

  async function getSettings() {
    if (!LD.webext) return sanitize(defaults);
    try {
      var raw = await LD.webext.storageGet(defaults);
      return sanitize(raw);
    } catch (error) {
      LD.log('Unable to read settings', error);
      return sanitize(defaults);
    }
  }

  async function setSettings(values) {
    var next = sanitize(values);
    if (LD.webext) await LD.webext.storageSet(next);
    return next;
  }

  LD.settings = {
    defaults: defaults,
    sanitize: sanitize,
    get: getSettings,
    set: setSettings
  };
})(globalThis.LinkedDraw = globalThis.LinkedDraw || {});
