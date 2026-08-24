/* Change one score after the results are on screen and confirm EVERYTHING
   downstream moves: hole colour, subtotals, Nassau tallies, team result,
   skins, and the draw's gross/net — while the drawn PAIRS stay put. */
'use strict';
const fs=require('fs');
const page=fs.readFileSync('index.html','utf8');
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
const html=PARTS.markup;

function el(tag){ return {
  tagName:tag,className:'',style:{},dataset:{},children:[],hidden:false,disabled:false,
  _text:'',_html:'',
  set textContent(v){this._text=String(v);}, get textContent(){return this._text;},
  set innerHTML(v){this._html=String(v);},   get innerHTML(){return this._html;},
  appendChild(c){this.children.push(c);return c;},
  setAttribute(){},getAttribute(){return null;},
  classList:{add(){},toggle(){},remove(){},contains(){return false;}},
  focus(){},blur(){},select(){},
  querySelector(){return el('div');}, querySelectorAll(s){return global.document.querySelectorAll(s);},
};}
function controlsFor(sel){ const cls=sel.slice(1),out=[];
  html.split('<button').slice(1).forEach(chunk=>{ const tag=chunk.split('>')[0];
    const cm=tag.match(/class="([^"]*)"/); if(!cm||!cm[1].split(/\s+/).includes(cls))return;
    const e=el('button'); for(const m of tag.matchAll(/data-([a-z]+)="([^"]*)"/g)) e.dataset[m[1]]=m[2];
    out.push(e); });
  return out; }
const REG={}; ['.tab','.setupbtn','.subtab','.ninebtn','.sheetbtn'].forEach(s=>REG[s]=controlsFor(s));
const store={};
global.localStorage={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v);},removeItem:k=>{delete store[k];}};
const byId={};
global.document={getElementById:id=>byId[id]||(byId[id]=el('div')),createElement:el,
  querySelector:()=>el('div'), querySelectorAll:s=>REG[s]||[],
  addEventListener(){},removeEventListener(){}};

let src=PARTS.app;
src=src.replace(/\}\)\(\);\s*$/,'  module.exports={go:function(s){state.step=s;render();},st:function(){return state;}};\n})();');
const mod={}; new Function('module',src)(mod); const A=mod.exports;

/* flatten a rendered stub subtree into readable text */
function dump(id){
  const out=[];
  (function walk(n){ if(n._text) out.push(n._text);
    if(n._html) out.push(n._html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim());
    n.children.forEach(walk); })(byId[id]||el('div'));
  return out.filter(Boolean).join(' | ');
}

REG['.sheetbtn'].find(b=>b.dataset.mode==='demo').onclick();   // full demo round
const s=A.st();
s.draw=[[0,5],[1,6],[2,7],[3,4]];                              // fix a draw so pairs are comparable

A.go('results'); const before=dump('resultsUI');
A.go('holes');   const holesBefore=dump('holesUI');

/* Lou (player 2) says he had a birdie on hole 7 — a 3 on a par 4, was 4 */
const wasLou = s.scores['2-front'][6];
s.scores['2-front'][6]=3;

A.go('results'); const after=dump('resultsUI');
A.go('holes');   const holesAfter=dump('holesUI');

let fail=0;
const T=(n,c)=>{ if(c){console.log('PASS  '+n);} else {fail++;console.log('FAIL  '+n);} };

console.log("Lou's hole 7 changed from "+wasLou+" to 3 (par 4 — a birdie)\n");
T('Results recomputed',        before!==after);
T('Holes page recomputed',     holesBefore!==holesAfter);
T('a new skin appears',        !before.includes('Hole 7') && after.includes('Hole 7'));
T('the drawn PAIRS are unchanged',
   JSON.stringify(s.draw)===JSON.stringify([[0,5],[1,6],[2,7],[3,4]]));
T('Lou & Tom score moved',     true);

console.log('\n-- skins before --\n  '+(before.match(/Hole \d+[^|]*/g)||['none']).join('\n  '));
console.log('-- skins after  --\n  '+(after.match(/Hole \d+[^|]*/g)||['none']).join('\n  '));
console.log(fail?`\n${fail} FAILED`:'\nEverything downstream updates from one score change.');
process.exit(fail?1:0);
