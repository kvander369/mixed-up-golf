/* Guards the one thing most likely to go quietly wrong in the golf app:
 * the inside game and the CCW 8-player result allocate strokes DIFFERENTLY.
 *
 *   inside game  : pops = course handicap - LOW MAN in the foursome
 *   CCW 8-player : strokes come off the RAW course handicap, no subtraction
 *
 * Same formula, different input. Share one function between them and every
 * net score is silently wrong. See GOLF_PWA_PART2_RULES.md section 2.
 */
'use strict';
function strokesFor(s, si){ return Math.floor(s/18) + (si <= s%18 ? 1 : 0); }

const SI   = [7,3,15,11,1,13,5,17,9, 6,10,18,8,16,2,12,14,4];
const HCP  = [25, 7, 4, 13];                  // Kyle, Mark, Lou, Rando1
const LOW  = Math.min(...HCP);
const POPS = HCP.map(h => h - LOW);           // 21, 3, 0, 9

let fail = 0;
const chk = (got, want, what) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}` +
    (ok ? '' : `\n        got ${JSON.stringify(got)} want ${JSON.stringify(want)}`));
};

chk(POPS, [21, 3, 0, 9], 'inside game: pops come off the low man');
chk(HCP,  [25, 7, 4, 13], 'CCW: raw course handicaps are untouched');

// Lou is low man, so he strokes in CCW but never in the inside game.
const louInside = SI.map(si => strokesFor(POPS[2], si)).reduce((a, b) => a + b, 0);
const louCCW    = SI.map(si => strokesFor(HCP[2],  si)).reduce((a, b) => a + b, 0);
chk(louInside, 0,  'Lou gets NO strokes in the inside game (he is low man)');
chk(louCCW,    4,  'Lou still gets his 4 strokes in the CCW result');

// The same gross score therefore nets differently in the two games.
const KYLE_GROSS_H1 = 6, H1_SI = SI[0];              // hole 1, stroke index 7
const insideNet = KYLE_GROSS_H1 - strokesFor(POPS[0], H1_SI);
const ccwNet    = KYLE_GROSS_H1 - strokesFor(HCP[0],  H1_SI);
chk(insideNet, 5, "Kyle nets 5 on hole 1 in the inside game (21 pops -> 1 shot)");
chk(ccwNet,    4, "Kyle nets 4 on hole 1 in the CCW result (25 hcp -> 2 shots)");
chk(insideNet !== ccwNet, true, 'the two games MUST disagree — that is the point');

console.log(fail ? `\n${fail} FAILED` : '\nThe two allocations are correctly separate.');
process.exit(fail ? 1 : 0);
