// One-command runner for the assignment evidence.
//
//   node run.mjs task1     -> the mobile-throttled performance trace (public URL)
//   node run.mjs task2     -> the full three-stage debugging story on the local app
//   node run.mjs all       -> both, in order
//
// It starts the demo server itself, rewrites app.js to the right stage between
// runs, and shuts everything down afterwards, so there is nothing to start or
// stop by hand.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const here = import.meta.dirname;
const APP = join(here, 'demo-app/public/app.js');

// The pristine broken version, restored on exit so the repo stays reproducible.
const BROKEN = readFileSync(APP, 'utf8');
const URL_FIXED = BROKEN.replace("'/api/todos'", "'/api/todo-list'");
const FULLY_FIXED = URL_FIXED.replace('data.items', 'data.todos');

function banner(text) {
  console.log('\n' + '='.repeat(78));
  console.log(text);
  console.log('='.repeat(78));
}

function run(file) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(here, 'mcp-driver.mjs'), join(here, file)], {
      cwd: here,
      stdio: 'inherit',
      env: { ...process.env, MCP_QUIET: '1' },
    });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${file} exited ${code}`))));
  });
}

function startServer() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(here, 'demo-app/server.mjs')], {
      cwd: here,
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    const timer = setTimeout(() => reject(new Error('demo server did not start in 15s')), 15000);
    child.stdout.on('data', (d) => {
      if (d.toString().includes('listening')) {
        clearTimeout(timer);
        console.log('[demo server] ' + d.toString().trim());
        resolve(child);
      }
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`demo server exited ${code} (is port 8931 already in use?)`));
    });
  });
}

async function task1() {
  banner('TASK 1  Performance trace of a public docs site, 4x CPU + Slow 4G\n'
    + 'Expect: LCP dominated by render delay, not TTFB. Live numbers will differ from\n'
    + 'the recorded evidence — the site changes.');
  await run('task1b.json');
}

async function task2() {
  const server = await startServer();
  try {
    writeFileSync(APP, BROKEN);
    banner('TASK 2, STAGE 1  The page is stuck on "Loading…"\n'
      + 'Expect: a 404 on /api/todos and an "Uncaught (in promise)" at app.js:6.');
    await run('task2.json');

    writeFileSync(APP, URL_FIXED);
    banner('TASK 2, STAGE 2  URL fixed -> 200, but the page is STILL stuck\n'
      + 'Expect: the response body says {"todos":[...]}, while app.js reads data.items.');
    await run('task2c.json');

    writeFileSync(APP, FULLY_FIXED);
    banner('TASK 2, STAGE 3  data.items -> data.todos\n'
      + 'Expect: three list items in the snapshot and {"rendered":3} from evaluate_script.');
    await run('task2d.json');
    await run('task2e.json');
  } finally {
    writeFileSync(APP, BROKEN);
    server.kill();
    console.log('\n[demo server] stopped; app.js restored to its broken state');
  }
}

const which = process.argv[2] ?? 'all';
if (which === 'task1') await task1();
else if (which === 'task2') await task2();
else if (which === 'all') { await task1(); await task2(); }
else {
  console.error(`Unknown target "${which}". Use: task1 | task2 | all`);
  process.exit(1);
}

banner('Done. Screenshots were written to your OS temp directory (before.png / after.png).');
process.exit(0);
