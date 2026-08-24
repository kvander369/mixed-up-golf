# CLAUDE.md — Mixed Up Golf

Read this first, every session. Then `docs/GOLF_APP_STATE.md`.

---

## What this is

An offline round tracker for Kyle's eight-player golf group. It replaced the
AppSheet app ("4Score") it was modelled on. Built and deployed 2026-08-23, in
use since.

    index.html                                    the whole app, one file
    https://kvander369.github.io/mixed-up-golf/   live
    github.com/kvander369/mixed-up-golf           published source

**No build step, no dependencies.** `index.html` is self-contained. Edit it
directly.

---

## Rules that are not negotiable

**1. Do NOT edit `index.html` with broad regex replacements.** Two `perl -0pi`
one-liners silently destroyed whole functions and ~10KB of code during
development. Both passed a syntax check and failed only at runtime. Targeted
edits only.

**2. Run the tests after every change.**

    node smoke.js

Renders every screen and fires every control against a DOM stub. It catches what
a syntax check cannot — deleted functions still being called, bad property
access, handlers wired to elements that no longer exist. It found two real bugs
that a syntax check waved through.

**3. Bump `CACHE` in `sw.js` when the app changes.** The service worker serves
from cache first, so installed phones keep running the old version forever
otherwise. `mixed-up-golf-v1` → `v2` → and so on.

**4. The two games allocate strokes DIFFERENTLY. Never share the function.**

| Game | Handicap used |
|---|---|
| Inside game (Holes) | course handicap **minus the low man in the foursome** |
| Team result + random draw | **raw** course handicap |

Same formula, different input — which is exactly what makes consolidating them
look correct and produce silently wrong net scores. Guarded by
`pops_separation_test.js`. Detail in `docs/GOLF_PWA_PART2_RULES.md` §2b.

**5. Only gross scores reach the screen.** Net decides the hole colours and is
never shown per hole, because the same gross score legitimately nets differently
in the two games. The one exception is the team total on Results, labelled as
net.

**6. Kyle is new to code.** Explain in plain language. Name the file and line
when you make a claim.

**7. Prove claims, do not assert them.** This project runs the code rather than
reasoning about it: the scoring rules were verified against the real Sheet's own
columns, the draw was tested over 2M trials, an image was decoded rather than
guessed at. Keep doing that — it caught several things reasoning had got wrong.

---

## Tests

    node smoke.js                    every screen renders, every control fires
    node live_test.js                change a score, everything downstream updates
    node skins_test.js               gross only, birdie-or-better, ties knock out
    node pops_separation_test.js     the two stroke allocations stay separate
    node 4score_rule_verify.js       decoded rules reproduce the real Sheet

---

## Deploying a change

**Git auth is set up (2026-08-24).** `gh` is logged in as `kvander369` with
`repo` scope, ADMIN on the repo, and `origin` is
`https://github.com/kvander369/mixed-up-golf.git`. A change is now:

    git add -A && git commit -m "..." && git push

GitHub Pages redeploys from `main` on its own. The web upload UI at
`github.com/kvander369/mixed-up-golf/upload/main` is still there as a fallback.

Then on the phone: close the app fully and reopen twice, so the service worker
swaps to the new cache version.

`gh` 2.98.0 is installed at `C:\Program Files\GitHub CLI\gh.exe`. The device-flow login that was abandoned
mid-setup has since been finished, so pushing works from here.

**The `!` prefix in Claude Code runs Bash, not PowerShell.** `& "C:\Program
Files\..."` is a syntax error there; use `"/c/Program Files/GitHub CLI/gh.exe"`.

---

## Relationship to ScannerBot

Separate project, no shared code at runtime. It lives at
`G:\My Drive\Claude-Scannerbot`. Mixed Up Golf reuses the CCW scoring *logic* and
course data, nothing more. Do not conflate them, and do not put golf files there.

One thing is outstanding over there: a tie-recap bug was fixed in ScannerBot's
source on 2026-08-23 but **not deployed**. Noted at the top of its
`SCANNERBOT_STATE.md`.

---

## Still open

- Nothing blocking.

## Closed

- **Hand-check a round — DONE 2026-08-24.** Kyle entered a card from the old
  4Score/AppSheet app and the two agreed. That was the last thing standing
  between "the code checks the code" and "the app can settle a bet."
- **Offline — DONE.** Kyle confirmed it opens in airplane mode.
