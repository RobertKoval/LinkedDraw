import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const archives = [
  `linked-draw-chromium-${packageJson.version}.zip`,
  `linked-draw-firefox-${packageJson.version}.zip`,
  `linked-draw-safari-source-${packageJson.version}.zip`
];

test('packaging unchanged dist twice produces byte-identical archives', async () => {
  const outputDirectory = await mkdtemp(path.join(tmpdir(), 'linked-draw-package-test-'));
  const env = { ...process.env, LINKED_DRAW_PACKAGE_OUTPUT: outputDirectory };
  try {
    execFileSync(process.execPath, ['scripts/package.mjs'], { cwd: root, env, stdio: 'ignore' });
    const first = await Promise.all(archives.map(name => readFile(path.join(outputDirectory, name))));
    await new Promise(resolve => setTimeout(resolve, 2200));
    execFileSync(process.execPath, ['scripts/package.mjs'], { cwd: root, env, stdio: 'ignore' });
    const second = await Promise.all(archives.map(name => readFile(path.join(outputDirectory, name))));

    for (let index = 0; index < archives.length; index += 1) {
      assert.deepEqual(second[index], first[index], archives[index] + ' changed between identical package runs');
    }
  } finally {
    await rm(outputDirectory, { recursive: true, force: true });
  }
});
