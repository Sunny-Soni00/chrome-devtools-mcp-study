import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Resolve assets relative to this file so the server runs from any cwd.
const here = import.meta.dirname;

const routes = {
  '/': ['text/html', () => readFileSync(join(here, 'public/index.html'))],
  '/app.js': ['text/javascript', () => readFileSync(join(here, 'public/app.js'))],
  // NOTE: the real endpoint is /api/todo-list, and it returns { todos: [...] }
  '/api/todo-list': ['application/json', () => JSON.stringify({
    todos: [
      { id: 1, title: 'Write MCP assignment', done: false },
      { id: 2, title: 'Run a perf trace', done: true },
      { id: 3, title: 'Ship the write-up', done: false },
    ],
  })],
};

createServer((req, res) => {
  const route = routes[req.url];
  if (!route) {
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found', path: req.url }));
    return;
  }
  res.writeHead(200, { 'content-type': route[0], 'cache-control': 'no-store' });
  res.end(route[1]());
}).listen(8931, () => console.log('listening on http://localhost:8931'));
