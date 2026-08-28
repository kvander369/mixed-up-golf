# CLAUDE.md — Mixed Up Golf

Read this first, every session. Then `docs/GOLF_APP_STATE.md` for where things
stand, and `RESTORE.md` if the machine or the folder is new.

**Current as of 2026-08-28: live at v9, six suites / 75 checks all green,
nothing blocking.**

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
    node roster_test.js              the roster keeps its promises

Six suites, 75 checks. All green as of 2026-08-28. Run them all — they are fast,
and two of them once passed while silently testing nothing (see below).

**A test that passes by testing nothing is worse than one that fails.** Adding a
`<script>` to `<head>` for the zoom fix broke `smoke.js` and `live_test.js`
exactly that way: both assumed script `[1]` was the app and that the markup was
everything before the first script, so they found ZERO controls and reported
PASS. They now use `pageParts()` — longest script block is the app, markup is
everything that is not a script. If you add another script tag, check them.

---

## Deploying a change

**Git auth is set up (2026-08-24).** `gh` is logged in as `kvander369` with
`repo` scope, ADMIN on the repo, and `origin` is
`https://github.com/kvander369/mixed-up-golf.git`. A change is now:

    git add -A && git commit -m "..." && git push

**Commit after a change is verified, then `git push`. Every time.** A commit
left sitting on this machine is not a backup and is not deployed - it looks to
Kyle, checking on his phone, exactly like a change that was never made. This is
also how the project is backed up: the GitHub remote IS the backup, so an
unpushed commit exists in one place only.

GitHub Pages redeploys from `main` on its own. The web upload UI at
`github.com/kvander369/mixed-up-golf/upload/main` is still there as a fallback.

Then on the phone: close the app fully and reopen twice, so the service worker
swaps to the new cache version.

**To check the phone actually updated, look at the bottom of the Players
screen.** It shows the version - v12, and so on. The number is not written in
`index.html`; the page asks the service worker that is serving it and the worker
answers out of its own `CACHE` string, so the stamp cannot drift from what is
really installed. "not installed" means no service worker has taken over yet.

`gh` 2.98.0 is installed at `C:\Program Files\GitHub CLI\gh.exe`. The device-flow login that was abandoned
mid-setup has since been finished, so pushing works from here.

**The `!` prefix in Claude Code runs Bash, not PowerShell.** `& "C:\Program
Files\..."` is a syntax error there; use `"/c/Program Files/GitHub CLI/gh.exe"`.

---

**The history was rewritten and the repo recreated on 2026-08-28.** Every
commit has a new SHA, and no commit from before that date resolves any more -
if an old note cites one, that is why. The reason: the test fixture, the demo
card and some docs carried the real group's names and handicaps, and one of
those men holds public office. A force-push alone was not enough - GitHub keeps
orphaned objects reachable by SHA - so the repository was deleted and recreated
with the clean history. Bundles of both the old and the new history are in
`C:\Users\vande\Claude\Projects\`.

**Never commit a real name.** Invented people (Avery, Blake, Cody, Drew, Eli,
Chris, ChrisB, Sy) stand in throughout the tests and the demo card. Kyle's own
name is fine - he is the commit author and the owner of the repository.

**Keep private things out by name, in `.gitignore`, never by memory.** This repo
is public. `.gitignore` has no effect on a file git already tracks - that is how
`seat-check.ps1` reached GitHub on 2026-08-27 despite a commit saying it was
kept out. To stop tracking one: `git rm --cached <file>`, then commit.

---

## Relationship to ScannerBot

Separate project, no shared code at runtime. It lives at
`G:\My Drive\Claude-Scannerbot`. Mixed Up Golf reuses the CCW scoring *logic* and
course data, nothing more. Do not conflate them, and do not put golf files there.

One thing is outstanding over there: a tie-recap bug was fixed in ScannerBot's
source on 2026-08-23 but **not deployed**. Noted at the top of its
`SCANNERBOT_STATE.md`.

---

## The roster (added 2026-08-24)

Kyle's group is saved between rounds, so setting up is four taps instead of
eight typed fields. **ROSTER** is on the top bar beside Course and Players.

Three rules, all of them load-bearing:

1. **One CH per person, and it is the last one you used.** No stored-versus-
   today's handicap to reconcile and no save step. Nothing can go stale
   because nothing is kept in two places.
2. **The people live in their own storage key** (`mixedUpGolf.people.v1`),
   not inside the round. "New round - clear everything" wipes scores and
   never the people.
3. **Names that reach the card must be distinct.** Two men in the group share
   a first name, so one of them carries an initial on the card. Scoring never
   cared (it is all by slot index), but the roster keyed on name, so the second
   man could not exist. A duplicate is now refused with a reason.

   **Their real names are not written down here.** This file is published with
   the app. Kyle knows which two; the docs and the tests use invented names.

**The shipped roster is EMPTY, on purpose.** `index.html` is published
publicly, so seeding it with the real group would put eleven men's names and
handicaps in a public repo permanently. Kyle builds the list on the phone.
`defaultPeople()` returns `[]` and must stay that way.

## Still open

- **Nothing blocking.**
- One slow-burn unknown: **iOS storage eviction.** Home-screen PWAs are
  *believed* exempt from Safari's ~7-day eviction of site data, never verified
  here. If that is wrong, the app could open after a winter off with the roster
  gone. Bounded — retype eleven names — but a nasty clubhouse surprise. The only
  honest test is time; record the answer in `docs/GOLF_APP_STATE.md`.
- Kyle still has to add his group on the phone: **Roster → Add someone**,
  giving the two men who share a first name distinct card names.

## Closed

- **Hand-check a round — DONE 2026-08-24.** Kyle entered a card from the old
  4Score/AppSheet app and the two agreed. That was the last thing standing
  between "the code checks the code" and "the app can settle a bet."
- **Offline — DONE.** Kyle confirmed it opens in airplane mode.
- **Backup — DONE 2026-08-28.** The GitHub remote is the backup; push after
  every commit. `RESTORE.md` records what a clone does not bring back, and that
  the round and roster live in the phone's storage and nowhere else.
