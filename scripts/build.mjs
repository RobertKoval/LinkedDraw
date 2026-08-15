import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const targets = ['chrome', 'firefox', 'safari', 'dev'];
const requested = process.argv[2] || 'all';
const selected = requested === 'all' ? targets : [requested];

for (const target of selected) {
  if (!targets.includes(target)) {
    throw new Error(`Unknown build target: ${target}`);
  }
}

function deepMerge(base, patch) {
  if (Array.isArray(patch)) return structuredClone(patch);
  if (!patch || typeof patch !== 'object') return patch;
  const result = { ...(base && typeof base === 'object' && !Array.isArray(base) ? base : {}) };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      delete result[key];
      continue;
    }
    result[key] = value && typeof value === 'object' && !Array.isArray(value)
      ? deepMerge(result[key], value)
      : structuredClone(value);
  }
  return result;
}

function shouldCopy(source) {
  const name = path.basename(source);
  return name !== '.DS_Store' && name !== '__MACOSX' && !name.startsWith('._');
}

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

const packageJson = await readJson(path.join(root, 'package.json'));
const baseManifest = await readJson(path.join(root, 'manifests', 'base.json'));

await mkdir(path.join(root, 'dist'), { recursive: true });

for (const target of selected) {
  const destination = path.join(root, 'dist', target);
  await rm(destination, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });
  await cp(path.join(root, 'src', 'extension'), destination, { recursive: true, filter: shouldCopy });

  const patch = await readJson(path.join(root, 'manifests', `${target}.json`));
  const manifest = deepMerge(baseManifest, patch);
  manifest.version = packageJson.version;
  await writeFile(path.join(destination, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(`Built ${target}: ${path.relative(root, destination)}`);
}
