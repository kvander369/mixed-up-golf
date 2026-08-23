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

    node smoke.js

Renders every screen and fires every control against a DOM stub. Catches
runtime errors a syntax check cannot.

## Editing it

`index.html` is one self-contained file — no build step, no dependencies.

**Do not edit it with broad regex replacements.** Two `perl -0pi` one-liners
destroyed whole functions during development; both passed a syntax check and
failed only at runtime. Make targeted edits and run `node smoke.js` after each.

After changing the app, bump `CACHE` in `sw.js` so installed phones pick up the
new version.

## Credits

Ernie is Kyle's own cartoon engineer, from his class notes.
