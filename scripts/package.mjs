import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDeterministicZip } from './lib/deterministic-zip.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const outputDirectory = process.env.LINKED_DRAW_PACKAGE_OUTPUT
  ? path.resolve(process.env.LINKED_DRAW_PACKAGE_OUTPUT)
  : path.join(root, 'artifacts');
await mkdir(outputDirectory, { recursive: true });

async function listFiles(directory, prefix = '') {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === '.DS_Store' || entry.name === '__MACOSX' || entry.name.startsWith('._')) continue;
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) throw new Error(`Browser archive refuses symbolic link: ${relative}`);
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await listFiles(full, relative));
    else result.push({ full, relative });
  }
  return result.sort((a, b) => a.relative.localeCompare(b.relative));
}

const targets = [
  ['chrome', `linked-draw-chromium-${packageJson.version}.zip`],
  ['firefox', `linked-draw-firefox-${packageJson.version}.zip`],
  ['safari', `linked-draw-safari-source-${packageJson.version}.zip`]
];

const sums = [];
for (const [target, filename] of targets) {
  const archive = await createDeterministicZip(
    await listFiles(path.join(root, 'dist', target)),
    path.join(outputDirectory, filename)
  );
  const hash = createHash('sha256').update(archive).digest('hex');
  sums.push(`${hash}  ${filename}`);
  console.log(`Packaged ${filename} (${archive.length} bytes)`);
}
await writeFile(path.join(outputDirectory, 'SHA256SUMS.txt'), `${sums.join('\n')}\n`);
