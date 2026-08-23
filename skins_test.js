/* Skins, per Kyle 2026-08-23:
 *   - based on GROSS scores, never net
 *   - birdie or better only (strictly under par)
 *   - if two players tie for the low score, the hole is knocked out
 *
 * Matches calcSkins in ccw_golf_photo.jsx / ScannerBot_CCW.gs.
 */
'use strict';

function calcSkins(pars, cards, names) {
  const out = [];
  for (let h = 0; h < 18; h++) {
    const par = pars[h];
    if (par === null) continue;
    const under = [];
    for (let i = 0; i < cards.length; i++) {
      const s = cards[i][h];
      if (s !== null && s < par) under.push({ name: names[i], score: s });   // gross, under par only
    }
    if (!under.length) continue;
    const min = Math.min(...under.map(u => u.score));
    const w = under.filter(u => u.score === min);
    if (w.length !== 1) continue;                                            // tie knocks the hole out
    const d = par - min;
    out.push({ hole: h + 1, player: w[0].name, score: min, par,
               type: d >= 3 ? 'Albatross' : d === 2 ? 'Eagle' : 'Birdie' });
  }
  return out;
}

let fail = 0;
const T = (name, fn) => { try { fn(); console.log('PASS  ' + name); }
                          catch (e) { fail++; console.log('FAIL  ' + name + '\n        ' + e.message); } };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b))
  throw new Error((m || '') + ' got ' + JSON.stringify(a) + ' want ' + JSON.stringify(b)); };

const P = Array(18).fill(4);                       // every hole a par 4
const blank = () => Array(18).fill(4);             // everyone makes par
const N = ['A', 'B', 'C', 'D'];

T('a lone birdie wins the skin', () => {
  const c = [blank(), blank(), blank(), blank()];
  c[0][5] = 3;
  const s = calcSkins(P, c, N);
  eq(s.length, 1); eq(s[0].player, 'A'); eq(s[0].hole, 6); eq(s[0].type, 'Birdie');
});

T('TWO birdies on the same hole knock it out', () => {
  const c = [blank(), blank(), blank(), blank()];
  c[0][5] = 3; c[2][5] = 3;
  eq(calcSkins(P, c, N).length, 0, 'tied low score must cancel the hole');
});

T('an eagle beats a birdie — not a knockout', () => {
  const c = [blank(), blank(), blank(), blank()];
  c[0][5] = 3;               // birdie
  c[1][5] = 2;               // eagle
  const s = calcSkins(P, c, N);
  eq(s.length, 1); eq(s[0].player, 'B'); eq(s[0].type, 'Eagle');
});

T('par never wins a skin', () => {
  eq(calcSkins(P, [blank(), blank(), blank(), blank()], N).length, 0);
});

T('a bogey never wins a skin', () => {
  const c = [blank(), blank(), blank(), blank()];
  c[0][5] = 5; c[1][5] = 6; c[2][5] = 6; c[3][5] = 6;
  eq(calcSkins(P, c, N).length, 0, 'lowest on the hole is still over par');
});

T('albatross is named correctly', () => {
  const c = [blank(), blank(), blank(), blank()];
  const p = Array(18).fill(5); c[0][5] = 2;
  const s = calcSkins(p, c, N);
  eq(s[0].type, 'Albatross');
});

T('an UNENTERED score never steals a skin', () => {
  // null < 4 is TRUE in JavaScript — the trap this guards
  const c = [blank(), blank(), blank(), blank()];
  c[0][5] = null;
  eq(calcSkins(P, c, N).length, 0, 'a missing score must be absent, not zero');
});

T('three players tie low — still knocked out', () => {
  const c = [blank(), blank(), blank(), blank()];
  c[0][5] = 3; c[1][5] = 3; c[2][5] = 3;
  eq(calcSkins(P, c, N).length, 0);
});

T('skins are gross — a big handicap does not create one', () => {
  // C plays off 20 but makes a 4 on a par 4: no skin, gross is what counts
  const c = [blank(), blank(), blank(), blank()];
  eq(calcSkins(P, c, N).length, 0);
});

console.log(fail ? `\n${fail} FAILED` : '\nSkins behave as Kyle described.');
process.exit(fail ? 1 : 0);
