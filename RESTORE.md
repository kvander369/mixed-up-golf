# RESTORE.md — Mixed Up Golf

What it takes to make this project live again on a new machine. The repo
restores the files; this restores the system around them.

**The remote is the backup.** `https://github.com/kvander369/mixed-up-golf.git`
holds everything that matters. A commit that has not been pushed exists in one
place only — see the push rule in `CLAUDE.md`.

## Restoring

    git clone https://github.com/kvander369/mixed-up-golf.git
    cd mixed-up-golf
    node smoke.js        # and the other five suites listed in CLAUDE.md

The app itself needs nothing else. `index.html` is self-contained — no build,
no dependencies, no server. Opening the file works; so does GitHub Pages.

## What a clone does NOT bring back

Four files are gitignored on purpose (machine-specific, or personal). A fresh
clone will not have them, and nothing in the repo will tell you they are gone:

| File | What it is | How to get it back |
|---|---|---|
| `RESUME-Claude.bat` | the desktop launcher — cd's here, seat-guards, runs `claude --continue` | `make-launcher.ps1`, below |
| `seat-check.ps1` | duplicate-session guard the .bat calls; exit code = seats in THIS folder, 99 = check failed | rewrite, or copy from a sibling project — `backup-all` has one |
| `icon.png` | source artwork | already embedded as a data URI inside `index.html`; extract from there |
| `mixedupgolf.ico` | the shortcut's icon | rebuild from `icon.png` |

`icon-192.png` and `icon-512.png` ARE tracked — the PWA needs them.

## The launcher and its icon

Desktop shortcuts live in `%USERPROFILE%\OneDrive\Desktop\Resume Claude CLIs\`,
one `.lnk` per project, all built by `make-launcher.ps1` in that same folder.
Each points at its project's own `RESUME-Claude.bat`. There is also
`New Claude Launcher.bat` there for adding a project.

## Deploying

GitHub Pages serves `main` at the repo root — push and it redeploys itself.
Auth is `gh` (2.98.0) logged in as `kvander369` with `repo` scope; restore with
`gh auth login`. No token is stored in this repo, and none should be.

After any change to `index.html`, bump `CACHE` in `sw.js`. That string is the
only thing an installed phone compares — miss it and the phone runs the old
version forever. Then close the app fully and reopen it twice.

## The data is on the phone, and only there

The round (`mixedUpGolf.v1`) and the roster (`mixedUpGolf.people.v1`) live in
that phone's browser storage. They are not in this repo, not in any cloud, and
not recoverable if the phone is wiped or the site data cleared. **The roster is
retyped by hand after that** — eleven men, and remember `ChrisB` and `Mark` must
stay distinct. This is deliberate: `index.html` is public, so real names and
handicaps must never be committed. See the roster section of `CLAUDE.md`.

## Backup audit

Scheduled task **`CCW Backup Audit`**, Sundays 17:00, run by
`..\backup-all\CHECK-BACKUPS.bat` (also runnable by hand). It prints one
OK / WARN / FAILED line per project. It copies and deletes nothing.
Full plan: `..\backup-all\BACKUP_PLAN.md`.
