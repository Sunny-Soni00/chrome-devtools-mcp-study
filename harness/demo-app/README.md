# demo-app — the broken page used in Task 2

`public/app.js` is shipped in its **original, broken** state so the Task 2 transcript
reproduces from scratch. It has two planted defects:

1. it fetches `/api/todos`, but the server route is `/api/todo-list` (404);
2. it reads `data.items`, but the payload key is `data.todos` (TypeError on `.map`).

`public/app.fixed.js` is the corrected version — the end state after both fixes.

You do not need to edit anything by hand: `../run.mjs` rewrites `app.js` for each of the
three stages and restores it to the broken state when it finishes. Run it from the project
root with `run.cmd task2` (Windows) or `./run.sh task2`.

To poke at the page yourself: `node server.mjs` (listens on http://localhost:8931, and runs
from any working directory).
