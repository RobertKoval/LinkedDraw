import { access, lstat, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const targets = ['chrome', 'firefox', 'safari', 'dev'];
const requested = process.argv[2] || 'all';
const selected = requested === 'all' ? targets : [requested];

const forbiddenPermissions = new Set([
  '<all_urls>', 'cookies', 'debugger', 'history', 'webRequest', 'webRequestBlocking',
  'declarativeNetRequestWithHostAccess', 'nativeMessaging', 'management'
]);

async function exists(file) {
  try { await access(file); return true; } catch { return false; }
}

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else files.push(full);
  }
  return files;
}

function collectManifestFiles(manifest) {
  const files = new Set();
  const add = value => { if (typeof value === 'string') files.add(value); };
  Object.values(manifest.icons || {}).forEach(add);
  if (manifest.action) {
    add(manifest.action.default_popup);
    Object.values(manifest.action.default_icon || {}).forEach(add);
  }
  if (manifest.options_ui) add(manifest.options_ui.page);
  if (manifest.background) {
    add(manifest.background.service_worker);
    (manifest.background.scripts || []).forEach(add);
  }
  for (const script of manifest.content_scripts || []) {
    (script.js || []).forEach(add);
    (script.css || []).forEach(add);
  }
  return [...files];
}

function assert(condition, message, failures) {
  if (!condition) failures.push(message);
}

for (const target of selected) {
  if (!targets.includes(target)) throw new Error(`Unknown verify target: ${target}`);
  const directory = path.join(root, 'dist', target);
  const failures = [];
  assert(await exists(directory), `Missing build directory: dist/${target}`, failures);
  if (failures.length) {
    console.error(failures.join('\n'));
    process.exitCode = 1;
    continue;
  }

  const manifestPath = path.join(directory, 'manifest.json');
  assert(await exists(manifestPath), 'manifest.json is missing', failures);
  if (!await exists(manifestPath)) continue;
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

  assert(manifest.manifest_version === 3, 'Manifest must use version 3', failures);
  assert(/^\d+\.\d+\.\d+(\.\d+)?$/.test(manifest.version), 'Manifest version is not store-safe numeric dotted form', failures);
  assert(manifest.default_locale === 'en', 'default_locale must be en', failures);
  assert(Array.isArray(manifest.permissions) && manifest.permissions.length === 1 && manifest.permissions[0] === 'storage', 'Only the storage permission is allowed', failures);

  const permissions = [...(manifest.permissions || []), ...(manifest.host_permissions || [])];
  permissions.forEach(permission => {
    assert(!forbiddenPermissions.has(permission), `Forbidden permission: ${permission}`, failures);
  });
  assert(!(manifest.host_permissions || []).some(value => value.includes('*://*/*') || value === '<all_urls>'), 'Broad host permission detected', failures);

  const productionHosts = new Set(['https://www.linkedin.com/*', 'https://*.licdn.com/*']);
  if (target === 'dev') {
    const allowed = new Set([...productionHosts, 'http://127.0.0.1:4173/*', 'http://localhost:4173/*']);
    (manifest.host_permissions || []).forEach(value => assert(allowed.has(value), `Unexpected dev host permission: ${value}`, failures));
  } else {
    assert((manifest.host_permissions || []).length === productionHosts.size, 'Release host permission count changed', failures);
    (manifest.host_permissions || []).forEach(value => assert(productionHosts.has(value), `Unexpected release host permission: ${value}`, failures));
  }

  const expectedProductionMatches = ['https://www.linkedin.com/in/*'];
  const expectedDevMatches = [...expectedProductionMatches, 'http://127.0.0.1:4173/*', 'http://localhost:4173/*'];
  for (const contentScript of manifest.content_scripts || []) {
    const expectedMatches = target === 'dev' ? expectedDevMatches : expectedProductionMatches;
    assert(JSON.stringify(contentScript.matches) === JSON.stringify(expectedMatches), `Unexpected content-script matches: ${JSON.stringify(contentScript.matches)}`, failures);
  }

  if (target === 'chrome' || target === 'dev') {
    assert(manifest.background && manifest.background.service_worker === 'background/index.js', 'Chromium requires the expected service worker', failures);
    assert(!manifest.background.scripts, 'Chromium manifest should not contain background.scripts', failures);
  }
  if (target === 'firefox') {
    assert(manifest.background && Array.isArray(manifest.background.scripts), 'Firefox requires background.scripts', failures);
    assert(!manifest.background.service_worker, 'Firefox build must not require a service worker', failures);
    const gecko = manifest.browser_specific_settings && manifest.browser_specific_settings.gecko;
    assert(Boolean(gecko && gecko.id), 'Firefox extension ID is missing', failures);
    assert(gecko && gecko.data_collection_permissions && gecko.data_collection_permissions.required[0] === 'none', 'Firefox no-data declaration is missing', failures);
    assert(Number.parseInt(gecko && gecko.strict_min_version, 10) >= 142, 'Firefox minimum version must support data_collection_permissions', failures);
  }
  if (target === 'safari') {
    assert(manifest.background && manifest.background.service_worker && Array.isArray(manifest.background.scripts), 'Safari source should provide both background environments', failures);
    assert(!Object.prototype.hasOwnProperty.call(manifest.background, 'preferred_environment'), 'Safari source contains unsupported preferred_environment', failures);
    assert(!(manifest.options_ui && Object.prototype.hasOwnProperty.call(manifest.options_ui, 'open_in_tab')), 'Safari source contains unsupported options_ui.open_in_tab', failures);
  }

  for (const referenced of collectManifestFiles(manifest)) {
    assert(await exists(path.join(directory, referenced)), `Manifest references missing file: ${referenced}`, failures);
  }
  assert(await exists(path.join(directory, '_locales', 'en', 'messages.json')), 'English locale is missing', failures);
  assert(await exists(path.join(directory, '_locales', 'uk', 'messages.json')), 'Ukrainian locale is missing', failures);

  const allFiles = await walk(directory);
  for (const file of allFiles) {
    const relative = path.relative(directory, file).replaceAll(path.sep, '/');
    assert(!/(^|\/)(?:\.DS_Store|__MACOSX|\._[^/]+)$/.test(relative), `Finder metadata must not ship: ${relative}`, failures);
    assert(!relative.endsWith('.map'), `Source map must not ship: ${relative}`, failures);
    assert(!/^(AGENTS\.md|LOCAL_.*_RELEASE_TASK\.md|README\.md)$/i.test(relative), `Repository-only file shipped: ${relative}`, failures);
    const info = await lstat(file);
    assert(!info.isSymbolicLink(), `Symbolic link must not ship: ${relative}`, failures);
    if (info.isSymbolicLink()) continue;
    assert(info.size < 15 * 1024 * 1024, `Unexpectedly large file: ${relative}`, failures);
    if (relative.endsWith('.js')) {
      const source = await readFile(file, 'utf8');
      assert(!/\beval\s*\(/.test(source), `eval detected in ${relative}`, failures);
      assert(!/\bnew\s+Function\s*\(/.test(source), `new Function detected in ${relative}`, failures);
      assert(!/credentials\s*:\s*['"]include['"]/.test(source), `Credentialed fetch detected in ${relative}`, failures);
      assert(!/https?:\/\/(?!127\.0\.0\.1|localhost|www\.linkedin\.com)/.test(source), `Unexpected hard-coded remote URL in ${relative}`, failures);
    }
  }

  if (failures.length) {
    console.error(`\nVerification failed for ${target}:`);
    failures.forEach(failure => console.error(`- ${failure}`));
    process.exitCode = 1;
  } else {
    console.log(`Verified ${target}: ${allFiles.length} files`);
  }
}
