// state_size_test.js - STATE.md is one page of what is open now, not a diary.
//
//   node state_size_test.js          checks STATE.md here, and proves it can refuse
//   node state_size_test.js <file>   checks that one file (exit 1 past the limit)
//
// Finished business goes to STATE-ARCHIVE.md. Kyle's decision 5, 2026-11-05.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const LIMIT = 150;

// Lines as `wc -l` and an editor count them: a final newline does not start a new line.
function countLines(text) {
  return text.replace(/\r?\n$/, '').split(/\r?\n/).length;
}

function checkOne(file) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (e) {
    console.log('FAIL  cannot read ' + file + ': ' + e.code);
    return 1;
  }
  const n = countLines(text);
  if (n > LIMIT) {
    console.log('FAIL  ' + path.basename(file) + ' is ' + n + ' lines; limit ' + LIMIT +
      '. Move finished business to STATE-ARCHIVE.md.');
    return 1;
  }
  console.log('PASS  ' + path.basename(file) + ' is ' + n + ' lines (limit ' + LIMIT + ')');
  return 0;
}

if (process.argv[2]) process.exit(checkOne(process.argv[2]));

let failed = checkOne(path.join(__dirname, 'STATE.md'));

// The failing side, every run: this same script, run on files of known length.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'state-size-'));
const verdict = (file) => spawnSync(process.execPath, [__filename, file], { encoding: 'utf8' }).status;
const expect = (label, got, want) => {
  const ok = got === want;
  if (!ok) failed = 1;
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + ' (exit ' + got + ')');
};
const sized = (n) => {
  const f = path.join(dir, n + '.md');
  fs.writeFileSync(f, 'x\n'.repeat(n));
  return f;
};

// 150 and 151 are written out, not LIMIT and LIMIT + 1: raising LIMIT must fail this suite.
expect('a 150-line file is accepted', verdict(sized(150)), 0);
expect('a 151-line file is refused', verdict(sized(151)), 1);
expect('a missing file is refused', verdict(path.join(dir, 'absent.md')), 1);

fs.rmSync(dir, { recursive: true });
process.exit(failed);
