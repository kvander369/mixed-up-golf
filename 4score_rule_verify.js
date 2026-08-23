function strokesFor(s, si){ return Math.floor(s/18) + (si <= s%18 ? 1 : 0); }

const hcp  = [25, 7, 4, 13];
const low  = Math.min(...hcp);
const pops = hcp.map(h => h - low);
const SI   = [7,3,15,11,1,13,5,17,9, 6,10,18,8,16,2,12,14,4];

// GROSS, read down the columns of the sheet's last table (holes 1-5)
const gross = [
  [6,6,3,7,5],   // player 1  Kyle    (matches H1 G..H5 G)
  [5,4,3,4,5],   // player 2  Mark
  [5,4,3,5,5],   // player 3  Lou
  [6,5,3,6,5],   // player 4  Rando1
];

const sheetStrokes = [21,3,0,9];
const sheetNet = [                       // the sheet's H_ N columns
  [5,4,2,6,3],
  [5,3,3,4,4],
  [5,4,3,5,5],
  [5,4,3,6,4],
];
const sheetNetGrid = [                   // first table: net per hole, all four
  [5,5,5,5],[4,3,4,4],[2,3,3,3],[6,4,5,6],[3,4,5,4],
];
const sheetMP  = [null,'12','12','12','12'];
const sheetBB12 = [5,3,2,4,3], sheetBB34 = [5,4,3,5,4];

let fail=0;
const eq=(g,w,what)=>{const ok=JSON.stringify(g)===JSON.stringify(w);if(!ok)fail++;
  console.log(`${ok?'PASS':'FAIL'}  ${what}`+(ok?'':`\n        got  ${JSON.stringify(g)}\n        want ${JSON.stringify(w)}`));};

eq(pops, sheetStrokes, 'pops = course hcp - low man');

const net=(p,h)=> gross[p][h]===null?null: gross[p][h]-strokesFor(pops[p],SI[h]);
for(let p=0;p<4;p++) eq([0,1,2,3,4].map(h=>net(p,h)), sheetNet[p], `player ${p+1} net, holes 1-5`);

eq([0,1,2,3,4].map(h=>[0,1,2,3].map(p=>net(p,h))), sheetNetGrid, 'net grid matches sheet table 1');

const best=(a,b)=>a===null?b:b===null?a:Math.min(a,b);
eq([0,1,2,3,4].map(h=>best(net(0,h),net(1,h))), sheetBB12, 'BB 12 column');
eq([0,1,2,3,4].map(h=>best(net(2,h),net(3,h))), sheetBB34, 'BB 34 column');

const mp=[0,1,2,3,4].map(h=>{const a=best(net(0,h),net(1,h)),b=best(net(2,h),net(3,h));
  return a<b?'12':b<a?'34':null;});
eq(mp, sheetMP, 'Match Point column');

console.log(fail?`\n${fail} MISMATCH`:'\nEvery column reproduced exactly from the decoded rule.');
process.exit(fail?1:0);
