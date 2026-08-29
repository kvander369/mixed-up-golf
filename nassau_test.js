/* The Nassau, checked against the rounds Kyle and I worked through by hand on
 * 2026-08-29. Every expected number below is one he agreed to in words before
 * any code existed, so a failure here means the code has drifted from the
 * game, not that the test is stale.
 *
 * Unlike skins_test.js, this does NOT keep its own copy of the logic. It loads
 * index.html the way smoke.js does and runs the app's real nassau(), so it
 * cannot pass while the app is wrong.
 */
'use strict';
const fs = require('fs');
const page = fs.readFileSync(__dirname + '/index.html', 'utf8');

function pageParts(page){
  const parts = page.split('<script>');
  const blocks = parts.slice(1).map(p => p.split('</script>')[0]);
  const app = blocks.reduce((a,b) => b.length > a.length ? b : a, '');
  if(!app.trim()) { console.error('no script block found in index.html'); process.exit(1); }
  return app;
}

/* the same minimal stand-ins smoke.js uses; the app boots and renders once */
function el(tag) {
  return {
    tagName: tag, className: '', style: {}, dataset: {}, children: [],
    hidden: false, disabled: false, _text: '', _html: '',
    set textContent(v) { this._text = String(v); }, get textContent() { return this._text; },
    set innerHTML(v) { this._html = String(v); },   get innerHTML() { return this._html; },
    appendChild(c) { this.children.push(c); return c; },
    setAttribute() {}, getAttribute() { return null; },
    classList: { add() {}, toggle() {}, remove() {}, contains() { return false; } },
    focus() {}, blur() {}, select() {},
    querySelector() { return el('div'); }, querySelectorAll() { return []; },
  };
}
const store = {};
global.localStorage = { getItem: k => (k in store ? store[k] : null),
                        setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const byId = {};
global.document = { getElementById(id) { return byId[id] || (byId[id] = el('div')); },
                    createElement: el, querySelector() { return el('div'); }, querySelectorAll() { return []; },
                    addEventListener() {}, removeEventListener() {} };

let src = pageParts(page);
src = src.replace(/\}\)\(\);\s*$/,
  '  module.exports={nassau:nassau, junkPool:junkPool, st:function(){return state;}};\n})();');
const mod = {};
new Function('module', src)(mod);
const A = mod.exports;
if (typeof A.nassau !== 'function') { console.error('nassau() not found in the app'); process.exit(1); }

let fail = 0;
const T = (name, fn) => { try { fn(); console.log('PASS  ' + name); }
                          catch (e) { fail++; console.log('FAIL  ' + name + '\n        ' + e.message); } };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b))
  throw new Error((m || '') + ' got ' + JSON.stringify(a) + ' want ' + JSON.stringify(b)); };

/* a nine written the way Kyle narrates it: U = we (side 12) won, T = they won, - = halved */
const nine = s => s.split('').map(c => c === 'U' ? '12' : c === 'T' ? '34' : c === '-' ? 'AS' : null);
const round = (f, b) => nine(f).concat(nine(b));
const diffs = n => n.bets.map(b => b.diff);
const PAR = '---------';

/* ---- the first worked example: "after 7 we are 0 and 2" ---- */
T('front: 2 down after hole 2 starts a press on hole 3', () => {
  const r = A.nassau(round('TT--U-T--', PAR));
  eq(r.front.bets.length, 2, 'bets on the front');
  eq(r.front.bets[1].start, 2, 'press starts on hole 3 (index 2)');
});
T('the ledger reads exactly as Kyle narrated it', () => {
  const r = A.nassau(round('TT--U-T--', PAR));
  eq(r.front.bets[0].run, [-1,-2,-2,-2,-1,-1,-2,-2,-2], 'front');
  eq(r.front.bets[1].run, [0,0,1,1,0,0,0], 'press');
});
T('drifting back to 2 down does NOT press again', () => {
  const r = A.nassau(round('TT--U-T--', PAR));
  eq(r.front.presses, 1);
});
T('"they won the front, the press was sawed off" - front costs 1X, press pays nothing', () => {
  const r = A.nassau(round('TT--U-T--', PAR));
  eq(r.front.bets[0].ways, -1, 'front');
  eq(r.front.bets[1].ways,  0, 'press');
});

/* ---- "6, 4, 2 and 0": three presses, the ceiling for a nine ---- */
T('winning 1,2,4,5,7,8 stacks three presses and ends 6, 4, 2 and 0', () => {
  const r = A.nassau(round('UU-UU-UU-', PAR));
  eq(diffs(r.front), [6,4,2,0]);
});
T('a press cannot start on a hole that does not exist - winning all nine holds four', () => {
  /* 2 up at 2, 4, 6, 8 -> presses start on 3, 5, 7, 9. The one that would be
     triggered on hole 9 has nowhere to go. I told Kyle three was the ceiling;
     that was true of the halved-every-third-hole pattern, not of a nine. */
  const r = A.nassau(round('UUUUUUUUU', PAR));
  eq(r.front.presses, 4);
  eq(r.front.bets[4].start, 8, 'the last press starts on hole 9');
  eq(r.front.bets[4].run, [1], 'and lives for one hole');
});
T('only the newest bet spawns a press - the front at 6 up does not keep pressing', () => {
  const r = A.nassau(round('UU-UU-UU-', PAR));
  eq(r.front.bets.length, 4);
});
T('"we won three ways" on that front', () => {
  const r = A.nassau(round('UU-UU-UU-', PAR));
  eq(r.front.bets.map(b => b.ways), [1,1,1,0]);
});

/* ---- the whole simulated round, agreed at "you win 3X" ---- */
const FULL = round('UU-UU-UU-', 'TT-TT-U--');
T('back: they win 10,11,13,14 and we win 16 -> 3, 1 and 1', () => {
  eq(diffs(A.nassau(FULL).back), [-3,-1,1]);
});
T('the back is worth 2X but its presses stay 1X - "they get 2X"', () => {
  eq(A.nassau(FULL).back.bets.map(b => b.ways), [-2,-1,1]);
});
T('overall is holes won across 18: 7 to 4, worth 2X', () => {
  const r = A.nassau(FULL);
  eq([r.won12, r.won34], [7,4]);
  eq(r.overall.ways, 2);
});
T('the round settles at +3 ways', () => {
  eq(A.nassau(FULL).ways, 3);
});

/* ---- double the back ---- */
T('doubling the back makes that one bet 4X, presses still 1X, overall untouched', () => {
  const r = A.nassau(FULL, {doubleBack:true});
  eq(r.back.bets.map(b => b.ways), [-4,-1,1]);
  eq(r.overall.ways, 2);
});
T('with the back doubled the same round is a squeaker: +1 way', () => {
  eq(A.nassau(FULL, {doubleBack:true}).ways, 1);
});
T('"bingo": win front, doubled back and overall with no presses = 7X', () => {
  const r = A.nassau(round('U--------', 'U--------'), {doubleBack:true});
  eq(r.front.presses + r.back.presses, 0, 'no presses');
  eq(r.ways, 7);
});

/* ---- ties ---- */
T('a tied front is sawed off by default', () => {
  const r = A.nassau(round('UT-------', 'U--------'));
  eq(r.front.bets[0].ways, 0);
});
T('with carry on, a tied front goes to whoever wins the back', () => {
  const r = A.nassau(round('UT-------', 'U--------'), {carryFront:true});
  eq(r.front.bets[0].carried, true);
  eq(r.front.bets[0].ways, 1);
});
T('with carry on and both nines tied, the front is still sawed off', () => {
  const r = A.nassau(round('UT-------', 'UT-------'), {carryFront:true});
  eq(r.front.bets[0].ways, 0);
});
T('a tied overall pays nobody', () => {
  const r = A.nassau(round('U--------', 'T--------'));
  eq(r.overall.ways, 0);
});

/* ---- an unfinished round ---- */
T('a bet with holes still to play has no winner yet', () => {
  const r = A.nassau(nine('UU-UU').concat(Array(13).fill(null)));
  eq(r.front.bets[0].done, false);
  eq(r.front.bets[0].winner, null);
  eq(r.ways, 0, 'nothing settles early');
});
T('an unplayed hole moves nothing and cannot trigger a press', () => {
  const r = A.nassau(nine('T').concat(Array(17).fill(null)));
  eq(r.front.presses, 0);
  eq(r.front.bets[0].run[1], null);
});

/* ---- junk, pooled by side ---- */
T('junk is per man on the card, pooled by side for the money', () => {
  const st = A.st();
  for (let h = 0; h < 18; h++) st.junk[h] = {b:[0,0,0,0], c:[0,0,0,0], s:[0,0,0,0], g12:0, g34:0};
  st.junk[0].b = [1,0,0,0];  st.junk[3].c = [0,1,0,1];  st.junk[7].s = [1,1,0,0];
  st.junk[10].g12 = 1;       st.junk[11].g34 = 2;       st.junk[17].b = [0,1,1,0];
  const j = A.junkPool();
  eq([j.p12, j.p34, j.diff], [6, 4, 2], 'side 12 six, side 34 four, up two');
});

console.log(fail ? `\n${fail} FAILED` : '\nThe Nassau settles the way the group plays it.');
process.exit(fail ? 1 : 0);
