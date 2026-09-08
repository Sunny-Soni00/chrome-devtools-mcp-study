// Minimal MCP stdio client: spawns chrome-devtools-mcp and runs a scripted
// sequence of tools/call requests, printing each result verbatim.
// Usage: node mcp-driver.mjs <calls.json>
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

const callsFile = process.argv[2];
const calls = JSON.parse(readFileSync(callsFile, 'utf8'));

// Same server the .mcp.json config launches via `npx -y chrome-devtools-mcp@1.8.0`,
// but spawned from a local install so we can drive its stdio directly.
const BIN = './node_modules/chrome-devtools-mcp/build/src/bin/chrome-devtools-mcp.js';
const args = [BIN, ...(process.env.MCP_ARGS ?? '--headless=true --isolated=true').split(' ')];

const child = spawn(process.execPath, args, {
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: false,
});

child.stderr.on('data', (d) => process.stderr.write('[server] ' + d));

let buf = '';
const pending = new Map();
child.stdout.on('data', (d) => {
  buf += d.toString();
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    if (msg.id != null && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  }
});

let nextId = 1;
function send(method, params) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout: ' + method)), 180000);
    pending.set(id, (m) => { clearTimeout(t); resolve(m); });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}
function notify(method, params) {
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
}

function render(res) {
  if (res.error) return 'ERROR ' + JSON.stringify(res.error, null, 2);
  const c = res.result?.content ?? [];
  return c.map((b) => (b.type === 'text' ? b.text : `[${b.type} block, ${b.data?.length ?? 0} b64 chars]`)).join('\n');
}

const init = await send('initialize', {
  protocolVersion: '2025-06-18',
  capabilities: {},
  clientInfo: { name: 'assignment-driver', version: '1.0.0' },
});
notify('notifications/initialized', {});
console.log('=== initialize ===');
console.log(JSON.stringify(init.result.serverInfo), 'protocol:', init.result.protocolVersion);

const listed = await send('tools/list', {});
console.log('=== tools/list ===');
console.log('tool count:', listed.result.tools.length);
// run.mjs replays several task files in a row; printing all 29 names each time
// buries the actual results.
if (!process.env.MCP_QUIET) console.log(listed.result.tools.map((t) => t.name).join(', '));

// The server confines file writes to the OS temp dir unless the client
// negotiates the MCP roots capability, which this minimal client does not.
const BACKSLASH = String.fromCharCode(92);
const vars = { TMP: tmpdir().split(BACKSLASH).join('/') };

for (const call of calls) {
  let json = JSON.stringify(call.arguments ?? {});
  for (const [k, v] of Object.entries(vars)) json = json.split(`{{${k}}}`).join(v);
  const argsObj = JSON.parse(json);
  console.log(`\n=== tools/call ${call.name} ${JSON.stringify(argsObj)} ===`);
  const t0 = Date.now();
  const res = await send('tools/call', { name: call.name, arguments: argsObj });
  const text = render(res);
  console.log(`(${Date.now() - t0} ms)`);
  console.log(call.head ? text.split('\n').slice(0, call.head).join('\n') : text);
  if (call.capture) {
    for (const [name, re] of Object.entries(call.capture)) {
      const m = text.match(new RegExp(re));
      if (m) { vars[name] = m[1]; console.log(`[captured ${name} = ${m[1]}]`); }
      else console.log(`[capture ${name} FAILED for /${re}/]`);
    }
  }
}

child.stdin.end();
child.kill();
process.exit(0);
