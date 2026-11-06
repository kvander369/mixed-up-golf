# CLAUDE.md — Mixed Up Golf

Read this first, every session. Then `STATE.md` for what is open now, and
`RESTORE.md` if the machine or the folder is new.

**Before changing a screen, read `STATE-ARCHIVE.md`:** "Decisions made 2026-08-23",
"Players is home plate", "The demo round", "Ernie", "Screen work". It is history:
where it and this file disagree, this file wins (it still says "No Nassau logic").

---

## What this is

An offline round tracker for Kyle's eight-player golf group. It replaced the
AppSheet app ("4Score") it was modelled on.

    index.html                                    the whole app, one file
    https://kvander369.github.io/mixed-up-golf/   live
    github.com/kvander369/mixed-up-golf           published source

**No build step, no dependencies.** `index.html` is self-contained. Edit it
directly.

---

## Rules that are not negotiable

**1. Do NOT edit `index.html` with broad regex replacements.** They have silently
destroyed whole functions that still passed a syntax check. Targeted edits only.

**2. Run the tests after every change.**

    node smoke.js

Renders every screen and fires every control against a DOM stub. It catches what
a syntax check cannot — deleted functions still being called, bad property
access, handlers wired to elements that no longer exist.

**3. Bump `CACHE` in `sw.js` when the app changes.** The service worker serves
from cache first, so installed phones keep running the old version forever
otherwise. `mixed-up-golf-v1` → `v2` → and so on.

**4. The two games allocate strokes DIFFERENTLY. Never share the function.**

| Game | Handicap used |
|---|---|
| Inside game (Holes, Nassau) | course handicap **minus the low man in the foursome** |
| Team result + random draw | **raw** course handicap |

Same formula, different input — which is exactly what makes consolidating them
look correct and produce silently wrong net scores. Guarded by
`pops_separation_test.js`. Detail in `docs/GOLF_PWA_PART2_RULES.md` §2b.

To be exact about what is and is not shared: the placement arithmetic,
`strokesFor()`, IS one function and that is fine. What must never be merged is
the handicap number fed to it - `phcp(i)` in `netOf()` for the team game,
`pops[p]` in `insideGame()` for the inside game.

**5. Only gross scores reach the screen.** Net decides the hole colours and is
never shown per hole, because the same gross score legitimately nets differently
in the two games. The one exception is the team total on Results, labelled as
net.

**6. Kyle is new to code.** Explain in plain language. Name the file and line
when you make a claim.

**7. Prove claims, do not assert them.** This project runs the code rather than
reasoning about it, and that has caught several things reasoning got wrong.

---

## Tests

    node smoke.js                    every screen renders, every control fires
    node live_test.js                change a score, everything downstream updates
    node skins_test.js               gross only, birdie-or-better, ties knock out
    node pops_separation_test.js     the two stroke allocations stay separate
    node 4score_rule_verify.js       decoded rules reproduce the real Sheet
    node roster_test.js              the roster keeps its promises
    node nassau_test.js              the Nassau settles the way the group plays it
    node tees_test.js                green tees move a stroke from hole 5 to hole 2, at CCW only
    node junk_test.js                birdies off the card; chippie/sandie locked behind the word
    node state_size_test.js          STATE.md stays one page (150 lines); a 151-line file is refused

Run them all. **Check,** every suite's exit code and its PASS lines, in Bash:

    for t in smoke live_test skins_test pops_separation_test 4score_rule_verify roster_test nassau_test tees_test junk_test state_size_test; do out=$(node $t.js 2>&1); echo "$t exit=$? pass=$(echo "$out" | grep -c '^PASS') fail=$(echo "$out" | grep -c FAIL)"; done

**A test that passes by testing nothing is worse than one that fails.** `smoke.js`
and `live_test.js` find the app with `pageParts()`: longest script block is the
app, markup is everything that is not a script. If you add another script tag,
check them.

---

## Deploying a change

`gh` is logged in as `kvander369` with `repo` scope, ADMIN on the repo, and
`origin` is `https://github.com/kvander369/mixed-up-golf.git`. A change is:

    git add -A && git commit -m "..." && git push

An unpushed commit looks to Kyle, checking on his phone, exactly like a change
that was never made.

GitHub Pages redeploys from `main` on its own. The web upload UI at
`github.com/kvander369/mixed-up-golf/upload/main` is the fallback.

**A push is not instantly live. Two delays, in order.** "Not updating on my phone"
is almost never a broken deploy; it is one of these two waits.

1. **GitHub's CDN holds files for 10 minutes** (`Cache-Control: max-age=600`).
   Fetch too soon and you get the OLD file however many times you try. To check
   past it, add a junk query string:
   `curl "https://kvander369.github.io/mixed-up-golf/sw.js?x=123"`.
   To see whether the deploy has even run:
   `gh api repos/kvander369/mixed-up-golf/pages/builds/latest`.
2. **Then the phone** needs a full close-and-reopen, twice, to swap caches.

**Check the phone at the bottom of the Players screen.** It shows the version. The
number is not written in
`index.html`; the page asks the service worker that is serving it and the worker
answers out of its own `CACHE` string. "not installed" means no service worker
has taken over yet.

**The stamp names the WORKER, not the page.** `sw.js` fetches the shell with
`cache:'reload'` so a new worker cannot cache the old page. If a phone ever shows
a new number and an old screen, that line is the first place to look - and do not
push two releases within ten minutes without saying so.

`gh` is at `C:\Program Files\GitHub CLI\gh.exe`. **The `!` prefix in Claude Code
runs Bash, not PowerShell:** there use `"/c/Program Files/GitHub CLI/gh.exe"`.

---

## What must never reach the public repo

The history was rewritten and the repo recreated on 2026-08-28 to remove real
names, so no commit from before that date resolves.
A force-push alone is not enough: GitHub keeps orphaned objects reachable by SHA.
Bundles of both histories are in `C:\Users\vande\Claude\Projects\`.

**Never commit a real name.** Invented people (Avery, Blake, Cody, Drew, Eli,
Chris, ChrisB, Sy) stand in throughout the tests and the demo card. Kyle's own
name is fine - he is the commit author and the owner of the repository.

**Keep private things out by name, in `.gitignore`, never by memory.** This repo
is public. `.gitignore` has no effect on a file git already tracks. To stop
tracking one: `git rm --cached <file>`, then commit.

---

## The Nassau

The inside game as the group actually plays it: **X and Y, five ways, automatic
presses, option to double the back.** Its own bottom tab. **Check:** `nassau_test.js`
is the rule book. Every number Kyle agreed to is a case in it, and it runs the
app's real `nassau()`. Read it before touching the game.

- front 1X, back 2X (4X doubled), overall 2X by holes won across 18
- a press starts automatically the hole after a bet reaches 2 down, is worth
  1X on either nine, and only the NEWEST bet on a nine spawns the next one
- a tied bet is "sawed off" (nobody pays); a tied front can carry to the back
  as a setting, and stays 1X even if the back is doubled
- junk (birdies, chippies, sandies, greenies) is Y each, pooled by side.
  Birdies are counted off the card, gross only, eagle = 2; the rest are tapped,
  and chippie/sandie rows unlock only by tapping the word
- defaults X=$5, Y=$2; the double is cleared by New round, X/Y/carry persist

It consumes the per-hole result `insideGame()` already produces, so rule 4 still
holds.

A bet swinging from 2 up to 2 down never needs a ruling: a press starts at 0 when
the bet above it is at 2, the two move in step, and the newer one reaches 2 down
first. Kyle's own words on the related case: "2 and 0, then 1 and 1, then 0 and 2
- this starts a new press."

## Green tees

Some of the group play CCW from the green tees or the green-white combo. Each
player row on the Players screen has a **W / G** button (white, or green/combo); the roster
remembers it the way it remembers his CH (last one used).

- The card's "Men's Hdcp/G" row differs from white on **two holes only**: hole 2
  is ranked 3 white / 1 green, hole 5 is 1 white / 3 green. `ccwGreenRanks()`.
- **The combo uses the green row.** It plays 2 and 5 from green. Two patterns,
  not three.
- So the button changes a result only when a man is getting 1 or 2 strokes (or
  19 or 20): one shot lands on hole 2 instead of hole 5.
- **The CH is still typed by hand** for the tees he is playing. The app knows
  no slope or rating, on purpose (Kyle, 2026-09-19).
- **CCW only.** `isCCW()` is true while the rankings equal the CCW white row;
  away, the button is hidden and the flag does nothing.
- Both games get a man's rankings from `ranksFor(i)`. Rule 4 is untouched.

**Check:** `tees_test.js` runs the app's real `insideGame()` and `netOf()`.

## Relationship to ScannerBot

Separate project (`C:\Users\vande\Claude\Projects\scannerbot`), no shared code at
runtime. Mixed Up Golf reuses the CCW scoring *logic* and course data, nothing
more. Do not conflate them, and do not put golf files there or in
`G:\My Drive\Claude-Scannerbot`.

---

## The roster

Kyle's group is saved between rounds. **ROSTER** is on the top bar beside Course
and Players. **Check:** `roster_test.js`.

1. **One CH per person, and it is the last one you used.** No stored-versus-
   today's handicap to reconcile and no save step.
2. **The people live in their own storage key** (`mixedUpGolf.people.v1`),
   not inside the round. "New round - clear everything" wipes scores and
   never the people.
3. **Names that reach the card must be distinct.** Two men in the group share
   a first name, so one of them carries an initial on the card. A duplicate is
   refused with a reason.

   **Their real names are not written down here.** This file is published with
   the app. Kyle knows which two; the docs and the tests use invented names.

**The shipped roster is EMPTY, on purpose.** `index.html` is published
publicly, so seeding it with the real group would put eleven men's names and
handicaps in a public repo permanently. Kyle builds the list on the phone.
`defaultPeople()` returns `[]` and must stay that way.

