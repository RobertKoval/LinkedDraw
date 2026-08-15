import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('source handoff archive is deterministic and excludes generated or Finder files', async () => {
  const outputDirectory = await mkdtemp(path.join(tmpdir(), 'linked-draw-source-package-test-'));
  const env = { ...process.env, SOURCE_PACKAGE_OUTPUT: outputDirectory };
  try {
    execFileSync(process.execPath, ['scripts/source-package.mjs'], { cwd: root, env, stdio: 'ignore' });
    const archive = path.join(outputDirectory, 'linked-draw-source-0.1.0.zip');
    const checksum = path.join(outputDirectory, 'linked-draw-source-0.1.0.zip.sha256');
    const first = await readFile(archive);
    const entries = execFileSync('unzip', ['-Z1', archive], { cwd: root }).toString().trim().split('\n');

    assert(!entries.some(entry => /(^|\/)(?:\.DS_Store|__MACOSX|\._[^/]+)$/.test(entry)));
    assert(!entries.some(entry => entry.startsWith('linked-draw/dist/')));
    assert(!entries.some(entry => entry.startsWith('linked-draw/build/')));
    assert(!entries.some(entry => entry.startsWith('linked-draw/artifacts/')));
    assert(!entries.some(entry => /(^|\/)__pycache__(\/|$)|\.py[cod]$/i.test(entry)));
    assert.equal((await readFile(checksum, 'utf8')).trim(), `${createHash('sha256').update(first).digest('hex')}  linked-draw-source-0.1.0.zip`);

    const extractedDirectory = path.join(outputDirectory, 'extracted');
    execFileSync('unzip', ['-q', archive, '-d', extractedDirectory], { cwd: root });
    const extractedRoot = path.join(extractedDirectory, 'linked-draw');
    for (const relative of ['scripts/safari-convert.sh', 'scripts/generate-icons.py', 'tests/e2e/chromium_mock.py']) {
      const sourceMode = (await stat(path.join(root, relative))).mode & 0o111;
      const extractedMode = (await stat(path.join(extractedRoot, relative))).mode & 0o111;
      assert.equal(extractedMode, sourceMode, `${relative} executable mode`);
    }
    execFileSync(process.execPath, ['--test', 'tests/geometry.test.mjs', 'tests/history.test.mjs'], { cwd: extractedRoot, stdio: 'ignore' });
    execFileSync(process.execPath, ['scripts/build.mjs', 'chrome'], { cwd: extractedRoot, stdio: 'ignore' });
    execFileSync(process.execPath, ['scripts/verify-dist.mjs', 'chrome'], { cwd: extractedRoot, stdio: 'ignore' });

    await new Promise(resolve => setTimeout(resolve, 2200));
    execFileSync(process.execPath, ['scripts/source-package.mjs'], { cwd: root, env, stdio: 'ignore' });
    const second = await readFile(archive);
    assert.deepEqual(second, first);
  } finally {
    await rm(outputDirectory, { recursive: true, force: true });
  }
});
