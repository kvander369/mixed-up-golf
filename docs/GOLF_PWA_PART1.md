# Golf PWA — Part 1 requirements & decisions

Status: **DESIGN ONLY. Nothing built.**
Decided with Kyle in conversation 2026-08-23. Supersedes the open questions in
`NOTES-FROM-EMAIL-SEAT-2026-08-23.md`, which was a requirements capture written
from another seat before any of this was settled.

Source marking: `[read]` = verified in a file this session. `[recall]` =
general knowledge, unverified. Everything else is Kyle's decision.

---

## The problem, in Kyle's words

At CCW, ScannerBot works: Kyle picks the Google Sheet for his own team (his
**AppSheet** app put the scores there during the round), photographs the other
team's card at the end, and gets results.

At an away course two things break:

1. **The hole rankings are different from CCW's** — they are hardcoded.
2. **There is often no cell service.**

**Part 1 is a phone app that needs no internet, where Kyle enters everything by
hand after the round, and gets the same CCW results.**

**Part 1 has nothing to do with AppSheet.** No live scoring, no Nassau, no junk
buttons. That is Part 2 and it is not being designed yet.

---

## What already exists (do not rebuild)

The scoring engine is **already written and already runs in a browser with no
internet**. `ccw_golf_photo.jsx` `[read]` is pure client-side JavaScript —
`strokes()`, `netArr()`, `twoBBNet()`, `calcSkins()`, `resolveLeaderTie()`.
Nothing in it makes a network call.

**Part 1 is a data-entry front door bolted onto an engine that already works.**
The engine is not the work.

### What has to change: the course is welded in

Four hardcoded lines `[read]`:

| Line | Constant | Becomes |
|---|---|---|
| `ccw_golf_photo.jsx:4` | `HOLE_PARS` | entered |
| `ccw_golf_photo.jsx:5` | `HOLE_HDCPS` | entered |
| `ccw_golf_photo.jsx:6` | `GREEN_HDCPS` | see Tees below |
| `ccw_golf_photo.jsx:330` | `WHITE_YARDS` | display only — not needed for scoring |

---

## DECIDED

### 1. Two course inputs are required: pars AND rankings

Not rankings alone. `calcSkins()` compares each score to `HOLE_PARS[h]` to
decide birdie / eagle / albatross `[read]`. **No pars, no skins.** Kyle
confirmed both.

### 2. Everything is entered in 9-hole chunks on a 3x3 keypad

Kyle: *"THE best way for me to enter anything/everything is in 9 hole chunks."*

A 3x3 pad of 1-9. Player 1's front nine is typed as one string: `458254678`.
No per-hole boxes, no commas, no tabbing. Matches how a scorecard reads — one
player, straight across the row.

Same pad for pars (3s, 4s, 5s).

**Scores above 9 cannot be entered, deliberately.** Kyle: *"NO ONE I play with
ever takes more than a 9 and even then..."* Confirmed independently against the
data — every score recorded in this project's history tops out at **7**, nothing
above 9 has ever appeared `[read]`.

A `+10` correction affordance was built into the first mockup and **removed on
Kyle's instruction**. Do not reintroduce it. If a 10 ever genuinely happens, the
right answer is to ask Kyle then, not to carry a permanently unused button.

Correction is still needed for ordinary typos: tapping a filled cell arms it,
the next digit replaces it, `Back` empties it. No extra UI.

### 3. Every 9-digit chunk shows its total as a checksum

After the ninth digit, display the sum, large. Kyle already knows his front-9
score — it is written on the card in his hand. Wrong number, retype.

Catches the likeliest error (fat finger, skipped hole) at the moment it happens
rather than in the results. Free, and it is the difference between a fast entry
screen and a trustworthy one.

Applies to pars too — a nine adds to 34-37 on nearly every course.

### 4. Rankings use a different pad, with grey-out

Rankings run 1-18, so the 3x3 pad does not fit. Kyle: *"only for hole rankings
does the keypad need to be different."*

The stroke index is a **permutation** — each of 1-18 used exactly once. So every
number greys out as it is used. Duplicates become impossible; finishing early
becomes impossible. This is not a guess about course conventions, it is a fact
about what a stroke index is.

### 5. NO odd/even assumption — explicitly rejected

CCW's front nine rankings are all odd and its back nine all even `[read]`, which
is a common convention. **Kyle rejected building anything on it**, including as
a soft warning: *"its not universal so don't build that in."*

Correct call. A warning that fires on a perfectly normal course teaches the user
to ignore warnings.

### 6. Different tees: capability kept, screens deferred

Kyle: *"when we play on a different course we always play from the same tee."*
And: *"we COULD build it for different tees since one day we might want that...
but the default should be same tee."*

**The engine already supports two tee sets.** `hdcpsFor(p)` picks a ranking row
from `p.tees === "G"`, and the data contract already specifies omitting the key
for default `[read]`. Nothing to build.

Decision: **store the course as two ranking rows internally, both filled with
the same numbers. Never ask. Never set the flag.** The shape is already right,
so adding tee support later is an added screen, not a rewrite.

Rationale for not building the screens now: that fork would sit in the flow
forever and be answered "same tees" every single round, for a feature never used
away from CCW.

**Precision:** the engine handles exactly **two** tee sets, not any number
`[read]`. Three different tees in one group would be a real change.

### 7. Names and handicaps are typed

Kyle: *"need to type names so typing handicaps is no extra burden."* Keyboard is
already up for names; the handicap beside each is free. No pad here.

**Open:** whether the roster persists between rounds. See Open Questions.

### 8. Auto-save on every keystroke. No Save button, ever.

Kyle: *"I might enter a name, then close the app to go take a leak, then reopen
it. stuff needs to still be there."*

This is more necessary than it looks. On iPhone, backgrounding Safari lets iOS
discard the page from memory; returning **reloads it from scratch** `[recall]`.
So "closed the app" and "glanced at a text" are the same event. Anything held
only in screen memory is gone either way.

**Storage is on the phone** — confirmed with Kyle. No server, no cloud, no
account. Data volume is tiny (one course, eight players, 144 scores) so writing
on every change is cheap and reliable.

Two consequences:

- **Save partial chunks.** Four digits into a nine and the phone rings: those
  four digits are saved, and the cursor returns to where it was.
- **Restore the screen, not just the data.** Reopen lands on the same step, same
  player, same nine. Otherwise every interruption costs a hunt.

Browsers sometimes restore form fields on reload. Unreliable, and it vanishes
when iOS drops the tab. Never build on it.

### 9. Being a PWA does not save anything for you

Recorded because it caused real confusion and will again.

"PWA" means only: a web page installable to the home screen that still works
with no internet. It caches **the app** — buttons, keypad, scoring code — so the
page loads on the 4th tee with no signal.

It does **not** save the round. That is §8, and it is code that must be written.
Being a PWA puts the notebook in your pocket; it does not write in the notebook.

### 10. Dark mode

Kyle: *"for this app I like dark mode - consistent with the appsheet part this
is coming later (phase 2)."*

Committed single look, not a light/dark toggle. The reason is continuity: Part 2
copies the AppSheet app, which Kyle already uses in dark, and the two should not
feel like different products.

Noted and dismissed: dark UI can be harder to read in direct sun, which is where
this app is used. Kyle already runs the AppSheet app in dark on the course, so
this is settled by his direct experience rather than by theory. Revisit only if
he raises it.

### 11. Rounds are one-and-done — no history

Kyle: *"these are one and done. no need to save the data past the day in
question."*

No round history, no archive, no sync, no accounts. The app holds exactly one
round: the one being entered. An explicit "new round" wipes it and starts over,
and it must be hard to hit by accident.

The two are not in conflict: **within** a round, save obsessively (§8).
**Between** rounds, keep nothing.

This removes what `NOTES-FROM-EMAIL-SEAT-2026-08-23.md` treated as a major open
question — phone-only storage versus a Sheet-backed round that survives the
phone. With no data worth preserving, phone-only is simply correct, and the sync
story, the auth story, and the credential problem all disappear with it.

---

## The sharp edge this creates — READ THIS

Discarding the data is safe. **Discarding the app is not.**

iOS clears script-writable storage for sites unused about 7 days; home-screen
installed PWAs are exempt `[recall], UNVERIFIED`. Kyle does not care about
losing an old round — but the same eviction can take the **cached app code**,
and golf is seasonal. Four months between away rounds is normal.

Failure mode: standing on the 1st tee of a strange course with no signal, and
**the app will not open at all.**

So "Add to Home Screen" is load-bearing, not cosmetic — and the reason is the
app's survival, not the data's. This is the single highest-consequence unknown
in Part 1.

**MUST VERIFY against current iOS before relying on it.** If installed PWAs turn
out not to be exempt, Part 1 needs a different answer to seasonal disuse, and
that is a design change, not a detail.

---

## Entry flow

| Step | Input | Chunks |
|---|---|---|
| 1 | Pars | 2 (3x3 pad) |
| 2 | Rankings | 2 (1-18 pad, greys out) |
| 3 | Roster: 8 names + handicaps, 2 teams of 4 | typed |
| 4 | Scores, 8 players x 2 nines | 16 (3x3 pad) |
| 5 | Results | existing engine, offline |

**20 keypad chunks** plus the roster.

---

## Build notes for the real PWA (not doable in the mockup)

**Set `viewport-fit=cover` in `index.html`:**

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

Without it, `env(safe-area-inset-*)` resolves to `0` and the safe-area padding
already written into the CSS does nothing — controls end up under the iPhone
home indicator. The mockup cannot set this because a published Artifact supplies
its own `<head>`; the CSS side is in place and starts working the moment the real
page carries this tag.

Also worth carrying over: `height:100dvh` (not `100vh`) on the app shell, so the
layout does not jump when Safari's toolbars slide away.

---

## MUST FIX BEFORE PORTING

The tie-break recap bug — see `CLAUDE.md`. It exists in **both** copies of the
scoring code. Port it as-is and there will be three copies of the same bug.

---

## OPEN QUESTIONS

1. **Does the roster persist between rounds?** Same eight guys most rounds.
   Prefilling names would remove the only real typing left; handicaps would
   still be confirmed each round since they move through the season. Not
   answered — and it sits slightly against §11's "keep nothing," so it needs a
   deliberate yes or no.
2. **Does this need a build step at all?** `NOTES-FROM-EMAIL-SEAT-2026-08-23.md`
   assumed a local build folder because `node_modules` churns badly on Drive.
   But an app this small may be one self-contained HTML file with no build and
   no dependencies — in which case it can live in Drive with everything else and
   the whole local-folder question evaporates. Decide before creating folders.
3. **Where does it get hosted?** A PWA must be installed from a URL. GitHub
   Pages repos are public on free accounts `[recall]` — acceptable here since
   there are no keys and no data, but it should be a conscious choice.
4. **Is 2 teams of 4 always the shape?** The CCW contract allows 1-5 teams of
   exactly 4 `[read]`. Kyle described exactly 8 players in 2 teams for the away
   case. Confirm before hardcoding either way.

---

## NOT PART 1 — do not drift into it

Part 2 is a copy of Kyle's AppSheet app: live hole-by-hole entry during the
round, tracking which twosome won each hole (the Nassau), junk buttons
(greenies, sandies, birdies), and a running who-is-winning display.

### CORRECTION to the earlier record — 2026-08-23

`NOTES-FROM-EMAIL-SEAT-2026-08-23.md` states the Nassau logic "lives only inside
the AppSheet app, which cannot be exported." **Kyle says otherwise:** the logic
lives in the **Google Sheet that feeds the AppSheet app.**

That changes Part 2 substantially. Sheet formulas are readable and exportable;
AppSheet's private config is not. Part 2's largest unknown becomes a file that
can simply be opened. **Read the backing Sheet before designing anything.**

### What the 4Score screenshot establishes `[read]`

Kyle supplied a live screenshot of 4Score mid-round (2026-08-23).

- App name is **4Score**. Bottom tabs: Holes · Junk · Pops · Strokes.
- Grid is **holes down, players across** — transposed from the Part 1 entry
  screen, which is one player across nine holes. Not a conflict: one is review,
  the other is entry.
- **Green numerals = team 1 won the hole. Yellow = team 2 won the hole.** Kyle's
  words. Uncolored = neither, i.e. halved.
- Colors fall on columns 1–2 together and 3–4 together, confirming the game is
  **2 vs 2 inside a foursome** — twosomes, NOT the 4-player teams the CCW data
  contract assumes. This is a different shape and it matters.

### What the screenshot does NOT establish — do not guess

The colors give the *display* rule. They do not give the *scoring* rule, and it
cannot be inferred from the image:

- **Hole 3** — scores 4, 4, 4, 4. Level on gross, yet colored green.
- **Hole 8** — scores 3, 3, 2, 4. Team 2 holds the low score, yet uncolored.

Those two only reconcile once handicap strokes are involved — consistent with
4Score having a dedicated **Pops** tab. The exact allocation and tie rule remain
unknown.

**Do not build the Part 2 calculator from inference.** Read the Sheet formulas,
then have Kyle confirm worked examples. A betting calculator that is subtly
wrong stays invisible until it is disputed on the course.

Kyle's read is that Part 2 "is not going to be hard." The display layer is
genuinely easy. The scoring rule is the whole job, and it is one Sheet away.
