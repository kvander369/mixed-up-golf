/* Smoke test for the golf app page.
 *
 * Renders every screen AND fires every control's real click handler against a
 * DOM stub built from the page's own markup. Catches the class of bug a syntax
 * check cannot: deleted functions still being called, bad property access,
 * handlers wired to elements that no longer exist.
 *
 *     node smoke.js
 */
'use strict';
const fs = require('fs');

const page = fs.readFileSync('index.html', 'utf8');
/* The page carries SEVERAL <script> blocks now (a head script, the app, the
   service-worker registration). Both of these were hard-coded to block [1]
   and to "markup = everything before the first script". Adding one small
   script to the head broke that: block [1] stopped being the app, and the
   markup collapsed to just the <head>, so controlsFor() would have found ZERO
   buttons and the suite would have passed while testing nothing.
   So: markup is everything that is not a script, and the app is the LONGEST
   script block. Split, never regex - a heredoc once turned an escape into a
   control character here. */
function pageParts(page){
  const parts = page.split('<script>');
  const blocks = parts.slice(1).map(p => p.split('</script>')[0]);
  const markup = parts.map((p,i) => i===0 ? p : p.split('</script>').slice(1).join('</script>')).join('');
  const app = blocks.reduce((a,b) => b.length > a.length ? b : a, '');
  if(!app.trim()) { console.error('no script block found in index.html'); process.exit(1); }
  return { markup: markup, app: app };
}
const PARTS = pageParts(page);
const html = PARTS.markup;

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
    querySelector() { return el('div'); },
    querySelectorAll(sel) { return global.document.querySelectorAll(sel); },
  };
}

/* Stand-ins for the real controls, carrying their data-* attributes so the
   handlers behave exactly as they do in the browser. Parsed by splitting, not
   by regex escapes — a heredoc once turned \b into a backspace char here and
   silently matched nothing. */
function controlsFor(sel) {
  const cls = sel.slice(1);
  const out = [];
  html.split('<button').slice(1).forEach(chunk => {
    const tag = chunk.split('>')[0];
    const cm = tag.match(/class="([^"]*)"/);
    if (!cm || !cm[1].split(/\s+/).includes(cls)) return;
    const e = el('button');
    for (const m of tag.matchAll(/data-([a-z]+)="([^"]*)"/g)) e.dataset[m[1]] = m[2];
    out.push(e);
  });
  return out;
}

const REG = {};
['.tab', '.setupbtn', '.subtab', '.ninebtn', '.sheetbtn'].forEach(s => REG[s] = controlsFor(s));

const store = {};
global.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; },
};
const byId = {};
global.document = {
  getElementById(id) { return byId[id] || (byId[id] = el('div')); },
  createElement: el,
  querySelector() { return el('div'); },
  querySelectorAll(sel) { return REG[sel] || []; },
  /* the page's head script attaches gesture listeners */
  addEventListener() {}, removeEventListener() {},
};

let src = PARTS.app;
src = src.replace(/\}\)\(\);\s*$/,
  '  module.exports={go:function(s){state.step=s;render();},st:function(){return state;}};\n})();');
const mod = {};
new Function('module', src)(mod);
const A = mod.exports;

const SCREENS = ['pars', 'ranks', 'players', 'roster', 'scores', 'holes', 'results', 'hole', 'nassau'];
let fail = 0;
const T = (name, fn) => {
  try { fn(); console.log('PASS  ' + name); }
  catch (e) { fail++; console.log('FAIL  ' + name + '\n        ' + e.message); }
};

const found = Object.entries(REG).map(([k, v]) => k + '=' + v.length).join('  ');
console.log('controls found: ' + found + '\n');
if (Object.values(REG).some(v => v.length === 0)) {
  console.log('WARNING: a selector matched no controls — the harness may be blind.\n');
}

T('empty app renders every screen', () => SCREENS.forEach(A.go));

REG['.sheetbtn'].forEach(b => T('New Round › ' + b.dataset.mode, () => {
  b.onclick();
  SCREENS.forEach(A.go);
}));
REG['.tab'].forEach(b      => T('bottom tab › ' + b.dataset.tab,  () => b.onclick()));
REG['.setupbtn'].forEach(b => T('top button › ' + (b.dataset.setup || 'new'), () => b.onclick()));
REG['.subtab'].forEach(b   => T('sub-tab › ' + b.dataset.sub,     () => b.onclick()));
REG['.ninebtn'].forEach(b  => T('nine toggle › ' + b.dataset.nine, () => b.onclick()));

T('four-player round renders', () => {
  const s = A.st();
  for (let i = 4; i < 8; i++) s.roster[i] = { name: '', hcp: '' };
  SCREENS.forEach(A.go);
});

/* The version stamp is the only thing on screen that answers "did my phone
   actually update?". If it silently stopped rendering, nobody would notice
   until the next time that question mattered - which is exactly when it is
   too late to find out. */
T('the Players screen carries a version stamp', () => {
  A.go('players');
  const hit = (function find(n) {
    if (!n || !n.children) return null;
    if (n.className === 'vstamp') return n;
    for (const kid of n.children) { const r = find(kid); if (r) return r; }
    return null;
  })(document.getElementById('playersUI'));
  if (!hit) throw new Error('no .vstamp on the Players screen');
  if (!hit._text) throw new Error('the stamp is blank');
});

console.log(fail ? `\n${fail} FAILED` : '\nEvery screen and every control is clean.');
process.exit(fail ? 1 : 0);
