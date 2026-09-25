/* Junk on the hole screen, as Kyle asked for it on 2026-09-25:
 *   - birdies are counted off the card, natural (gross) only; an eagle is two
 *   - chippies and sandies are locked until the word is tapped, then each
 *     cell cycles 0-1-2-3-4-5-0 for this hole; moving holes locks them again
 *
 * Loads index.html the way smoke.js does and runs the app's real code.
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

function el(tag) {
  return {
    tagName: tag, className: '', style: {}, dataset: {}, children: [],
    hidden: false, disabled: false, _text: '', _html: '',
    set textContent(v) { this._text = String(v); }, get textContent() { return this._text; },
    set innerHTML(v) { this._html = String(v); if (v === '') this.children = []; },
    get innerHTML() { return this._html; },
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
  '  module.exports={junkPool:junkPool, birdiesOn:birdiesOn, renderHoleEntry:renderHoleEntry,'
  + ' st:function(){return state;}};\n})();');
const mod = {};
new Function('module', src)(mod);
const A = mod.exports;
if (typeof A.birdiesOn !== 'function') { console.error('birdiesOn() not found in the app'); process.exit(1); }

let fail = 0;
const T = (name, fn) => { try { fn(); console.log('PASS  ' + name); }
                          catch (e) { fail++; console.log('FAIL  ' + name + '\n        ' + e.message); } };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b))
  throw new Error((m || '') + ' got ' + JSON.stringify(a) + ' want ' + JSON.stringify(b)); };

const st = A.st();
function blank(){
  st.pars = {front:[4,4,4,4,4,4,4,4,4], back:[5,5,5,5,5,5,3,3,3]};
  for (let p = 0; p < 4; p++) { st.scores[p+'-front'] = Array(9).fill(null); st.scores[p+'-back'] = Array(9).fill(null); }
  for (let h = 0; h < 18; h++) st.junk[h] = {b:[0,0,0,0], c:[0,0,0,0], s:[0,0,0,0], g12:0, g34:0};
}
const score = (p, h, v) => { st.scores[p+(h<9?'-front':'-back')][h%9] = v; };

/* ---- birdies ---- */
T('a gross birdie counts one, par counts none, an unplayed hole counts none', () => {
  blank(); score(0,0,3); score(1,0,4);
  eq([A.birdiesOn(0,0), A.birdiesOn(0,1), A.birdiesOn(0,2)], [1,0,0]);
});
T('an eagle counts two; a hole-in-one on a par 3 is an eagle', () => {
  blank(); score(0,9,3); score(2,15,1);
  eq([A.birdiesOn(9,0), A.birdiesOn(15,2)], [2,2]);
});
T('a bogey never counts negative', () => {
  blank(); score(0,0,6);
  eq(A.birdiesOn(0,0), 0);
});
T('a tapped birdie from an old saved round is ignored - the card decides', () => {
  blank(); st.junk[0].b = [1,1,1,1];
  eq([A.junkPool().p12, A.junkPool().p34], [0,0]);
});
T('junk is per man on the card, pooled by side for the money', () => {
  /* the same round nassau_test used to carry, with the birdies now on the card */
  blank();
  score(0,0,3);                                   // birdie, hole 1
  st.junk[3].c = [0,1,0,1];  st.junk[7].s = [1,1,0,0];
  st.junk[10].g12 = 1;       st.junk[11].g34 = 2;
  score(1,17,2); score(2,17,2);                   // birdies, hole 18 (par 3)
  const j = A.junkPool();
  eq([j.p12, j.p34, j.diff], [6, 4, 2], 'side 12 six, side 34 four, up two');
});
T('an eagle is two in the pool', () => {
  blank(); score(3,9,3);
  eq(A.junkPool().p34, 2);
});

/* ---- the locked rows on the hole screen ---- */
function grid(){
  const ui = byId['holeUI'];
  const jg = ui.children.find(c => c.className === 'junkgrid');
  const rows = jg.children.slice(1);             // skip the name header
  return { birdie: rows[0], chip: rows[1], sand: rows[2] };
}
/* a clean hole 1 with every row locked. The open row outlives a test, so
   step off the hole and back - which is itself the rule being tested. */
function fresh(){ blank(); st.holeIdx = 1; A.renderHoleEntry(); st.holeIdx = 0; A.renderHoleEntry(); }
const cells = row => row.children.slice(1);
const shown = c => c.innerHTML.match(/<span>(\d+)<\/span>/)[1] * 1;

T('the birdie row has no taps at all', () => {
  fresh();
  const r = grid().birdie;
  eq(r.children[0].onclick, undefined, 'label');
  cells(r).forEach((c,i) => eq(c.onclick, undefined, 'cell ' + i));
});
T('chippie and sandie cells are locked until the word is tapped', () => {
  fresh();
  const g = grid();
  cells(g.chip).concat(cells(g.sand)).forEach(c => eq(typeof c.onclick, 'undefined'));
  eq(typeof g.chip.children[0].onclick, 'function', 'the word CHIPPIE is a button');
});
T('tapping CHIPPIE opens that row only; its cells then count', () => {
  fresh();
  grid().chip.children[0].onclick(); A.renderHoleEntry();
  eq(typeof cells(grid().chip)[1].onclick, 'function', 'chippie open');
  eq(typeof cells(grid().sand)[1].onclick, 'undefined', 'sandie still locked');
});
T('an open cell cycles 0,1,2,3,4,5 and back to 0, showing this hole', () => {
  fresh();
  grid().chip.children[0].onclick(); A.renderHoleEntry();
  const seen = [shown(cells(grid().chip)[1])];
  for (let i = 0; i < 6; i++) { cells(grid().chip)[1].onclick(); A.renderHoleEntry(); seen.push(shown(cells(grid().chip)[1])); }
  eq(seen, [0,1,2,3,4,5,0]);
  eq(st.junk[0].c[1], 0, 'stored back at zero');
});
T('tapping the word again locks the row', () => {
  fresh();
  grid().sand.children[0].onclick(); A.renderHoleEntry();
  grid().sand.children[0].onclick(); A.renderHoleEntry();
  eq(typeof cells(grid().sand)[0].onclick, 'undefined');
});
T('moving to another hole locks the row again', () => {
  fresh();
  grid().chip.children[0].onclick(); A.renderHoleEntry();
  st.holeIdx = 1; A.renderHoleEntry();
  eq(typeof cells(grid().chip)[0].onclick, 'undefined');
});

console.log(fail ? `\n${fail} FAILED` : '\nJunk counts itself where it can and is locked where it cannot.');
process.exit(fail ? 1 : 0);
