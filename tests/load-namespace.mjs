import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function loadNamespace(relativeFiles, extras = {}) {
  const context = {
    console,
    URL,
    URLSearchParams,
    Set,
    Map,
    WeakMap,
    Promise,
    Math,
    Date,
    JSON,
    Number,
    String,
    Boolean,
    Array,
    Object,
    RegExp,
    Error,
    TypeError,
    ...extras
  };
  context.globalThis = context;
  vm.createContext(context);

  for (const relative of relativeFiles) {
    const source = await readFile(path.join(root, 'src', 'extension', relative), 'utf8');
    vm.runInContext(source, context, { filename: relative });
  }
  return context.LinkedDraw;
}
