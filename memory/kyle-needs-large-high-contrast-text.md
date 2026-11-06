---
name: kyle-needs-large-high-contrast-text
description: "Kyle cannot read small or grey UI text without reading glasses; default to large and white, and overshoot rather than nudge."
metadata:
  node_type: memory
  type: feedback
  originSessionId: cf13bada-92e0-49b2-a1f3-1fa2b12c1452
  modified: 2026-11-05T16:18:51.715Z
---

Kyle reads screens without reading glasses, often outdoors. Small text in a grey
tone (#5A5A5A, or the app's --ink-2/--ink-3 at 11-16px) on a dark background is
effectively invisible to him, even when it looks fine on a desktop monitor.

**Why:** this has now cost three separate rounds of rework - the version stamp on
2026-08-28 (11px grey, then 15px grey, then finally 20px white), and the hole
screen's junk grid and keypad on 2026-08-29 ("I don't want to have to put in my
readers to enter in the scores"). Each round costs a deploy, a CDN wait and a
phone reopen, so under-shooting is expensive.

**How to apply:** when he reports something hard to see, go decisively bigger and
go white - do not nudge one step and ask. Dialling back is cheap; creeping up is
not. He would rather scroll than squint, so fitting a screen without scrolling is
not worth shrinking anything for.
