---
name: push-after-every-commit
description: Kyle wants every commit pushed to origin immediately, never left sitting locally.
metadata:
  type: feedback
---

Push after every commit. Do not leave commits sitting unpushed on the local
branch, and do not batch them up for a later push.

**Why:** Kyle checks the work on his phone against the live GitHub Pages site.
An unpushed commit looks to him exactly like a change that was never made — this
already cost a round of "not updating on my phone!!" confusion.

**How to apply:** `git commit` and `git push` in the same step. If a change
touched `index.html`, bump `CACHE` in `sw.js` in that same commit, and confirm
against the live `sw.js` afterwards. See [[verify-live-before-claiming-deployed]].
