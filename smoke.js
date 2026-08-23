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
const html = page.split('<script>')[0];

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
};

let src = page.split('<script>')[1].split('</script>')[0];
src = src.replace(/\}\)\(\);\s*$/,
  '  module.exports={go:function(s){state.step=s;render();},st:function(){return state;}};\n})();');
const mod = {};
new Function('module', src)(mod);
const A = mod.exports;

const SCREENS = ['pars', 'ranks', 'players', 'scores', 'holes', 'results', 'hole'];
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

console.log(fail ? `\n${fail} FAILED` : '\nEvery screen and every control is clean.');
process.exit(fail ? 1 : 0);
