# Part 2 — the 4Score scoring rules, decoded

Status: **DECODED FROM DATA, AWAITING KYLE'S CONFIRMATION.**
Read 2026-08-23 from the AppSheet backing sheet.

Source: Google Sheet **"Holes"**, id `17U2xQKYKXdYRjGwZVxsNBlvYTy4TpG6LkhP7uTp6jMc`,
in folder `1usqLmYL8Tk9U3k4pFz2__523_LIboLlo` (alongside a stub `empty.txt`).
Everything below is `[read]` — verified against the actual cell values, not
inferred from the screenshot.

**This supersedes the claim in `NOTES-FROM-EMAIL-SEAT-2026-08-23.md` that the
Nassau logic "lives only inside AppSheet and cannot be exported."** It lives in
the Sheet, and the Sheet is readable.

---

## 1. The shape: 2 v 2 inside a foursome

The sheet carries **four players**, numbered 1–4. Columns `BB 12` and `BB 34`
are the two sides. So the game is **players 1&2 versus players 3&4** — twosomes
within one foursome, not the 4-player teams the CCW contract assumes.

Confirms what the screenshot showed (green on columns 1–2, yellow on 3–4).

---

## 2. Pops: strokes come off the LOW MAN

This is the rule that could not have been guessed, and the one most likely to be
got wrong.

The roster table in the sheet:

| Player | Course Handicap | Strokes |
|---|---|---|
| Kyle | 25 | 21 |
| Mark | 7 | 3 |
| Lou | 4 | 0 |
| Rando1 | 13 | 9 |

**`Strokes = Course Handicap − min(Course Handicap across the group)`**

Lou is low at 4, so Lou plays off scratch and everyone strokes off him.
25−4=21, 7−4=3, 4−4=0, 13−4=9. Exact for all four.

Kyle confirmed in conversation: **"pops are always in play."**

### CCW DOES THIS DIFFERENTLY — do not share the function blindly

`ccw_golf_photo.jsx` / `ScannerBot_CCW.gs` apply `strokes(hcp, hdcp)` to the
**raw course handicap** `[read]`. 4Score subtracts the low man first.

Same allocation formula, different input. Reusing CCW's function as-is on a
4Score round produces silently wrong net scores. Adjust the handicap first, then
allocate.

---

## 2b. THE TWO GAMES ALLOCATE STROKES DIFFERENTLY — never share the function

The single most dangerous thing to get wrong in this project. Confirmed with
Kyle 2026-08-23.

| Game | Handicap used | Effect |
|---|---|---|
| **Inside game** (twosomes, Holes tab) | course handicap **− low man in the foursome** | low man plays scratch |
| **CCW 8-player result + random draw** | **raw course handicap**, nothing subtracted | everyone keeps their shots |

Lou at 4 is low man, so he gets **no** strokes in the inside game but keeps all
**four** in the CCW result.

The allocation formula is identical; only the input differs. That is exactly
what makes it dangerous — reusing one function for both looks correct and
produces silently wrong net scores.

**Consequence to expect, not to "fix":** the same gross score nets differently
in the two games. Kyle's 6 on hole 1 (stroke index 7) nets **5** in the inside
game (21 pops → 1 shot) and **4** in the CCW result (25 hcp → 2 shots). Both are
right.

Guarded by `pops_separation_test.js` in this folder — seven checks, including
one asserting the two games *must* disagree. If anyone ever consolidates these
into a shared function, that test fails immediately.

---

## 3. Allocation: the standard formula, unchanged

Once strokes are known, they are allocated by the `Handicap Hole` column (the
stroke index) with the same formula CCW already uses:

```
strokes_on_hole = floor(S / 18) + (strokeIndex <= S % 18 ? 1 : 0)
```

Verified hole by hole against the sheet's own `H_ G` (gross) and `H_ N` (net)
columns.

**Kyle, S = 21** (`21 % 18 = 3`, so index ≤ 3 gets a second shot):

| Hole | Stroke index | Gross | Shots | Net | Sheet says |
|---|---|---|---|---|---|
| 1 | 7 | 6 | 1 | 5 | 5 ✓ |
| 2 | 3 | 6 | **2** | 4 | 4 ✓ |
| 3 | 15 | 3 | 1 | 2 | 2 ✓ |
| 5 | 1 | 5 | **2** | 3 | 3 ✓ |

**Rando1, S = 9** (`9 % 18 = 9`, no hole gets two):

| Hole | Stroke index | Gross | Shots | Net | Sheet says |
|---|---|---|---|---|---|
| 1 | 7 | 6 | 1 | 5 | 5 ✓ |
| 3 | 15 | 3 | 0 | 3 | 3 ✓ |
| 4 | 11 | 6 | 0 | 6 | 6 ✓ |
| 5 | 1 | 5 | 1 | 4 | 4 ✓ |

---

## 4. Winning a hole

```
BB12 = min(net player1, net player2)
BB34 = min(net player3, net player4)

BB12 <  BB34  ->  Match Point = "12"   (green in the app)
BB34 <  BB12  ->  Match Point = "34"   (yellow in the app)
BB12 == BB34  ->  blank                (halved, uncoloured)
```

**Best ball NET, lower wins, ties halve.** Verified on every completed hole:

| Hole | Net 1,2,3,4 | BB 12 | BB 34 | Sheet |
|---|---|---|---|---|
| 1 | 5, 5, 5, 5 | 5 | 5 | blank ✓ |
| 2 | 4, 3, 4, 4 | 3 | 4 | 12 ✓ |
| 3 | 2, 3, 3, 3 | 2 | 3 | 12 ✓ |
| 4 | 6, 4, 5, 6 | 4 | 5 | 12 ✓ |
| 5 | 3, 4, 5, 4 | 3 | 4 | 12 ✓ |

This resolves both puzzles the screenshot posed:

- **Four straight 4s going green** — level on gross, not on net, because pops
  differ between the sides.
- **Team 2 holding the low score on a hole that stayed uncoloured** — best ball
  *net*, and the sides tied.

---

## 4b. DISPLAY RULE: only gross reaches the screen

Kyle, 2026-08-23: *"even the holes tab shows gross (actual scores) — nothing
shows net scores to avoid this confusion."*

Net is computed to decide who takes a hole and never rendered as a per-hole
number. Every score in every grid and every entry cell is **gross**, exactly as
written on the card.

**Why this matters more than it looks.** The two games allocate strokes
differently (§2 and §2b), so the same gross score legitimately nets differently
depending on which game you are looking at. Kyle's 6 on hole 1 nets 5 in the
inside game and 4 in the CCW result — both correct. Put net scores in the grids
and the app appears to contradict itself. Show gross everywhere and the question
never arises.

The **only** net figure on screen is the team total on Results, labelled
"2 best-ball net" — that is the outcome of the eight-player game, not a per-hole
score. Do not add others.

---

## 5. Gross and net are both stored

The sheet keeps two grids: one of **gross** scores as entered, and one of
**net** after pops. Match Point is computed on **net**.

Per-player columns `H1 G … H18 G` (gross) and `H1 N … H18 N` (net) carry the
same thing per player, alongside `Gross Score` and `Net Score` totals.

---

## 5b. The app does NOT compute the bet

Kyle, 2026-08-23: *"I keep track of the presses in my head. The app just does
the colouring."* And: *"we play 5 ways with automatic presses, so really I need
to look at the colour coding to see who owes what to who."*

**No Nassau logic. No presses. No running money.** The app colours holes; Kyle
does the betting arithmetic himself.

A holes-won ticker was built and then **removed on Kyle's instruction** — with
five separate bets and automatic presses, a bare count of holes won says nothing
about who owes what. Do not reinstate it.

This closes what was previously logged as a major open question. There is no
Nassau wrapper to reverse-engineer.

---

## 5c. Reading the Holes page — the visual channels

Three signals, deliberately kept on separate channels so they cannot be confused:

| Signal | Channel | Meaning |
|---|---|---|
| Who won the hole | **hue** — green (players 1&2) / gold (3&4) on the score itself | the match result |
| Which side a player is on | the **(n) beside each name**, green or gold | column grouping |
| Shots given on that hole | **clipped top-left corner** — white for one, **pink** for two | pops |

**Pops are never green or gold.** White and pink are chosen precisely because
they belong to neither side; a pop marker must never read as a hole being won.

Two pops happens often enough to design for, but it is **not** guaranteed in any
given round. A player gets a second shot only where the stroke index is at or
below `pops mod 18`, and only if their pops exceed 18 at all:

| Pops off the low man | Holes with two shots |
|---|---|
| 0 (the low man) | none — no shots at all |
| under 18 | none — one shot on `pops` holes |
| 21 | 3 (stroke index 1–3) |
| 25 | 7 (stroke index 1–7) |

**And it moves with the field, not just with the handicap.** Pops are measured
off whoever is low man *that day*. If a stronger group turns out and the low man
is a 12 rather than a 4, everyone's pops drop by 8 and the pink corners can
disappear entirely. Kyle: *"they might not show on every round — depends on the
pops I get relative to low man."*

Dots were tried for this and rejected as unreadable at arm's length.

The **(n) beside each name is the player's pops off the low man**, i.e. the
number the hole result actually turns on.

---

## 6. Junk — entered by hand, no rules to derive

Columns: **Birdie, Sandie, Chippee/Chippie, Greenee/Greenie**, plus
`Greenies 12` and `Greeniies 34` (sic) — junk is tallied per twosome.

**ANSWERED 2026-08-23.** Kyle: *"I have to enter those by hand when we play. No
formula will work."*

There are no junk rules to derive and nothing to compute. Junk is pure manual
input. The app's job is to make entering it fast, not to decide it.

As built: per hole, a grid with rows Birdie / Chippie / Sandie and a column per
player — tap a cell to add one, tap past 3 to clear. The small corner number is
that player's running total for the round. Greenies are two steppers, G12 and
G34, matching the Sheet's per-twosome split.

---

## 7. Data hygiene note — the `-1` sentinel

Unentered scores appear as `-1`, not blank, in several rows. Because `-1` is
lower than any real score, it wins best-ball comparisons and produces **bogus
Match Points** — hole 7 shows `34` purely because `BB 34 = -1`. Other rows show
`#NUM!`.

That is an artifact of a partially entered round, not a rule. **The rebuild must
treat "no score" as absent, never as a number.** Guarding this is exactly the
kind of thing that makes a betting calculator quietly wrong.

---

## 8. Still open

1. **Junk rules** (§6) — the real remaining unknown.
2. **The Nassau wrapper.** This sheet computes *per-hole* match points. A Nassau
   is normally three bets — front 9, back 9, total 18. How per-hole points roll
   up into the bet, whether it presses, and what a press is worth, is not in
   this sheet. Ask Kyle.
3. ~~Eight players or four?~~ **ANSWERED by Kyle 2026-08-23.**

   **The Holes tab shows TEAM 1 ONLY** — Kyle's own foursome. It is the live,
   during-the-round screen for the inside game: 2-man teams, best ball, pops.

   **Team 2's scores are always entered after the round is done.** They never
   appear on the Holes tab.

   So the app has two distinct surfaces over the same round:

   | Surface | Who | When | Purpose |
   |---|---|---|---|
   | **Holes** | Team 1's four players | live, during play | the inside game — match points per hole |
   | **Scores** | all eight | after the round | feeds the CCW-style team-vs-team result |

   This also explains why CCW's Team 1 can load from the Sheet while team 2 must
   be photographed: team 1 was entered live, team 2 never was.
4. **Where "Strokes" is recomputed.** If a player is added mid-round and becomes
   the new low man, every other player's strokes shift. Confirm the group is
   fixed at the start.