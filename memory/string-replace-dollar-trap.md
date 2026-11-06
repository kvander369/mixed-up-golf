---
name: string-replace-dollar-trap
description: "Doc/code edit scripts must pass the replacement to String.replace as a function; a plain string with $` or $' silently duplicates the file."
metadata:
  node_type: memory
  type: feedback
  originSessionId: cf13bada-92e0-49b2-a1f3-1fa2b12c1452
  modified: 2026-11-05T16:18:52.972Z
---

The exact-match `swap()` helper used throughout this project's scratch scripts
must call `s.replace(from, function(){ return to; })`, never `s.replace(from, to)`.

**Why:** on 2026-08-29 a docs update doubled the state file (now `STATE-ARCHIVE.md`) from 424
to 873 lines and the commit was pushed before anyone noticed. The new text
contained "`$` on the stakes" - a dollar sign followed by a backtick - which a
string replacement reads as "insert everything before the match". `$'`, `$&`
and `$n` are the same trap. The swap reported "ok" because the pattern matched
exactly once; the check that can catch it is line count before vs after.

**How to apply:** function replacer always. After any doc edit, compare line
counts against `git show HEAD:<file> | wc -l` before committing - a jump far
larger than the text added is this bug. Related: [[kyle-needs-large-high-contrast-text]].
