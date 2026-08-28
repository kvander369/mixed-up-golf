/* The roster's promises, tested rather than asserted. Every one of these is a
 * money rule: a lost, stale or merged handicap moves the low man, and the low
 * man decides every hole of the inside game.
 *
 *   1. A person's CH is the LAST ONE YOU USED.
 *   2. The people survive "New round - clear everything".
 *   3. Joining the list is always a deliberate tap. Nothing adds itself.
 *   4. Two men who share a first name are two men, and the card can tell
 *      them apart.
 *
 * The shipped app has an EMPTY roster - Kyle's group lives only on his phone -
 * so the suite builds its own, which also proves the setup path works.
 */
'use strict';
const fs = require('fs');
const page = fs.readFileSync('index.html', 'utf8');

function el(tag) {
  return {
    tagName: tag, className: '', style: {}, dataset: {}, children: [],
    hidden: false, disabled: false, value: '', _text: '', _html: '',
    set textContent(v) { this._text = String(v); }, get textContent() { return this._text; },
    set innerHTML(v) { this._html = String(v); this.children = []; }, get innerHTML() { return this._html; },
    appendChild(c) { this.children.push(c); return c; },
    setAttribute() {}, getAttribute() { return null; },
    classList: { add() {}, toggle() {}, remove() {}, contains() { return false; } },
    focus() {}, blur() {}, select() {},
    querySelector() { return el('div'); }, querySelectorAll() { return []; },
  };
}
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
  querySelectorAll() { return []; },
  addEventListener() {}, removeEventListener() {},
};

const parts = page.split('<script>');
const app = parts.slice(1).map(p => p.split('</script>')[0])
  .reduce((a, b) => (b.length > a.length ? b : a), '');

const src = app.replace(/\}\)\(\);\s*$/, `
  module.exports = {
    st:       function(){ return state; },
    people:   function(){ return people; },
    find:     function(n){ return findPerson(n); },
    isGuest:  function(n){ return isGuest(n); },
    openPick: function(i){ return openPick(i); },
    assign:   function(i,p){ return assignPerson(i,p); },
    remember: function(n,h){ return rememberHcp(n,h); },
    addP:     function(n,h,f){ return addPerson(n,h,f); },
    newRound: function(m){ return newRound(m); },
    type:     function(n){ document.getElementById("pickNewName").value = n; },
    today:    function(){ return addTyped(false); },
    keep:     function(){ return addTyped(true); },
    msg:      function(){ return document.getElementById("pickMsg").textContent; },
    rows:     function(){ return document.getElementById("pickList").children; },
    screen:   function(){ renderRoster(); return document.getElementById("rosterUI").children; },
    rmsg:     function(){ return document.getElementById("rMsg").textContent; }
  };
})();`);

const mod = {};
new Function('module', src)(mod);
const A = mod.exports;

let fail = 0;
const T = (name, fn) => {
  try { fn(); console.log('PASS  ' + name); }
  catch (e) { fail++; console.log('FAIL  ' + name + '\n      ' + e.message); }
};
const eq = (a, b, m) => { if (a !== b) throw new Error((m || '') + '  got ' + JSON.stringify(a) + ', wanted ' + JSON.stringify(b)); };

/* a row in the picker sheet */
const row = n => A.rows().filter(r => r.dataset.name === n)[0];
/* a row on the Roster screen, and the parts of that screen */
const part = cls => A.screen().filter(k => k.className === cls)[0];
const rrow = n => part('rlist').children.filter(r => r.dataset.name === n)[0];

/* ------------------------------------------------------------------ */

/* Start from nothing whichever file this runs against. The MOCK seeds Kyle's
   real group so he can see it working; the SHIPPED app seeds nobody. That the
   shipped one really is empty is enforced by port_roster.js, which refuses to
   write if a real surname appears, and re-checked against the live site after
   every deploy. */
T('the suite starts from a clean list', () => {
  A.people().splice(0);
  eq(A.people().length, 0, 'nobody');
});

T('a roster can be built from nothing', () => {
  [['Avery', '9', 'Avery A'], ['Blake', '7', 'Blake B'], ['Cody', '6', 'Cody C'],
   ['Drew', '25', 'Drew D'], ['Eli', '15', 'Eli E'],
   ['ChrisB', '15', 'Chris B'], ['Chris', '9', 'Chris C'], ['Sy', '15', 'Simon Sy']]
    .forEach(p => A.addP(p[0], p[1], p[2]));
  eq(A.people().length, 8, 'eight added');
  eq(A.find('Sy').full, 'Simon Sy', 'the full name comes along');
});

T('every name that reaches the card is unique', () => {
  const names = A.people().map(p => p.name.toLowerCase());
  eq(new Set(names).size, names.length, 'no two men share a card name');
});

T('picking a player brings their CH with them', () => {
  A.newRound('all');
  A.assign(0, A.find('Drew'));
  eq(A.st().roster[0].name, 'Drew', 'name lands in slot 1');
  eq(A.st().roster[0].hcp, '25', 'and so does the CH');
});

T('a name is matched however it is capitalised or spaced', () => {
  eq(A.find('  sY ').name, 'Sy', 'lookup is trimmed and case-insensitive');
});

T('typing a new CH becomes that person\'s number from then on', () => {
  A.remember('Drew', '21');
  eq(A.find('Drew').hcp, '21', 'the roster now carries 21');
  A.newRound('all');
  A.assign(0, A.find('Drew'));
  eq(A.st().roster[0].hcp, '21', 'and a NEW round starts him on 21, not 25');
});

T('the change is written to storage, not just held in memory', () => {
  const saved = JSON.parse(localStorage.getItem('mixedUpGolf.people.v1'));
  eq(saved.filter(p => p.name === 'Drew')[0].hcp, '21', 'the saved copy carries it');
});

T('New round CLEAR EVERYTHING wipes the slots but never the people', () => {
  A.assign(0, A.find('Drew'));
  A.assign(1, A.find('Blake'));
  A.newRound('all');
  eq(A.st().roster[0].name, '', 'slot 1 is empty');
  eq(A.people().length, 8, 'all eight are still there');
  eq(A.find('Drew').hcp, '21', 'and they kept their handicaps');
});

T('nobody can be put in two slots at once', () => {
  A.newRound('all');
  A.assign(0, A.find('Cody'));
  A.openPick(1);
  eq(row('Cody').disabled, true, 'he cannot be tapped for slot 2');
  eq(row('Cody').dataset.note, 'Already player 1', 'and it says where he is');
});

T('the man already in THIS slot is shown, not blocked', () => {
  A.newRound('all');
  A.assign(2, A.find('Eli'));
  A.openPick(2);
  eq(row('Eli').disabled, false, 'still tappable');
  eq(row('Eli').dataset.note, 'In this slot', 'and marked as being here');
});

T('the picker shows the CH with a colon and its own element', () => {
  A.newRound('all');
  A.openPick(0);
  eq(row('Sy').dataset.note, 'Last CH used: 15', 'colon and number');
});

/* ---- guests: nothing joins the list by itself ---- */

T('"Just today" puts a guest in the slot and NOWHERE else', () => {
  A.newRound('all');
  A.openPick(0);
  A.type('Ronnie');
  A.today();
  eq(A.st().roster[0].name, 'Ronnie', 'he is playing');
  eq(A.find('Ronnie'), null, 'but he is not on the list');
  eq(A.isGuest('Ronnie'), true, 'he is a guest');
});

T('typing a CH for a guest does NOT sneak him onto the list', () => {
  A.remember('Ronnie', '12');
  eq(A.find('Ronnie'), null, 'still not on the list');
  eq(A.people().length, 8, 'still eight');
});

T('"Add to roster" is a door in, and it is deliberate', () => {
  A.newRound('all');
  A.openPick(0);
  A.type('Ronnie');
  A.keep();
  eq(!!A.find('Ronnie'), true, 'now he is one of the group');
  eq(A.people().length, 9, 'nine');
});

T('a guest can be kept afterwards, so "Just today" is never a dead end', () => {
  A.newRound('all');
  A.openPick(1);
  A.type('Vinny');
  A.today();
  eq(A.find('Vinny'), null, 'a guest to start with');
  A.addP(A.st().roster[1].name, A.st().roster[1].hcp);   /* what the Keep button calls */
  eq(!!A.find('Vinny'), true, 'and kept afterwards');
});

/* ---- two men who share a first name ---- */

T('both men exist, and the card tells them apart', () => {
  eq(A.find('Chris').full, 'Chris C', 'the first Chris');
  eq(A.find('ChrisB').full, 'Chris B', 'and the second, with an initial');
  A.newRound('all');
  A.assign(0, A.find('Chris'));
  A.assign(1, A.find('ChrisB'));
  eq(A.st().roster[0].hcp, '9', 'the first Chris plays off 9');
  eq(A.st().roster[1].hcp, '15', 'the second off 15');
});

T('a duplicate card name is refused, not silently merged', () => {
  A.newRound('all');
  A.openPick(0);
  A.type('Chris');
  A.keep();
  eq(A.st().roster[0].name, '', 'nothing was assigned');
  eq(A.msg().indexOf('already a Chris') >= 0, true, 'and it says why');
});

T('a second man with the same name in another SLOT is refused too', () => {
  A.newRound('all');
  A.openPick(0);
  A.type('Ziggy');
  A.today();
  eq(A.st().roster[0].name, 'Ziggy', 'the first Ziggy is playing');
  A.openPick(1);
  A.type('Ziggy');
  A.today();
  eq(A.st().roster[1].name, '', 'slot 2 stays empty');
  eq(A.msg().indexOf('already called Ziggy') >= 0, true, 'and it says why');
});

/* ---- the Roster screen: one place, where you would look for it ---- */

T('the Roster screen lists everyone', () => {
  A.newRound('all');
  const luke = rrow('Avery');
  eq(!!luke, true, 'Luke has a row');
  eq(luke.children[0].children[0]._text, 'Avery', 'his card name');
  eq(luke.children[1].value, '9', 'and the CH he last used');
});

T('changing a CH there is what he starts on next round', () => {
  const r = rrow('Avery');
  r.children[1].value = '12';
  r.children[1].oninput();
  eq(A.find('Avery').hcp, '12', 'the roster took it');
  A.newRound('all');
  A.assign(0, A.find('Avery'));
  eq(A.st().roster[0].hcp, '12', 'and a new round starts him on 12');
});

T('changing it while he is PLAYING moves the round number too', () => {
  A.newRound('all');
  A.assign(3, A.find('Blake'));
  const r = rrow('Blake');
  r.children[1].value = '8';
  r.children[1].oninput();
  eq(A.find('Blake').hcp, '8', 'the roster took it');
  eq(A.st().roster[3].hcp, '8', 'and so did the round in progress');
});

T('the screen says who is playing today, so removing is never a surprise', () => {
  const r = rrow('Blake');
  eq(r.children[0].children[1].children[0]._text.indexOf('Playing today') >= 0, true,
     'it is marked on his row');
});

T('taking someone off takes two taps', () => {
  const before = A.people().length;
  const r = rrow('Cody');
  r.children[2].onclick();
  eq(r.children[2]._text, 'Sure?', 'the first tap only arms it');
  r.children[2].onclick();
  eq(A.find('Cody'), null, 'the second takes him off');
  eq(A.people().length, before - 1, 'one fewer');
});

T('the Roster screen adds a man, and clears itself for the next', () => {
  const before = A.people().length;
  const add = part('radd');
  add.children[2].children[0].value = 'Tony';   /* name */
  add.children[2].children[1].value = '13';     /* CH */
  add.children[3].value = 'Tony Soprano';       /* full */
  add.children[4].onclick();                    /* Add to roster */
  eq(A.find('Tony').hcp, '13', 'he is on the list with his CH');
  eq(A.find('Tony').full, 'Tony Soprano', 'and his full name');
  eq(A.people().length, before + 1, 'one more');
  eq(part('radd').children[2].children[0].value, '', 'the field is clear for the next man');
});

T('the Roster screen refuses a duplicate name too', () => {
  const before = A.people().length;
  const add = part('radd');
  add.children[2].children[0].value = 'Drew';
  add.children[4].onclick();
  eq(A.people().length, before, 'nobody was added');
  eq(A.rmsg().indexOf('already a Drew') >= 0, true, 'and it says why');
});

/* LAST - this one empties the roster, which is how the app ships */
T('an empty roster points at the Roster button', () => {
  A.people().splice(0);
  A.openPick(0);
  eq(A.rows().length, 1, 'one line, not an empty box');
  eq(A.rows()[0]._text.indexOf('Tap Roster at the top') >= 0, true, 'it says where to go');
});

T('and the Roster screen itself says what to do when empty', () => {
  const kids = A.screen();
  const empty = kids.filter(k => k.className === 'rempty')[0];
  eq(!!empty, true, 'there is a message');
  eq(empty._text.indexOf('stays on this phone') >= 0, true, 'and it says where the list lives');
});

console.log('');
console.log(fail ? fail + ' FAILED' : 'The roster keeps its promises.');
process.exit(fail ? 1 : 0);
