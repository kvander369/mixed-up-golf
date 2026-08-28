# Mixed Up Golf

Offline round tracker for an eight-player golf group. Replaces the AppSheet app
("4Score") it was modelled on.

Open it once with a connection, add it to your home screen, and it runs with no
signal from then on — which is the point, since the courses it gets used at
often have none.

## What it does

**Holes** — the inside game, live during the round. Kyle's foursome only:
players 1&2 against 3&4, scored on best-ball net. Green means 1&2 took the hole,
gold means 3&4, no colour means halved. A clipped corner marks where a shot is
given: white for one, pink for two.

**Scores** — nine-at-a-time entry, one player at a time. This is where team 2 is
typed in after the round, and the catch-up path if a hole gets missed live.

**Results** — team-versus-team two-best-ball net, skins, and the random draw
(all eight mixed into four pairs, ranked by gross and by net).

**Course / Players** — set once before the round. CCW's pars and white-tee
rankings are loaded by default.

**Roster** — the group, saved between rounds, so setting up is four taps
instead of eight typed fields. Each person carries one course handicap: the
last one you used. It is not a second copy to reconcile — change it here and
that is what he starts on next round. The people live in their own storage,
so "new round" clears the scores and never the group.

**It ships with an empty roster on purpose.** This repository is public, so
nobody's name or handicap is committed to it. The list is built on the phone
and stays on that phone.

## Rules it implements

Decoded from the group's own Google Sheet and verified against it, not guessed.
Full detail in `docs/GOLF_PWA_PART2_RULES.md`.

**Start at `docs/GOLF_APP_STATE.md`** — where things stand, what is decided and
why, and the traps that look like bugs to someone tidying up.

Two stroke allocations, deliberately different:

| Game | Handicap used |
|---|---|
| Inside game | course handicap **minus the low man in the foursome** |
| Team result + random draw | **raw** course handicap |

Same formula, different input. Sharing one function between them silently
produces wrong net scores. Guarded by `pops_separation_test.js`.

Only **gross** scores ever appear on screen. Net decides the colours and is
never shown per hole — because the same gross score legitimately nets
differently in the two games.

The app does not compute the bet. Five ways with automatic presses, tracked in
Kyle's head; the app colours holes.

## Running the tests

    node smoke.js                    every screen renders, every control fires
    node live_test.js                change a score, everything downstream updates
    node skins_test.js               gross only, birdie-or-better, ties knock out
    node pops_separation_test.js     the two stroke allocations stay separate
    node 4score_rule_verify.js       decoded rules reproduce the real Sheet
    node roster_test.js              the roster keeps its promises

Six suites, 76 checks, no framework and no dependencies — each one drives the
real app against a DOM stub. They catch what a syntax check cannot: a deleted
function still being called, a handler wired to an element that no longer
exists.

## Which version am I running?

The bottom of the Players screen shows it. The number is not written into the
page — it is asked of the service worker that is serving you, so it cannot
disagree with what is actually installed. "not installed" means no service
worker has taken over yet.

## Editing it

`index.html` is one self-contained file — no build step, no dependencies.

**Do not edit it with broad regex replacements.** Two `perl -0pi` one-liners
destroyed whole functions during development; both passed a syntax check and
failed only at runtime. Make targeted edits and run the suites after each.

After changing the app, bump `CACHE` in `sw.js` so installed phones pick up the
new version.

## Credits

Ernie is Kyle's own cartoon engineer, from his class notes.
