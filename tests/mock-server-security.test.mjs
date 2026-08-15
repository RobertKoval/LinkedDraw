import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function waitForServer(child) {
  let output = '';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', chunk => { output += chunk; });
  const deadline = Date.now() + 5000;
  while (!output.includes('Mock LinkedIn profile:')) {
    if (child.exitCode !== null) throw new Error(`mock server exited early (${child.exitCode}): ${output}`);
    if (Date.now() >= deadline) throw new Error(`mock server did not start: ${output}`);
    await new Promise(resolve => setTimeout(resolve, 25));
  }
}

test('mock server cannot read a sibling path through encoded traversal', async () => {
  const parent = await mkdtemp(path.join(tmpdir(), 'linked-draw-mock-security-'));
  const siteRoot = path.join(parent, 'public');
  const sibling = path.join(parent, 'public-private');
  await mkdir(siteRoot, { recursive: true });
  await mkdir(sibling, { recursive: true });
  await writeFile(path.join(siteRoot, 'index.html'), 'controlled-public-fixture');
  await writeFile(path.join(sibling, 'secret.txt'), 'must-not-be-served');
  const child = spawn(process.execPath, ['scripts/mock-server.mjs'], {
    cwd: root,
    env: {
      ...process.env,
      LINKED_DRAW_MOCK_ROOT: siteRoot,
      LINKED_DRAW_MOCK_PORT: '4174'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  try {
    await waitForServer(child);
    const baseline = await fetch('http://127.0.0.1:4174/');
    assert.equal(await baseline.text(), 'controlled-public-fixture');
    const response = await fetch('http://127.0.0.1:4174/%2e%2e%2fpublic-private/secret.txt');
    assert.equal(response.status, 404);
    assert.equal(response.headers.get('access-control-allow-origin'), null);
    assert.equal(await response.text(), 'Not found');
  } finally {
    child.kill('SIGTERM');
    await new Promise(resolve => child.once('exit', resolve));
    await rm(parent, { recursive: true, force: true });
  }
});
