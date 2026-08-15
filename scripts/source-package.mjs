import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDeterministicZip } from './lib/deterministic-zip.mjs';
import { sourcePathAllowed } from './lib/source-policy.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const outputDirectory = process.env.SOURCE_PACKAGE_OUTPUT
  ? path.resolve(process.env.SOURCE_PACKAGE_OUTPUT)
  : path.join(root, 'artifacts');
const archiveName = process.env.SOURCE_PACKAGE_NAME || `linked-draw-source-${packageJson.version}.zip`;
const destination = path.join(outputDirectory, archiveName);
await mkdir(outputDirectory, { recursive: true });

async function listSourceFiles(directory, prefix = '') {
  const result = [];
  const entries = (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (!sourcePathAllowed(relative, entry.isDirectory())) continue;
    const full = path.join(directory, entry.name);
    const metadata = await lstat(full);
    if (metadata.isSymbolicLink()) throw new Error(`Source archive refuses symbolic link: ${relative}`);
    if (entry.isDirectory()) result.push(...await listSourceFiles(full, relative));
    else if (metadata.isFile()) result.push({ full, relative: `linked-draw/${relative}`, executable: Boolean(metadata.mode & 0o111) });
    else throw new Error(`Source archive refuses non-regular file: ${relative}`);
  }
  return result;
}

const archive = await createDeterministicZip(await listSourceFiles(root), destination, {
  isExecutable: file => file.executable
});
const digest = createHash('sha256').update(archive).digest('hex');
await writeFile(`${destination}.sha256`, `${digest}  ${path.basename(destination)}\n`);
console.log(`Packaged ${path.basename(destination)} (${archive.length} bytes, sha256 ${digest})`);
