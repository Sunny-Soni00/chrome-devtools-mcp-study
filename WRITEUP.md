# Popular but Underused: `chrome-devtools-mcp`

**MCP server:** Chrome DevTools MCP
**Source:** https://github.com/ChromeDevTools/chrome-devtools-mcp
**npm package:** `chrome-devtools-mcp` (version pinned for this work: **1.8.0**)
**Official MCP registry entry:** `io.github.ChromeDevTools/chrome-devtools-mcp`
**License:** Apache-2.0 · **Maintainer:** the Chrome DevTools team at Google
**Cost / auth:** free, no account, no API key

> **Visual version:** [Chrome DevTools MCP Dossier](https://claude.ai/code/artifact/a971319d-d98f-4967-8fc3-8f1ac262acbe)
> — the same findings as a report page, with the LCP breakdown drawn to scale and the
> before/after screenshots inline. Source: [`report.html`](report.html).
>
> **To run everything yourself:** `run.cmd` (Windows) or `./run.sh` from this folder.
> It installs the server, starts the demo app, replays both tasks with commentary, and
> cleans up. Details in [Reproduce it — one command](#reproduce-it--one-command).

---

## 1. What it is, and why it qualifies as "popular but less used"

Chrome DevTools MCP hands an agent the *instrumentation* side of Chrome, not just the
driving side. It launches (or attaches to) a real Chrome, then exposes the panels a
front-end engineer actually lives in — the Performance panel's trace recorder and its
insight engine, the Network panel's request list with full headers and response bodies,
the Console, the accessibility tree, CPU/network throttling, Lighthouse, and heap
snapshots — as **29 MCP tools** over stdio.

### Where I found it

The Chrome DevTools "MCP" documentation page and the official MCP registry
(`registry.modelcontextprotocol.io`), which lists it under the maintainer namespace
`io.github.ChromeDevTools`.

### What convinced me it is real

Numbers pulled live on 2026-09-08:

| Signal | Value | How I checked |
|---|---|---|
| GitHub stars | **51,307** | `api.github.com/repos/ChromeDevTools/chrome-devtools-mcp` |
| Forks | 3,612 | same |
| Last push | **2026-09-08** (same day) | same |
| Licence | Apache-2.0 | same |
| npm downloads, last week | **1,465,302** | `api.npmjs.org/downloads/point/last-week/...` |
| Owner | `ChromeDevTools` GitHub org (Google) | repo owner |

So: a named vendor team, a permissive licence, commits landing the day I used it, and
seven-figure weekly installs. This is not a three-star weekend repo.

### The honest case for "less used"

I want to be straight about this, because the raw download number cuts both ways:

```
@playwright/mcp                            6,364,011  /week   <- the obvious browser pick
chrome-devtools-mcp                        1,465,302  /week   <- this one
@modelcontextprotocol/server-filesystem       954,129  /week
```

It is **not** obscure. The argument for "less used" is comparative and category-specific:

1. **It loses 4.3 : 1 to Playwright MCP**, the server everybody reaches for when they
   think "let the agent use a browser." When people want browser automation they install
   Playwright; almost nobody installs a *profiler*.
2. **It is not a reference server.** The `modelcontextprotocol/servers` README does not
   mention Chrome at all (I grepped it — zero hits). It is a vendor-shipped third-party
   server, exactly the category the assignment points at.
3. **It is absent from the marketplace people browse.** The assignment points at Smithery
   as a discovery surface, so I queried its registry API
   (`registry.smithery.ai/servers?q=…`) for `chrome-devtools-mcp`, `devtools` and
   `playwright`. Neither this server nor the official Playwright MCP came back — the
   results were unrelated third-party servers. Smithery's search is fuzzy, so I won't
   claim it is definitively unlisted; what I can say is that a straightforward keyword
   search there does not surface it. It is distributed through npm, the official MCP
   registry, and Chrome's own docs instead.
4. **The half people use is not the interesting half.** The tutorials that mention it use
   `navigate_page` / `click` / `take_snapshot` — the Playwright-shaped subset. The
   `performance_*`, heap-snapshot, and `emulate` tools, which are the reason this server
   exists and which nothing else in the MCP ecosystem offers, are the part almost nobody
   touches. Both of my hands-on tasks below deliberately live in that half.

---

## 2. How I set it up

### Environment

Windows 11, Node v24.13.1, npm 11.8.0, Google Chrome installed at
`C:\Program Files\Google\Chrome\Application\chrome.exe`. No Docker needed. No credentials
of any kind — **there is no secret in this write-up to redact, because the server has no
auth surface at all.**

### The command I ran

```bash
claude mcp add chrome-devtools --scope project -- npx -y chrome-devtools-mcp@1.8.0 --headless=true --isolated=true
```

### The config it produced (`.mcp.json`, project scope)

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "chrome-devtools-mcp@1.8.0",
        "--headless=true",
        "--isolated=true"
      ],
      "env": {}
    }
  }
}
```

### What each piece actually does

- **`"type": "stdio"`** — the client spawns the server as a child process and speaks
  JSON-RPC 2.0 over its stdin/stdout. No port, no network listener, no daemon. The
  server's lifetime is the client's lifetime, which also means the browser it controls
  dies with the session.
- **`npx -y`** — resolve and run the package without a global install; `-y` skips the
  install prompt, which would otherwise hang a stdio server forever waiting on a stdin
  that the MCP client is using for protocol traffic.
- **`chrome-devtools-mcp@1.8.0`** — **pinned deliberately.** The published docs say
  `@latest`. On a tool that spawns a browser and reads every response body on the page, I
  do not want `npx` silently pulling a new major on a random Tuesday. Pinning is the whole
  difference between a reproducible audit and an unaudited binary.
- **`--headless=true`** — no visible window. Right for CI and for scripted runs; turn it
  **off** when you want to watch the agent work, which is genuinely useful for debugging
  the debugging.
- **`--isolated=true`** — the docs define it as: *"creates a temporary user-data-dir that
  is automatically cleaned up after the browser is closed. Defaults to false."* What the
  default actually gives you is the important part, and it is not what I first assumed: it
  is **not** your everyday Chrome profile, but a **persistent** dedicated one at
  `$HOME/.cache/chrome-devtools-mcp/chrome-profile`. So the real risk `--isolated` removes
  is *accumulation* — log into a staging app in one agent session and that cookie is still
  sitting in the profile for the next session, and for whatever page it visits. Isolation
  makes each run start empty and leave nothing behind. (Pointing the server at your genuine
  browser is a different flag entirely — `--browserUrl`/`--wsEndpoint`, which attach to an
  already-running debuggable Chrome. That is the one to think twice about.)
- **`--scope project`** — the config lives in `.mcp.json` next to the code, so it travels
  with the repo instead of being a personal machine setting.

### Gotchas that cost me time

1. **`npx.cmd` cannot be spawned directly from Node 24 on Windows** — `spawn EINVAL`. I
   drive the server from my own harness (see §3), so I hit this immediately. Fixed by
   installing the package locally and spawning
   `node ./node_modules/chrome-devtools-mcp/build/src/bin/chrome-devtools-mcp.js` with
   `process.execPath`. This is a limitation of *my* harness, not of the server or of the
   `.mcp.json` config: Claude Code launches the same `npx` command without trouble — see
   the `✔ Connected` health check in gotcha 6.
2. **`pageId` is a *number*, not a string**, even though `list_pages` prints it as
   `1:`/`2:`. Passing `"2"` gets you
   `MCP error -32602: ... Expected number, received string at pageId`.
3. **`viewport` is a *string* like `"412x915"`**, not a `{width, height}` object — the
   opposite of every other browser API I've used.
4. **Console message `types` uses `"warn"`, not `"warning"`.** The error message is
   excellent, though: it enumerates all 20 valid enum values.
5. **Roots capability affects where files can be written.** On connect the server logged:
   `The connecting client did not negotiate the MCP roots capability. File-writing tools
   will be restricted to the OS temp directory.` My minimal harness declares no
   capabilities, so every `filePath` I pass (screenshots, traces) must land under the OS
   temp dir. This is a sandbox, not a bug — worth knowing before you spend ten minutes
   wondering why your screenshot didn't appear where you asked. My harness now substitutes
   a `{{TMP}}` token with `os.tmpdir()` so the screenshot steps are portable rather than
   hard-coding one machine's path.
6. **A project-scoped server is not live until the folder is trusted.** Straight after
   `claude mcp add --scope project`, the health check reported:

   ```
   $ claude mcp get chrome-devtools
   chrome-devtools:
     Scope: Project config (shared via .mcp.json)
     Status: ⏸ Pending approval (run `claude` to approve)
     Type: stdio
     Command: npx
     Args: -y chrome-devtools-mcp@1.8.0 --headless=true --isolated=true
   ```

   I shipped `.claude/settings.json` with `{"enabledMcpjsonServers": ["chrome-devtools"]}`,
   which is the documented pre-approval, and the status **stayed** `⏸ Pending approval`.
   That is expected, not broken: the docs say approvals committed to the project are
   ignored until you trust the workspace by running `claude` in the folder and accepting
   the trust dialog. Once I did exactly that, the same command reports
   (`evidence/claude-mcp-status.txt`):

   ```
   $ claude mcp list
   Checking MCP server health…

   chrome-devtools: npx -y chrome-devtools-mcp@1.8.0 --headless=true --isolated=true - ✔ Connected
   ```

   So the config in this folder is live and health-checked, launched by Claude Code's own
   MCP client from the `npx` command in `.mcp.json`.

   Worth stating plainly as a security point rather than a footnote: that prompt exists so
   a human vets a server before it runs. Committing `enabledMcpjsonServers` trades that
   review for convenience — reasonable for a team that already vetted the server, wrong as
   a default.

### How I ran it (and why)

This session's Claude Code process was already running, so a newly added MCP server's
tools would not appear until restart. Rather than claim results I couldn't show, I wrote a
~90-line MCP client — [`harness/mcp-driver.mjs`](harness/mcp-driver.mjs) — that spawns the
**same server binary the `.mcp.json` above launches**, performs the real
`initialize` → `notifications/initialized` → `tools/list` → `tools/call` handshake, and
prints every response verbatim. Every transcript in §3 is raw stdout from that harness,
saved under [`evidence/`](evidence/). Side benefit: it forced me to read the wire protocol
rather than trust a UI.

**Where I got blocked, stated exactly.** I tried to capture a transcript of Claude Code's
*own* MCP client calling these tools headlessly, so the evidence wouldn't depend on my
harness at all:

```
$ claude -p "Use ONLY the chrome-devtools MCP server tools..." \
    --allowedTools "mcp__chrome-devtools__new_page,mcp__chrome-devtools__list_network_requests"
Failed to authenticate: OAuth session expired and could not be refreshed
```

A second, non-interactive CLI session can't borrow the running app's credentials, so
scripted capture of that path is closed to me here.

What survives that, and what doesn't. Claude Code's own MCP client **does** connect to this
config — `claude mcp list` reports `✔ Connected` once the folder is trusted (gotcha 6), so
the server, the `npx` command and the 29 tools are live in an interactive session in this
folder. What I could not *script* is a Claude-Code-authored tool-call transcript. So: **the
server, binary, arguments and protocol below are exactly what `.mcp.json` specifies and
every byte of output is real, but the client issuing these particular calls is my ~90-line
harness.** Driving it from an interactive session is a live demo, not a captured one.

Handshake output:

```
=== initialize ===
{"name":"chrome_devtools","title":"Chrome DevTools MCP server","version":"1.8.0"} protocol: 2025-06-18
=== tools/list ===
tool count: 29
click, close_page, drag, emulate, evaluate_script, fill, fill_form, get_console_message,
get_network_request, handle_dialog, hover, lighthouse_audit, list_console_messages,
list_network_requests, list_pages, navigate_page, new_page, performance_analyze_insight,
performance_start_trace, performance_stop_trace, press_key, resize_page, select_page,
take_heapsnapshot, take_screenshot, take_snapshot, type_text, upload_file, wait_for
```

---

## 3. Hands-on evidence

### Task 1 — "Is this docs site fast on a mid-range Android phone?"

A real question with a real answer. I emulated a throttled mobile device, recorded a
Performance trace across a reload, and drilled into three insights.
Full log: [`evidence/task1b.log`](evidence/task1b.log).

```
=== tools/call emulate {"pageId":2,"cpuThrottlingRate":4,"networkConditions":"Slow 4G","viewport":"412x915"} ===
(234 ms)
Emulation configured successfully
Emulating network conditions: Slow 4G
Emulating viewport: {"isMobile":false,"hasTouch":false,"isLandscape":false,"width":412,"height":915}
Emulating CPU throttling: 4x slowdown

=== tools/call performance_start_trace {"pageId":2,"reload":true,"autoStop":true} ===
(12268 ms)
The performance trace has been stopped.
## Summary of Performance trace findings:
URL: https://modelcontextprotocol.io/docs/2026-07-28/getting-started/intro
CPU throttling: 4x
Network throttling: Slow 4G

## insight set id: NAVIGATION_0
Metrics (lab / observed):
  - LCP: 1794 ms, event: (eventKey: r-12402, ts: 726997851750), nodeId: 36
  - LCP breakdown:
    - TTFB: 33 ms
    - Render delay: 1,761 ms
  - CLS: 0.00
Metrics (field / real users):
  - LCP: 1256 ms (scope: url)
  - LCP breakdown:
    - TTFB: 477 ms | Load delay: 434 ms | Load duration: 279 ms | Render delay: 128 ms
  - INP: 74 ms (scope: url)
  - CLS: 0.00 (scope: url)
  - The above data is from CrUX–Chrome User Experience Report...
```

Then the drill-down, which is the part no other MCP server can do:

```
=== tools/call performance_analyze_insight {"insightSetId":"NAVIGATION_0","insightName":"LCPBreakdown"} ===
## Insight Title: LCP breakdown
The Largest Contentful Paint (LCP) time for this navigation was 1,794 ms.
The LCP element (SPAN, nodeId: 36) is text and was not fetched from the network.
- Time to first byte: 33 ms (1.8% of total LCP time)
- Element render delay: 1,761 ms (98.2% of total LCP time)

=== tools/call performance_analyze_insight {"insightName":"ThirdParties"} ===
The following list contains the largest transfer sizes by a 3rd party script:
- mintcdn.com: 10.4 kB
- cloudfront.net: 1.9 kB
The following list contains the largest amount spent by a 3rd party script on the main thread:
- Cloudflare: 57 ms

=== tools/call performance_analyze_insight {"insightName":"LegacyJavaScript"} ===
Total legacy JavaScript: 2 files.
- Script: .../_next/static/chunks/f486afc314643ce1.js - Wasted bytes: 14449 bytes
Matches:
Line: 0, Column: 4193, Name: Array.prototype.at
Line: 0, Column: 3581, Name: Array.prototype.flat
Line: 0, Column: 3694, Name: Array.prototype.flatMap
Line: 0, Column: 4070, Name: Object.fromEntries
Line: 0, Column: 4328, Name: Object.hasOwn
Line: 0, Column: 3323, Name: String.prototype.trimEnd
Line: 0, Column: 3238, Name: String.prototype.trimStart
```

**What I actually learned from it, as an engineer:** the page is not network-bound —
TTFB is 33 ms and is 1.8% of LCP. **98.2% of LCP is render delay**, i.e. the browser had
the bytes and was busy executing JavaScript instead of painting. The fix direction is
"ship less/earlier JS", not "add a CDN". The `LegacyJavaScript` insight then names 24.9 kB
of that JS as transpiler polyfills for `Array.prototype.at`, `Object.hasOwn` and friends —
features every browser this site supports has shipped for years. That is a build-config
one-liner with a measurable payoff, found without me opening a browser.

The lab-vs-field split is the other genuinely useful thing here: my throttled lab LCP
(1794 ms) is *worse* than what real users see (CrUX p75, 1256 ms), which correctly tells me
not to panic — my 4× CPU throttle is harsher than the median real visitor.

### Task 2 — "The todo list renders 'Loading…' forever. Why?"

A classic front-end bug hunt against a small local app
([`harness/demo-app/`](harness/demo-app/)) with two planted defects: a wrong endpoint path
and a wrong response field. I never opened a browser or read the source to diagnose it —
only console + network tools.

**Stage 1 — symptom** ([`evidence/task2.log`](evidence/task2.log)):

```
=== tools/call list_console_messages {"pageId":2,"includeStackTraces":true} ===
msgid=1 [error] Failed to load resource: the server responded with a status of 404 (Not Found)
msgid=2 [error] Uncaught (in promise) (0 args)
  at render (app.js:6:6)
  --- await ------------------------------
  at  (app.js:9:1)

=== tools/call list_network_requests {"resourceTypes":["fetch","xhr","document","script"]} ===
reqid=1 GET http://localhost:8931/          [200]
reqid=2 GET http://localhost:8931/app.js    [200]
reqid=3 GET http://localhost:8931/api/todos [404]

=== tools/call take_snapshot ===
uid=1_0 RootWebArea "Todo board"
  uid=1_1 heading "Todo board" level="1"
  uid=1_2 StaticText "Loading…"
```

Diagnosis: `/api/todos` 404s. Fix: the route is `/api/todo-list`. Screenshot:
[`evidence/before.png`](evidence/before.png).

**Stage 2 — the second bug, found from the response body**
([`evidence/task2c.log`](evidence/task2c.log)). After fixing the URL the fetch returns 200,
but the page is *still* stuck, and the console error is unhelpfully terse. So I pulled the
actual response off the wire:

```
=== tools/call get_network_request {"pageId":2,"reqid":3} ===
## Request http://localhost:8931/api/todo-list
Status: 200
### Request Headers
- user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) ... HeadlessChrome/152.0.0.0 ...
- sec-fetch-mode:cors
### Response Headers
- cache-control:no-store
- content-type:application/json
### Response Body
{"todos":[{"id":1,"title":"Write MCP assignment","done":false},{"id":2,"title":"Run a perf trace","done":true},{"id":3,"title":"Ship the write-up","done":false}]}
```

The payload key is `todos`; `app.js:6` reads `data.items`. `undefined.map(...)` — that is
the `Uncaught (in promise)` at `app.js:6:6`. Fix: `data.items` → `data.todos`.

**Stage 3 — verification** ([`evidence/task2d.log`](evidence/task2d.log),
[`evidence/task2e.log`](evidence/task2e.log)):

```
=== tools/call take_snapshot ===
uid=1_0 RootWebArea "Todo board" url="http://localhost:8931/"
  uid=1_1 heading "Todo board" level="1"
  uid=1_2 StaticText "⬜ Write MCP assignment"
  uid=1_3 StaticText "✅ Run a perf trace"
  uid=1_4 StaticText "⬜ Ship the write-up"

=== tools/call evaluate_script {"function":"() => ({ rendered: ..., text: ... })"} ===
Script ran on page and returned:
{"rendered":3,"text":"⬜ Write MCP assignment\n✅ Run a perf trace\n⬜ Ship the write-up"}

=== tools/call list_console_messages {"types":["error","warn"]} ===
msgid=1 [error] Failed to load resource: the server responded with a status of 404 (Not Found)
```

Three items render and `list_network_requests` confirms `/api/todo-list [200]`. Screenshot:
[`evidence/after.png`](evidence/after.png).

**One honest loose end:** that last remaining 404 is *not* the bug returning. I checked it
rather than assuming — an unfiltered `list_network_requests` shows
`reqid=4 GET http://localhost:8931/favicon.ico [404]`. My toy server has no favicon. Worth
saying out loud because "verified fixed, one unrelated 404 remains, here's what it is" is
the actual standard, and a filtered query had hidden the answer from me.

---

### Three side experiments I ran to check my own claims

Writing §4–§6 meant asserting things like "curl couldn't have told you this" and "`--slim`
reduces the blast radius." Those are cheap to test, so I tested them instead of asserting.

**Experiment 1 — could `curl` have answered Task 1?** ([`evidence/exp-curl-vs-trace.txt`](evidence/exp-curl-vs-trace.txt))

```
attempt1  ttfb=0.267102s  total=0.306945s  bytes=89132  http=307
attempt2  ttfb=0.280781s  total=0.307872s  bytes=89132  http=307
attempt3  ttfb=0.213605s  total=0.247151s  bytes=89132  http=307
```

curl's verdict on the exact page from Task 1: responds in ~0.25 s, ships ~87 kB, **nothing
to fix.** The trace's verdict on that same page: LCP 1794 ms, 98.2% of it render delay.
Both measurements are correct; they measure different things. Render delay happens *after*
curl has hung up, so the cheap tool is not a weaker version of the expensive one here — it
is blind to the actual problem. That is the concrete basis for §4, and equally for §5:
where the answer *is* server-side, curl wins outright.

**Experiment 2 — does `--slim` really shrink the surface?** ([`evidence/exp-slim.txt`](evidence/exp-slim.txt))

```
### default
tool count: 29
### with --slim
tool count: 3
evaluate, navigate, screenshot

=== tools/call list_pages {} ===
MCP error -32602: Tool list_pages not found
```

Confirmed, and with a detail the docs don't mention: the slim tools are **renamed**, not a
subset — `evaluate`/`navigate`/`screenshot`, not `evaluate_script`/`navigate_page`/
`take_screenshot`. So `--slim` is not a drop-in for an existing prompt or allowlist.

**Experiment 3 — does `--redactNetworkHeaders` actually protect credentials?**
([`evidence/exp-redaction.txt`](evidence/exp-redaction.txt)) This is the one that changed
how I'd configure the server. I used `emulate` to inject a **fabricated** bearer token and
cookie, reloaded, and read the request back — same steps, two server configs:

```
### A) default config
## Request http://localhost:8931/
- authorization:Bearer FAKE-DEMO-TOKEN-NOT-REAL
- cookie:session=FAKE-DEMO-SESSION

### B) same, plus --redactNetworkHeaders
## Request http://localhost:8931/
- authorization:<redacted>
- cookie:<redacted>
```

**By default, every credential on the page reaches the model in plain text.** The docs say
this flag "redacts some of the network headers considered sensitive"; the experiment shows
it does cover `authorization` and `cookie`, and that it is **off unless you ask for it**.
Nothing in the README nudges you toward it. See §6.

---

## 4. When I would reach for it

**Scenario: a performance regression that only shows up on real hardware.** A PR lands and
mobile LCP goes from 1.9 s to 3.4 s. Nobody can reproduce it on a MacBook.

The obvious alternatives fail in specific ways. A Lighthouse CI score says *3.4 s, bad* —
a number, not a cause. Playwright MCP can drive the page and screenshot it, but it has no
trace recorder, so it cannot tell you where the 1.5 s went. `curl` measures the server,
which in Task 1 was 1.8% of the problem.

Chrome DevTools MCP is the only one of those that closes the loop *in a single agent
session*: emulate a 4× CPU throttle and Slow 4G → record a trace across reload → get LCP
split into TTFB vs render delay → `performance_analyze_insight` names the render-blocking
requests, the third-party origins and the legacy-polyfill bytes → fix → re-trace and
compare. That is the DevTools Performance panel workflow, minus the human doing the
clicking, and it produces a *cause with an estimated saving*, which is what a PR review
needs.

The second place it clearly wins is **any bug whose evidence lives in the browser rather
than in the source**: a 404 from a path typo, an API contract drift like Task 2's
`items`/`todos`, a CORS preflight failure, a memory leak (`take_heapsnapshot` +
`compare_heapsnapshots` across an interaction). Reading source code to find those is
guessing; reading the response body is knowing.

## 5. When I would *not* reach for it

**Scenario: "check whether the deploy is live and the API returns the right JSON."**
Reach for `curl` (or a two-line `fetch` in a test). Booting Chrome to answer that costs
~5 s of browser startup, hundreds of megabytes of RAM, a 12 s trace if you're careless, and
several thousand tokens of tool output — to learn something a 200-byte HTTP response
already told you. Task 2's stage-1 diagnosis, in fairness, is one `curl` away too; the
server earned its place at stage 2, not stage 1.

**Also skip it when:**
- **You need to *drive* a browser, not measure one** — multi-step form flows, auth
  journeys, cross-browser checks. Playwright MCP is better at that job and covers Firefox
  and WebKit, which this server explicitly does not (Chrome and Chrome for Testing only).
- **You already have a failing unit or integration test.** If the assertion pins the bug,
  a browser adds nothing but latency.
- **The page requires your logged-in production session.** `--isolated=true` deliberately
  gives you a blank profile; the workaround — `--browserUrl` onto your real, logged-in
  Chrome — is exactly the thing §6 says not to do casually.
- **Sandboxed/headless CI without Chrome, or a container with no `/dev/shm` headroom.**
  It needs a real Chrome binary; that's a hard dependency, not a fallback.

---

## 6. Best practices, permissions, and a failure mode I actually hit

### What it touches

This server is **local-only and unauthenticated** — no API key, no OAuth, no rate limit,
no per-call cost. That makes it feel harmless, and that impression is the risk. The
project's own README is blunt about it:

> "exposes content of the browser instance to the MCP clients allowing them to inspect,
> debug, and modify any data in the browser or DevTools. Avoid sharing sensitive or
> personal information that you don't want to share with MCP clients."

Concretely, an agent holding these tools can read **full response bodies** including
`Authorization` headers and session cookies (`get_network_request`), run arbitrary JS in
page context (`evaluate_script`), dump the JS heap (`take_heapsnapshot`), and click and
submit anything on screen.

There is no OAuth-style scope system, but the server is not all-or-nothing either — it
ships three real controls I found in `docs/configuration.md` rather than the README:

| Flag | Default | What it does |
|---|---|---|
| `--redactNetworkHeaders` | `false` | Turns `Authorization` and `Cookie` into `<redacted>`. **Verified by experiment 3** — off by default, credentials go to the model verbatim. |
| `--slim` | `false` | Cuts the surface to **3 tools**, verified in experiment 2. If all you need is "look at the page", far smaller blast radius than 29 tools. |
| `--filesystemRoot` / `--allowUnrestrictedPaths` | temp dir / `false` | Bound (or deliberately unbind) where file-writing tools may write. |

On top of that, the MCP client can allowlist individual tools — the
`--allowedTools "mcp__chrome-devtools__new_page,..."` form in my blocked CLI attempt above
is exactly that. The right posture is `--slim` or a client allowlist by default, and the
full 29 only when you're actually profiling.

The server also prints two data-egress notices at startup, which I captured:

```
[server] Performance tools may send trace URLs to the Google CrUX API to fetch real-user
         experience data. To disable, run with --no-performance-crux.
[server] Google collects usage statistics to improve Chrome DevTools MCP.
         To opt-out, run with --no-usage-statistics.
```

That first one is not theoretical — the "Metrics (field / real users)" block in my Task 1
output *is* CrUX data, which means **the URL I profiled was sent to Google**. Fine for a
public docs site; not fine for `https://internal-staging.acme.corp/customer/48213`, where
the URL itself is the leak. Add `--no-performance-crux` before pointing this at anything
internal.

### Practices I'd standardise on

1. **Always `--isolated=true`.** Fresh throwaway profile per run, cleaned up on exit. The
   default is a *persistent* profile under `$HOME/.cache/chrome-devtools-mcp/`, so without
   this flag every session inherits whatever the last one logged into. And treat
   `--browserUrl`/`--wsEndpoint` — which attach to your actual running Chrome — as a
   deliberate decision, never a convenience.
2. **Pin the version.** `@1.8.0`, not `@latest`, for a package that spawns a browser.
3. **Add `--no-performance-crux --no-usage-statistics`** for private or internal URLs, and
   `--redactNetworkHeaders` whenever the page is authenticated.
4. **Never point it at production with real credentials.** Use a seeded staging account
   whose blast radius you accept.
5. **Prefer paginated/filtered reads.** `list_network_requests` takes `pageSize`/`pageIdx`
   and `resourceTypes`; a media-heavy page produces hundreds of requests, and dumping them
   all is how you burn a context window on noise.
6. **Treat page content as untrusted input.** Response bodies and console text come from
   whatever site you loaded. An attacker-controlled page can print instructions aimed at
   the agent. Read them as data, never as commands.
7. **A supply-chain note I stumbled on.** Searching the official MCP registry for
   "chrome-devtools" returns *two* results: the real
   `io.github.ChromeDevTools/chrome-devtools-mcp`, and a look-alike
   `io.github.Async23/chrome-devtools-mcp` publishing `@async23/chrome-devtools-mcp`
   with the same title, "MCP server for Chrome DevTools". Being *in the registry* is not
   the same as being *the* package. Verify the npm identifier and the GitHub org before
   you install something whose whole job is reading everything in your browser.

### The failure mode I actually saw

**Console errors arrive stripped of their message text.** In Task 2 stage 2, the real
runtime error was a `TypeError: Cannot read properties of undefined (reading 'map')`. What
the server reported — both from `list_console_messages` and from the detail call
`get_console_message` — was:

```
msgid=1 [error] Uncaught (in promise) (0 args)
  at render (app.js:6:6)
```

`(0 args)` — the exception object never made it across. An agent that trusted the console
alone would have a location and no cause, and would very plausibly start guessing at
`app.js:6`.

**How I'd guard against it:** never let the console be the sole source of truth. The
recovery that worked was to corroborate from a second tool — `get_network_request` gave me
the response body, and `{"todos":[...]}` against a line reading `data.items` made the
`TypeError` obvious without ever seeing its text. Generalised: **console → *where*,
network/`evaluate_script` → *why*.** Where the error text genuinely matters, wrap the call
site and surface it yourself, e.g.
`evaluate_script` with `() => { try { ... } catch (e) { return e.message } }`.

A smaller one worth noting: the server emitted `No handler registered for issue code
PerformanceIssue` dozens of times to stderr on every page load. Harmless noise, but on a
stdio transport it is worth confirming such chatter goes to **stderr** and not stdout —
anything written to stdout that is not JSON-RPC corrupts the protocol stream.

---

## Files in this submission

| Path | What it is |
|---|---|
| `.mcp.json` | The project-scoped MCP config (no secrets — this server has no auth) |
| `.claude/settings.json` | Pre-approves the `.mcp.json` server; inert until the folder is trusted (§2, gotcha 6) |
| `WRITEUP.md` | This document — the canonical submission |
| `report.html` | Visual companion, [published here](https://claude.ai/code/artifact/a971319d-d98f-4967-8fc3-8f1ac262acbe) |
| `run.cmd` / `run.sh` | **Start here.** One command, installs and runs everything |
| `harness/run.mjs` | The runner: starts the demo server, stages the two bug fixes, replays each task, cleans up |
| `harness/package.json` | Pins `chrome-devtools-mcp@1.8.0`; `npm run demo` / `task1` / `task2` |
| `harness/mcp-driver.mjs` | Minimal MCP stdio client used to drive the server and capture raw output |
| `harness/task*.json` | The exact `tools/call` sequences for each task |
| `harness/demo-app/` | The small buggy app used in Task 2 (`node server.mjs`, port 8931). `app.js` ships in its original broken state; `app.fixed.js` is the end state. See its README. |
| `evidence/task1b.log` | Task 1: mobile-throttled performance trace + 3 insight drill-downs |
| `evidence/task2.log` | Task 2 stage 1: 404 discovered via console + network |
| `evidence/task2c.log` | Task 2 stage 2: response body reveals the `items`/`todos` mismatch |
| `evidence/task2d.log` | Task 2 stage 3: fixed, verified via snapshot + `evaluate_script` |
| `evidence/task2e.log` | Task 2: final console/network check |
| `evidence/before.png`, `evidence/after.png` | Screenshots taken by the server, before and after |
| `evidence/claude-mcp-status.txt` | `claude mcp get` / `list` showing the project server `✔ Connected` |
| `evidence/exp-curl-vs-trace.txt` | Experiment 1: curl says "healthy", the trace says 98% render delay |
| `evidence/exp-slim.txt` | Experiment 2: `--slim` cuts 29 tools to 3, and renames them |
| `evidence/exp-redaction.txt` | Experiment 3: credentials in plain text by default, `<redacted>` with the flag |

## Reproduce it — one command

From the project root. Windows:

```bash
run.cmd
```

macOS / Linux (or Git Bash):

```bash
./run.sh
```

That's the whole thing. It installs `chrome-devtools-mcp@1.8.0` if needed, starts the demo
server, replays Task 1 and then all three stages of Task 2 with a banner before each saying
what to expect, restores `app.js` to its broken state, and stops the server. Nothing to
start or stop by hand, no second terminal.

Narrow it if you only want one:

```bash
run.cmd task1
```

```bash
run.cmd task2
```

Task 1 profiles a live public URL, so its numbers will differ from my recorded run — sites
change. Task 2 is fully local and deterministic.

**I verified this end to end**, twice, by copying the folder to a clean directory and
running `./run.sh task2` from scratch: `added 1 package`, then output matching
`evidence/task2.log` exactly — same three console errors, same
`reqid=3 GET /api/todos [404]`, same `"Loading…"` snapshot, through to `{"rendered":3}` at
stage 3. Three fixes came out of doing that check rather than assuming:
`demo-app/server.mjs` resolved its assets from `./public` and so only ran from its own
directory; the screenshot steps had a hard-coded absolute path (now a `{{TMP}}` token); and
the earlier two-terminal instructions in this write-up would not have run for anyone else.

One deliberate difference between the shipped files and the recorded logs:
`harness/task2d.json` now passes `"types":["error","warn"]`, so a live run is clean.
`evidence/task2d.log` preserves my original `"warning"` and the validation error it caused —
that is gotcha 4, kept as evidence rather than tidied away.

All figures in §1 were read live on 2026-09-08 from the GitHub and npm public APIs.
