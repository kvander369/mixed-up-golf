/* The roster's promises, tested rather than asserted. Every one of these is a
 * money rule: a lost, stale or merged handicap moves the low man, and the low
 * man decides every hole of the inside game.
 *
 *   1. A person's CH is the LAST ONE YOU USED.
 *   2. The people survive "New round - clear everything".
 *   3. Joining the roster is always a deliberate tap. Nothing adds itself.
 *   4. Two men called Mark are two men, and the card can tell them apart.
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
    setEdit:  function(v){ pickEditing = v; },
    rows:     function(){ return document.getElementById("pickList").children; }
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
const row = n => A.rows().filter(r => (r.dataset.name || (r.children[0] && r.children[0]._text)) === n)[0];

/* ------------------------------------------------------------------ */

/* The SHIPPED app has an empty roster - Kyle's group lives only on his phone.
   So the suite builds its own, which also proves the setup path works. */
T('the app ships with nobody on the list', () => {
  eq(A.people().length, 0, 'empty out of the box');
});

T('a roster can be built from nothing', () => {
  [["Avery","9","Avery A"],["Blake","7","Blake B"],["Cody","6","Cody C"],
   ["Drew","25","Drew D"],["Eli","15","Eli E"],
   ["ChrisB","15","Chris B"],["Chris","9","Chris C"],["Sy","15","Simon Sy"]]
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

/* ---- guests: nothing joins the roster by itself ---- */

T('"Just today" puts a guest in the slot and NOWHERE else', () => {
  A.newRound('all');
  A.openPick(0);
  A.type('Ronnie');
  A.today();
  eq(A.st().roster[0].name, 'Ronnie', 'he is playing');
  eq(A.find('Ronnie'), null, 'but he is not in the roster');
  eq(A.isGuest('Ronnie'), true, 'he is a guest');
});

T('typing a CH for a guest does NOT sneak him into the roster', () => {
  A.remember('Ronnie', '12');
  eq(A.find('Ronnie'), null, 'still not in the roster');
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

/* ---- two men called Mark ---- */

T('both Marks exist, and the card tells them apart', () => {
  eq(A.find('Chris').full, 'Chris C', 'Mark is Fir');
  eq(A.find('ChrisB').full, 'Chris B', 'ChrisB is Elm');
  A.newRound('all');
  A.assign(0, A.find('Chris'));
  A.assign(1, A.find('ChrisB'));
  eq(A.st().roster[0].hcp, '9', 'Fir plays off 9');
  eq(A.st().roster[1].hcp, '15', 'Elm off 15');
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
  /* Ziggy on purpose: a name that is in NO roster, so this exercises the
     slot-collision branch and not the roster-duplicate one. Ronnie was added
     to the roster by an earlier test, which made him hit the wrong branch. */
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

/* ---- pruning ---- */

T('someone can be taken off the list', () => {
  const before = A.people().length;
  A.newRound('all');
  A.setEdit(true);
  A.openPick(0);
  const r = row('Eli');
  eq(!!r, true, 'Chuck has a row in edit mode');
  r.children[1].onclick();                       /* first tap arms it */
  eq(r.children[1]._text, 'Sure?', 'the first tap only arms it');
  r.children[1].onclick();                       /* second tap removes */
  eq(A.find('Eli'), null, 'Chuck is off the list');
  eq(A.people().length, before - 1, 'one fewer');
  A.setEdit(false);
});

T('removing someone does not disturb a round in progress', () => {
  A.newRound('all');
  A.assign(0, A.find('Avery'));
  A.setEdit(true);
  A.openPick(1);
  const r = row('Avery');
  r.children[1].onclick(); r.children[1].onclick();
  eq(A.st().roster[0].name, 'Avery', 'he is still playing today');
  eq(A.find('Avery'), null, 'but not on the list for next time');
  A.setEdit(false);
});

/* ---- first-time setup ---- */

const g = id => document.getElementById(id);

T('Edit list can add a man without closing or assigning him', () => {
  A.newRound('all');
  A.setEdit(true); A.openPick(0);
  g('edName').value = 'Tony'; g('edHcp').value = '13'; g('edFull').value = 'Tony Soprano';
  g('edAdd').onclick();
  eq(A.find('Tony').hcp, '13', 'he is on the list with his CH');
  eq(A.find('Tony').full, 'Tony Soprano', 'and his full name');
  eq(A.st().roster[0].name, '', 'he was NOT put in the slot');
  eq(g('edName').value, '', 'the field cleared, ready for the next man');
  eq(g('pickSheet').hidden, false, 'and the sheet stayed open');
  A.setEdit(false);
});

T('Edit list refuses a duplicate the same way', () => {
  A.setEdit(true); A.openPick(0);
  g('edName').value = 'Tony';
  g('edAdd').onclick();
  eq(A.people().filter(p => p.name === 'Tony').length, 1, 'still only one Tony');
  eq(A.msg().indexOf('already a Tony') >= 0, true, 'and it says why');
  A.setEdit(false);
});

/* LAST - this one empties the roster, which is how the app ships */
T('an empty roster tells you what to do instead of sitting blank', () => {
  A.people().splice(0);
  A.setEdit(false); A.openPick(0);
  eq(A.rows().length, 1, 'one line, not an empty box');
  eq(A.rows()[0]._text.indexOf('Nobody on the list yet') >= 0, true, 'it points at Edit list');
  A.setEdit(true); A.openPick(0);
  eq(A.rows()[0]._text.indexOf('Add your group below') >= 0, true, 'and says what to type first');
  A.setEdit(false);
});

console.log('');
console.log(fail ? fail + ' FAILED' : 'The roster keeps its promises.');
process.exit(fail ? 1 : 0);
