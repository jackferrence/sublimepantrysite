import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';

/**
 * A plain, foreground static file server for dist/, used only by
 * playwright.config.ts (tests/a11y). `astro preview` daemonizes itself —
 * it forks a background process and the CLI invocation returns immediately
 * — which Playwright's `webServer` can't track (it expects a normal
 * foreground process it starts and kills), so it reports "exited early"
 * even though a server is genuinely running. This avoids that with the
 * plainest possible implementation rather than adding a new dependency
 * (http-server, serve) for one CI step.
 */
const ROOT = new URL('../dist/', import.meta.url);
const PORT = Number(process.env.PORT ?? 4321);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

async function resolve(urlPath) {
  const clean = urlPath.split('?')[0];
  const candidates = clean.endsWith('/')
    ? [`${clean}index.html`]
    : [clean, `${clean}.html`, `${clean}/index.html`];
  for (const candidate of candidates) {
    const filePath = new URL('.' + candidate, ROOT);
    try {
      const s = await stat(filePath);
      if (s.isFile()) return filePath;
    } catch {
      // try next candidate
    }
  }
  return null;
}

const server = createServer(async (req, res) => {
  const filePath = await resolve(req.url ?? '/');
  if (!filePath) {
    const notFound = new URL('./404.html', ROOT);
    try {
      const body = await readFile(notFound);
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
    return;
  }
  const body = await readFile(filePath);
  const type = TYPES[extname(filePath.pathname)] ?? 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type });
  res.end(body);
});

server.listen(PORT, 'localhost', () => {
  console.log(`static-server: serving dist/ at http://localhost:${PORT}`);
});
