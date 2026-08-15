import test from 'node:test';
import assert from 'node:assert/strict';
import { loadNamespace } from './load-namespace.mjs';

const LD = await loadNamespace([
  'shared/constants.js',
  'shared/url-policy.js',
  'shared/settings.js'
]);

test('URL policy accepts LinkedIn media and rejects look-alike hosts', () => {
  assert.equal(LD.urlPolicy.isProductionMediaUrl('https://media.licdn.com/dms/image/example'), true);
  assert.equal(LD.urlPolicy.isProductionMediaUrl('https://www.linkedin.com/image.png'), true);
  assert.equal(LD.urlPolicy.isProductionMediaUrl('https://licdn.com.evil.example/image.png'), false);
  assert.equal(LD.urlPolicy.isProductionMediaUrl('http://media.licdn.com/image.png'), false);
  assert.equal(LD.urlPolicy.isAllowedMediaUrl('http://media.licdn.com/image.png'), false);
  assert.equal(LD.urlPolicy.isAllowedMediaUrl('http://127.0.0.1:4173/banner.svg'), false);
  assert.equal(LD.urlPolicy.isAllowedMediaUrl('http://127.0.0.1:4173/banner.svg', { allowDevelopment: true }), true);
  assert.equal(LD.urlPolicy.isAllowedMediaUrl('https://localhost:4173/banner.svg', { allowDevelopment: true }), true);
  assert.equal(LD.urlPolicy.isProductionMediaUrl('http://127.0.0.1:4173/banner.svg'), false);
  assert.equal(LD.urlPolicy.isProductionMediaUrl('javascript:alert(1)'), false);
});

test('settings sanitizer clamps and normalizes untrusted values', () => {
  const settings = LD.settings.sanitize({
    autoConfirmUpload: false,
    outputFormat: 'gif',
    jpegQuality: 4,
    defaultTool: 'spray-can',
    defaultColor: 'red',
    defaultWidth: 500,
    defaultFontSize: 2
  });
  assert.equal(settings.autoConfirmUpload, false);
  assert.equal(settings.outputFormat, 'png');
  assert.equal(settings.jpegQuality, 0.98);
  assert.equal(settings.defaultTool, 'pen');
  assert.equal(settings.defaultColor, '#ff3b30');
  assert.equal(settings.defaultWidth, 48);
  assert.equal(settings.defaultFontSize, 16);
});

test('auto-confirm completes Save by default while preserving an explicit manual-handoff choice', () => {
  assert.equal(LD.settings.defaults.autoConfirmUpload, true);
  assert.equal(LD.settings.sanitize({}).autoConfirmUpload, true);
  assert.equal(LD.settings.sanitize({ autoConfirmUpload: false }).autoConfirmUpload, false);
});
