# Handoff note — offline golf PWA (written 2026-08-23)

**Where this came from:** Kyle raised this in the *Yale Email Triage* Claude Code window,
which is the wrong home for it. This note exists so the Scannerbot seat starts with the
requirement instead of re-deriving it. It is a REQUIREMENTS CAPTURE, not a design — no
code was written and no decision here is final.

**Source honesty:** claims below marked `[read]` were read from files in this folder on
2026-08-23. Claims marked `[recall]` are the writing model's general knowledge, unverified
in that session. Everything else is Kyle's words.

---

## What Kyle actually wants

**V1 — the easy one.** At an away course, enter everything by hand *after the round*,
including information about the course itself. Then a phone app that **needs no internet**
and serves as a calculator running the CCW-Bot calculator part.

**V2 — the enhanced one.** A version of his **AppSheet** golf app that lets him enter data
for his team **as he plays**, and keeps a running tally of who is winning the
**"inside Nassau"** game they play. His AppSheet app does this today. He wants to copy it.

V2 contains V1. The calculator is the same in both; V2 adds live entry and a running
standing.

---

## What already exists here (so it does not get rebuilt)

- `CCW_System_README.md:5-9` `[read]` — this folder ALREADY contains a complete rebuild
  handoff spec. It states that `ccw_golf_photo.jsx` **is** the current front end,
  "unmodified, and is the primary artifact to preserve or port."
- `ccw_golf_photo.jsx` `[read]` — 42 KB React single-page app. Computes several golf
  scoring formats; displays roster, results, per-team scorecards, and a shareable
  plain-text recap. Client-side.
- `CCW_System_README.md:34-67` `[read]` — a defined **data contract**: one JSON blob per
  round; 1–5 teams × 4 players; per player `name`, `handicap` (integer course handicap),
  `scores` (exactly 18 integers, hole 1→18, gross), optional `tees: "G"` green-tee flag.
  The README calls this contract "the single most important thing to get right."
- The README's framing is ingestion-vs-scoring: step 1 reads cards, step 2 scores them.
  **The PWA request is a THIRD ingestion path** — manual entry — feeding the same contract.

**Implication:** V1 is mostly a keyboard for a calculator that already exists. The engine
is not the work; the entry form and the offline wrapper are.

---

## What does NOT exist here

`nassau` appears **nowhere** in this folder — searched every `.md`, `.gs`, `.js`, `.jsx`
on 2026-08-23, zero hits `[read]`. The inside-Nassau logic lives only inside the AppSheet
app, which cannot be exported (see below). **It must be described by Kyle, precisely.**

A betting calculator that is subtly wrong is the worst failure mode here: it is invisible
until it is disputed on the course. This deserves a pure, tested function with worked
examples Kyle confirms — not logic buried in a screen.

---

## Questions that must be answered before building V2

1. **What exactly is "inside Nassau" in Kyle's group?** A standard Nassau is three bets:
   front 9, back 9, total 18. "Inside" is a group-specific variant. Needed: does it press?
   automatically, or on request? at what margin? do presses carry? is it team best-ball or
   individual? what happens on a tie?
2. **Are handicap strokes applied per hole?** If yes, an away course needs its **stroke
   index** per hole, not just pars — 36 numbers to enter in a parking lot. This single
   answer decides whether manual course entry is pleasant or awful.
3. **Does the existing data contract carry course data at all** (pars, stroke index, tees)?
   Only §2.1's opening lines were read; the rest of the contract was not checked.
4. **Where does the data live?** Two different apps:
   - *Phone-only* (IndexedDB): simple, fully offline, but the round exists on one phone.
   - *Sheet-backed*: survives the phone, readable on a laptop, but needs auth and a sync
     story — and credentials can never sit in page code.
   AppSheet does the second today. Choosing the first is a real downgrade, not a detail.
5. **How many players/teams for the away-course case?** The CCW contract assumes 1–5 teams
   of 4. A casual away round may be one foursome — possibly a simpler shape.

---

## Technical notes worth carrying over

- **AppSheet cannot be exported.** No documented "export app definition" and the AppSheet
  API is data-oriented (rows), not config-oriented `[recall]`. The definition IS visible
  in DevTools network traffic because the browser must receive it to render `[recall]` —
  but it is AppSheet's private format, a *description* of the app, not something a PWA can
  consume. Reading the editor and the backing Sheet is faster and more useful.
- **The backing Google Sheet is readable** and is the real data model.
- **iOS storage eviction.** Safari clears script-writable storage (IndexedDB included) for
  sites unused ~7 days; **home-screen-installed PWAs are exempt** `[recall]`. So "add to
  home screen" is load-bearing, not cosmetic — used as a Safari bookmark, a golf app that
  sits idle over winter can lose its data. Deleting the home-screen icon deletes the data
  with it. **Verify against current iOS before relying on it.**
- **Apps Script is the wrong host for a PWA.** `ScannerBot_WebApp.gs:445` serves the UI via
  `HtmlService`, which renders inside a sandboxed iframe on a Google domain `[read]` —
  service workers and manifests need a top-level page on an origin you control `[recall]`.
  `ScannerBot_WebApp.gs:22` already documents this sandbox biting the `?app=` parameter.
  Usual split: static host for the front end, Apps Script as a JSON backend if needed.
- **GitHub Pages repos are public on free accounts** `[recall]`. Fine for scoring logic;
  never for keys.

---

## The question worth asking before any of it

Kyle likes the AppSheet app. It already does offline, sync, forms, and live Nassau
tracking on the iPhone. Rebuilding buys control and no vendor; it costs weeks and begins
by re-earning what already works. If AppSheet genuinely cannot handle **entering a brand
new course on the fly with no internet**, that is a concrete, sufficient reason and it
should be written down as the reason. If the motive is ownership, that is legitimate too —
but it changes what "done" means, and it should be said out loud rather than assumed.

---

## Where things live — decided by Kyle 2026-08-23

**Scannerbot stays in Google Drive** (`G:\My Drive\Claude-Scannerbot`). That is the
project's home and the Cowork seat reads it. Not moving.

**The PWA build gets its own LOCAL folder**, because a build folder on Drive is a bad
idea for one concrete reason: `node_modules` is thousands of small files that churn on
every install, and Drive tries to sync all of them — slow, and it manufactures conflict
copies. Kyle's call, and it is the right one.

**Note for whoever builds it:** a PWA's real home is neither folder. It is a URL on a web
host (GitHub Pages, Firebase Hosting, Netlify) that the phone installs from. The folders
hold *source*; the app itself lives on the web and then on the phone. So "eventually
everything lives in Drive" applies to the source and the docs — the running app will not.

**Nothing is being stolen:** the AppSheet app being copied is Kyle's own.

An earlier attempt from the email seat created a local copy of Scannerbot WITH git. Kyle
rejected it — "I don't need the whole git thing for this, it's a simple build." It was
deleted. Do not re-propose it.

---

## Seat switching is YOUR job, not Kyle's — instruction from Kyle 2026-08-23

Kyle: *"we may need to open cowork and the code terminal needs to manage how I do that and
when."*

This project may need **Cowork** (reads Google Drive, judgment and design pushback) as well
as **this code terminal** (edits files, runs things). Deciding whether a second seat is
needed, when to open it, what to hand it, and when to come back is **the code terminal's
job.** Kyle should never be left holding an unstated choice between two windows.

- Usually a second seat is NOT needed. Say "stay here" when that is the case.
- When it is needed, give the whole instruction at once: *open Cowork, paste exactly this,
  bring back that.* Not "you could also use Cowork for this."
- **Never run both seats on this folder at the same time.** It is Google-Drive-backed, so
  concurrent writes do not merely conflict — Drive manufactures duplicate conflict copies.
  One seat at a time, handed off deliberately through a file like this one.
