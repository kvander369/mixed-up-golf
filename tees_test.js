/* Green tees at CCW (added 2026-09-19, v22).
 *
 * The card's "Men's Hdcp/G" row differs from white on two holes only: hole 2
 * is 3 white / 1 green, hole 5 is 1 white / 3 green. The green-white combo
 * plays both of those from green, so it shares the green pattern. A green-tee
 * man therefore gets different strokes ONLY when he is getting 1 or 2 (or 19
 * or 20): one stroke lands on hole 2 instead of hole 5.
 *
 * Like nassau_test.js this loads index.html and runs the app's REAL
 * insideGame() and netOf(), so it cannot pass while the app is wrong. It also
 * re-checks rule 4 with a green man in play: the inside game still works off
 * the low man and the team game off the raw handicap.
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
src = src.replace(/\}\)\(\);\s*$/, () =>
  '  module.exports={insideGame:insideGame, netOf:netOf, ranksFor:ranksFor, isCCW:isCCW,\n' +
  '    full:full, assignPerson:assignPerson, addPerson:addPerson, rememberGreen:rememberGreen,\n' +
  '    findPerson:findPerson, renderPlayers:renderPlayers, st:function(){return state;}};\n})();');
const mod = {};
new Function('module', src)(mod);
const A = mod.exports;
if (typeof A.insideGame !== 'function' || typeof A.netOf !== 'function') {
  console.error('insideGame()/netOf() not found in the app'); process.exit(1);
}

let fail = 0;
const T = (name, fn) => { try { fn(); console.log('PASS  ' + name); }
                          catch (e) { fail++; console.log('FAIL  ' + name + '\n        ' + e.message); } };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b))
  throw new Error((m || '') + ' got ' + JSON.stringify(a) + ' want ' + JSON.stringify(b)); };

/* everybody shoots 5 on every hole, so net = 5 - strokes and the holes where
   a man strokes are simply the holes where his net is below 5 */
function setup(hcps, greens){
  const s = A.st();
  for (let i = 0; i < 8; i++) {
    s.roster[i] = i < 4 ? { name: ['Avery','Blake','Cody','Drew'][i], hcp: String(hcps[i]), green: !!greens[i] }
                        : { name: '', hcp: '' };
    s.scores[i + '-front'] = Array(9).fill(5);
    s.scores[i + '-back']  = Array(9).fill(5);
  }
}
const strokeHoles = nets => nets.map((n, h) => n < 5 ? h + 1 : 0).filter(Boolean);
const WHITE = [7,3,15,11,1,13,5,17,9, 6,10,18,8,16,2,12,14,4];

T('the app opens on CCW white rankings', () => {
  eq(A.isCCW(), true); eq(A.full(A.st().ranks), WHITE);
});
T('green row differs from white on holes 2 and 5 only, and is still 1..18', () => {
  setup([10,10,10,10],[1,0,0,0]);
  const g = A.ranksFor(0), w = A.ranksFor(1);
  eq(w, WHITE, 'white man');
  eq(g.map((v,h) => v !== w[h] ? h + 1 : 0).filter(Boolean), [2,5], 'holes that differ');
  eq([g[1], g[4]], [1,3], 'green hole 2 / hole 5');
  eq(g.slice().sort((a,b) => a-b), WHITE.slice().sort((a,b) => a-b), 'a full set of rankings');
});

/* ---- inside game: strokes come off the LOW MAN ---- */
T('inside game, 1 stroke: white man strokes on 5, green man on 2', () => {
  setup([11,10,11,10],[0,0,1,0]);           // Avery white +1, Cody green +1
  const g = A.insideGame();
  eq(g.pops, [1,0,1,0], 'pops');
  eq(strokeHoles(g.net[0]), [5], 'Avery (white)');
  eq(strokeHoles(g.net[2]), [2], 'Cody (green)');
});
T('inside game, 2 strokes: white 5 and 15, green 2 and 15', () => {
  setup([12,10,12,10],[0,0,1,0]);
  const g = A.insideGame();
  eq(strokeHoles(g.net[0]), [5,15], 'Avery (white)');
  eq(strokeHoles(g.net[2]), [2,15], 'Cody (green)');
});
T('inside game, 3 strokes: the tee makes no difference', () => {
  setup([13,10,13,10],[0,0,1,0]);
  const g = A.insideGame();
  eq(strokeHoles(g.net[0]), [2,5,15]); eq(strokeHoles(g.net[2]), [2,5,15]);
});
T('inside game: the toggle can flip who wins a hole', () => {
  setup([11,10,10,10],[0,0,0,0]);           // Avery +1, white: his shot is on 5
  eq([A.insideGame().pts[1], A.insideGame().pts[4]], ['AS','12'], 'white');
  A.st().roster[0].green = true;            // now his shot is on 2
  eq([A.insideGame().pts[1], A.insideGame().pts[4]], ['12','AS'], 'green');
});

/* ---- team game: strokes come off the RAW handicap ---- */
T('team game, raw CH 1: white strokes on 5, green on 2', () => {
  setup([1,1,9,9],[0,1,0,0]);
  eq(strokeHoles(A.netOf(0, WHITE)), [5], 'Avery (white)');
  eq(strokeHoles(A.netOf(1, WHITE)), [2], 'Blake (green) - even when handed the white row');
});
T('team game, raw CH 20: the SECOND shot moves from 5 to 2', () => {
  setup([20,20,9,9],[0,1,0,0]);
  const two = n => n.map((v,h) => v === 3 ? h + 1 : 0).filter(Boolean);
  eq(two(A.netOf(0, WHITE)), [5,15], 'white'); eq(two(A.netOf(1, WHITE)), [2,15], 'green');
});

/* ---- rule 4 still holds with a green man in play ---- */
T('rule 4: a green low man gets NO inside strokes but keeps his raw ones', () => {
  setup([2,9,9,9],[1,0,0,0]);
  eq(strokeHoles(A.insideGame().net[0]), [], 'inside: he is low man');
  eq(strokeHoles(A.netOf(0, WHITE)), [2,15], 'team: raw 2, placed by the green row');
});

/* ---- CCW only ---- */
T('away course: the green flag does nothing', () => {
  setup([11,10,11,10],[0,0,1,0]);
  const s = A.st(), keep = JSON.parse(JSON.stringify(s.ranks));
  s.ranks.front = [1,3,5,7,9,11,13,15,17]; s.ranks.back = [2,4,6,8,10,12,14,16,18];
  eq(A.isCCW(), false);
  eq(A.ranksFor(2), A.full(s.ranks), 'green man uses the typed rankings');
  eq(strokeHoles(A.insideGame().net[2]), [1], 'his one shot is on the away no.1 hole');
  s.ranks = keep;
});

/* ---- the roster remembers ---- */
T('his tee comes with him from the roster, like his CH', () => {
  A.addPerson('Eli', '14');
  A.rememberGreen('Eli', true);
  A.assignPerson(3, A.findPerson('Eli'));
  eq([A.st().roster[3].name, A.st().roster[3].hcp, A.st().roster[3].green], ['Eli','14',true]);
});
T('remembering a tee never creates a person', () => {
  A.rememberGreen('Sy', true);
  eq(A.findPerson('Sy'), null);
});
T('Players screen: a tee button per slot on CCW, none away', () => {
  const ui = byId.playersUI;
  const count = () => { let n = 0; (function walk(e){ if (e.dataset && e.dataset.tee !== undefined) n++;
                        (e.children || []).forEach(walk); })(ui); return n; };
  ui.children = []; A.renderPlayers(); eq(count(), 8, 'CCW');
  const s = A.st(), keep = s.ranks;
  s.ranks = { front:[1,3,5,7,9,11,13,15,17], back:[2,4,6,8,10,12,14,16,18] };
  ui.children = []; A.renderPlayers(); eq(count(), 0, 'away');
  s.ranks = keep;
});

T('tapping the button flips the man, saves it to the roster, and taps back', () => {
  const ui = byId.playersUI, s = A.st();
  const btn = () => { let f = null; (function walk(e){ if (e.dataset && e.dataset.tee === 3) f = e;
                      (e.children || []).forEach(walk); })(ui); return f; };
  ui.children = []; A.renderPlayers();       // slot 4 is Eli, green, from the test above
  eq(btn().textContent, 'G', 'label');
  btn().onclick();
  eq([s.roster[3].green, A.findPerson('Eli').green], [false,false], 'after one tap');
  ui.children = []; A.renderPlayers();
  eq(btn().textContent, 'W', 'label after the tap');
  btn().onclick();
  eq([s.roster[3].green, A.findPerson('Eli').green], [true,true], 'after two taps');
});

console.log(fail ? `\n${fail} FAILED` : '\nGreen tees place strokes the way the card says.');
process.exit(fail ? 1 : 0);
