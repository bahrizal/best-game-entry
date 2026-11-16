// Dev server for Neon Tide: serves game/ on http://localhost:8080 so you can play
// it in a desktop browser. Not part of the graded entry — main.ts only copies
// game/ and screenshots/ to /output.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = join(here, 'game');
const port = Number(process.env.PORT ?? 8080);

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '');
    const file = join(root, path === '' ? 'index.html' : path);
    if (!file.startsWith(root)) throw new Error('outside game/');
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
}).listen(port, () => {
  console.log(`Neon Tide at http://localhost:${port}`);
});
