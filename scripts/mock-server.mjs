import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dev', 'mock-site');
const root = process.env.LINKED_DRAW_MOCK_ROOT
  ? path.resolve(process.env.LINKED_DRAW_MOCK_ROOT)
  : defaultRoot;
const host = '127.0.0.1';
const configuredPort = Number(process.env.LINKED_DRAW_MOCK_PORT);
const port = Number.isInteger(configuredPort) && configuredPort > 0 && configuredPort <= 65535
  ? configuredPort
  : 4173;
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg'
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${host}:${port}`);
    const relative = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const file = path.resolve(root, `.${relative}`);
    const containedPath = path.relative(root, file);
    if (containedPath.startsWith('..' + path.sep) || containedPath === '..' || path.isAbsolute(containedPath)) {
      throw new Error('Forbidden');
    }
    const info = await stat(file);
    if (!info.isFile()) throw new Error('Not found');
    const body = await readFile(file);
    response.writeHead(200, {
      'content-type': mime[path.extname(file)] || 'application/octet-stream',
      'cache-control': 'no-store'
    });
    response.end(body);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});

server.listen(port, host, () => {
  console.log(`Mock LinkedIn profile: http://${host}:${port}/`);
  console.log('Load dist/dev as an unpacked extension before opening the page.');
});
