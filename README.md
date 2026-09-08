# Popular but Underused — `chrome-devtools-mcp`

**Day 9 assignment · Researching an MCP Server or Plugin · Sunny Soni**

**MCP server:** Chrome DevTools MCP — [github.com/ChromeDevTools/chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp)
**Version used:** `chrome-devtools-mcp@1.8.0` · Apache-2.0 · maintained by Google's Chrome DevTools team
**Registry id:** `io.github.ChromeDevTools/chrome-devtools-mcp`
**Auth / cost:** none — no API key, no account, free. *There is no secret in this repository to redact.*

Google ships an MCP server that hands a coding agent the **Performance panel, the Network
panel and the Console** — not just a browser to click. Everyone installs the browser-driver
(Playwright MCP) instead. This repo is what happened when I connected the profiler half and
actually used it.

---

## 📄 Read it

| | |
|---|---|
| **[Visual report](https://claude.ai/code/artifact/a971319d-d98f-4967-8fc3-8f1ac262acbe)** | The findings as a page — LCP breakdown drawn to scale, screenshots inline. Start here. |
| **[WRITEUP.md](WRITEUP.md)** | The full submission: all six Part D sections, every transcript, every gotcha. |

## ▶️ Run it

Needs **Node.js LTS** and **Google Chrome** installed. Nothing else — no key, no signup.

```bash
run.cmd
```

macOS / Linux / Git Bash:

```bash
./run.sh
```

That installs the pinned server, starts the demo app, replays **Task 1 and all three stages
of Task 2** with a banner before each saying what to expect, restores the demo app to its
broken state, and stops the server. One terminal, nothing to start or stop by hand.
`run.cmd task1` or `run.cmd task2` narrows it.

---

## How this repo maps to the assignment

### Part A — why it clears the bar

**Real**, verified live from the GitHub and npm APIs on 2026-09-08: **51,307 stars**,
3,612 forks, **last push the same day I used it**, Apache-2.0, owned by the `ChromeDevTools`
org, **1,465,302 npm downloads/week**.

**Less used** — the honest, comparative case, because the raw number cuts both ways:

| Package | Downloads / week |
|---|---|
| `@playwright/mcp` — the obvious browser pick | 6,364,011 |
| **`chrome-devtools-mcp`** | **1,465,302** |
| `@modelcontextprotocol/server-filesystem` | 954,129 |

It loses **4.3 : 1** to Playwright MCP; the `modelcontextprotocol/servers` README doesn't
mention Chrome at all (grepped — zero hits); and a keyword search on Smithery's registry API
doesn't surface it. The half people *do* use is the Playwright-shaped `click`/`navigate`
subset — the `performance_*` and heap-snapshot tools, the reason it exists, are the part
nobody touches. Both tasks below live there deliberately.

### Part C — installed and run for real

Installed at project scope with one command; the resulting [`.mcp.json`](.mcp.json) is in
this repo, and [`evidence/claude-mcp-status.txt`](evidence/claude-mcp-status.txt) shows
Claude Code reporting it **`✔ Connected`**.

**Task 1 — "is this docs site fast on a mid-range phone?"** Emulated 4× CPU + Slow 4G,
recorded a trace across a reload, drilled into three insights. Result: LCP 1,794 ms of which
**TTFB is 33 ms (1.8%) and render delay is 1,761 ms (98.2%)** — the page is JS-bound, not
network-bound, and `LegacyJavaScript` named 24.9 kB of needless polyfills.
→ [`evidence/task1b.log`](evidence/task1b.log)

**Task 2 — "the todo list renders 'Loading…' forever."** Diagnosed purely from Console and
Network, never reading the source: a 404 on `/api/todos`, then a 200 whose body said
`{"todos":…}` against code reading `data.items`. Fixed both, verified with `take_snapshot`
and `evaluate_script` (`{"rendered":3}`).
→ [`evidence/task2.log`](evidence/task2.log), [`task2c`](evidence/task2c.log), [`task2d`](evidence/task2d.log), [`task2e`](evidence/task2e.log)

**Three extra experiments** run to test my own claims rather than assert them:

| | Question | Answer |
|---|---|---|
| [01](evidence/exp-curl-vs-trace.txt) | Could `curl` have answered Task 1? | No. curl says "healthy, 0.25 s" — it is blind to render delay, which happens after curl hangs up. |
| [02](evidence/exp-slim.txt) | Does `--slim` shrink the surface? | Yes, 29 tools → 3 — and it **renames** them, which the docs don't mention. |
| [03](evidence/exp-redaction.txt) | Does `--redactNetworkHeaders` protect credentials? | Yes — but it is **off by default**, so `Authorization` and `Cookie` reach the model in plain text unless you ask. |

**Where I got blocked, stated plainly:** I could not script a transcript of Claude Code's
*own* MCP client calling the tools — a second non-interactive CLI session returns
`Failed to authenticate: OAuth session expired`. Claude Code **does** connect to this config
(`✔ Connected` above); what you see in the logs was issued by my own ~90-line MCP stdio
client against the identical server, binary and arguments. Driving it from an interactive
session is a live demo, not a captured one.

### Part D — the write-up

All six required sections are in **[WRITEUP.md](WRITEUP.md)**: what it is and why it
qualifies · exact setup and six gotchas · hands-on evidence · when I'd reach for it · when I
wouldn't · best practices, permissions, and the failure mode I actually hit (console errors
arriving stripped of their message text — `(0 args)` — and how to guard against it).

---

## Repo map

```
.mcp.json                    the MCP config, project scope (no secrets — no auth surface)
.claude/settings.json        pre-approves the server; inert until the folder is trusted
WRITEUP.md                   the full submission
report.html                  source of the published visual report
run.cmd / run.sh             one-command runner

harness/
  run.mjs                    starts the demo server, stages the fixes, replays each task
  mcp-driver.mjs             minimal MCP stdio client (real JSON-RPC handshake)
  task*.json                 the exact tool-call sequences
  demo-app/                  the small buggy app used in Task 2

evidence/
  task1b.log                 performance trace + insight drill-downs
  task2*.log                 the three debugging stages, raw
  exp-*.txt                  the three experiments
  claude-mcp-status.txt      `claude mcp list` showing ✔ Connected
  *.png                      screenshots taken by the server itself
```

## A note on secrets

There are none, and that is a property of the server rather than good housekeeping:
`chrome-devtools-mcp` is local-only and unauthenticated, so no key was ever created. The
only credential-shaped string anywhere in this repo is `FAKE-DEMO-TOKEN-NOT-REAL`, a value I
fabricated in experiment 03 specifically to demonstrate that the server hands real
credentials to the model unless `--redactNetworkHeaders` is set.
