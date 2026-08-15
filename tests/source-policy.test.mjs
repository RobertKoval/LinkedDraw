import test from 'node:test';
import assert from 'node:assert/strict';
import { sourcePathAllowed } from '../scripts/lib/source-policy.mjs';

test('source archive policy excludes local secrets and signing material', () => {
  const forbidden = [
    '.env',
    '.env.local',
    'release.pem',
    'certificates/signing.key',
    'Safari.mobileprovision',
    'build.p12',
    '.web-extension-id',
    'App.xcodeproj/xcuserdata/person.xcuserdatad/state',
    'tests/e2e/__pycache__/chromium_mock.cpython-314.pyc',
    'tests/e2e/chromium_mock.pyo',
    'debug.log'
  ];
  forbidden.forEach(file => assert.equal(sourcePathAllowed(file, false), false, file));
  assert.equal(sourcePathAllowed('tests/e2e/__pycache__', true), false);
});

test('source archive policy retains public configuration and source', () => {
  ['.env.example', 'LICENSE', 'package-lock.json', 'src/extension/content/app.js'].forEach(file => {
    assert.equal(sourcePathAllowed(file, false), true, file);
  });
});
