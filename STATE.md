# Mixed Up Golf - what is open now

One page, under 150 lines; `node state_size_test.js` refuses more. Finished
business goes to `STATE-ARCHIVE.md`, which also holds what was decided and why.

Last edited 2026-11-05.

## Owed, and by when

Nothing has a date on it.

## Staged but not sent

Nothing. The app has not changed since v27.

## Broken

No known bug in the app. Check: the loop under Tests in `CLAUDE.md`.

**`README.md` is stale in two places**, left alone in the 2026-11-05 trim:

- it says eight suites and 116 checks;
- it says "The app does not compute the bet", which stopped being true when the
  Nassau tab was added (v18-v21). The same README describes that tab further up.

## Not yet confirmed

**v27 on the phone.** The last sitting closed with the live site still on v26.
The live `sw.js` read v27 on 2026-11-05, so that half is done. Nobody has
recorded seeing it on the phone.
Check: the bottom of the Players screen shows v27 or later.

**Kyle's roster on the phone.** The docs still list "add the group, with distinct
card names for the two men who share a first name" as his to do. It may well be
done. It lives only on the phone, so a seat cannot check it. Ask Kyle.

## The slow-burn unknown

**iOS storage eviction.** Home-screen PWAs are *believed* exempt from Safari's
roughly 7-day eviction of site data. This has never been verified here. If the
belief is wrong, the app could open after a winter off with the roster gone. The
damage is bounded: retype eleven names (`RESTORE.md`).

Check: open the app after the winter gap and see whether the roster is there.
Record the answer here.
