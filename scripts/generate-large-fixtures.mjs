import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve('src/__fixtures__');

function pad(target, secrets) {
  const header = '// AirGap Scanner large-input fixture (synthetic)\n';
  let body =
    header + secrets.map((s, i) => `const secret_${i} = "${s}";\n`).join('');
  const filler = '// filler line for size padding — not a secret\n';
  while (body.length < target) body += filler;
  return body.slice(0, target).padEnd(target, 'x').slice(0, target);
}

// Assemble with join so source never holds one contiguous secret-shaped literal.
const aws = ['AKIA', 'IOSFODNN7', 'NOTREAL'].join('');
const st = ['sk_test_', 'EXAMPLEKEYNOTREAL000000'].join('');
const aws2 = ['AKIA', 'EXAMPLEKEY00', 'NOTREAL'].join('');
const st2 = ['sk_test_', 'EXAMPLEKEYNOTREAL000001'].join('');
const st3 = ['sk_test_', 'EXAMPLEKEYNOTREAL000002'].join('');
const aws3 = ['AKIA', 'TESTONLY00', 'NOTREAL'].join('');
const st4 = ['sk_test_', 'EXAMPLEKEYNOTREAL000003'].join('');
const st5 = ['sk_test_', 'EXAMPLEKEYNOTREAL000004'].join('');

const secrets3 = [aws, st, aws2];
const secrets5 = [...secrets3, st2, st3];
const secrets8 = [...secrets5, aws3, st4, st5];

function write(name, n, secs) {
  const s = pad(n, secs);
  fs.writeFileSync(path.join(dir, name), s);
  console.log(name, s.length);
}

write('sample-10k.txt', 10_000, secrets3);
write('sample-50k.txt', 50_000, secrets5);
write('sample-100k.txt', 100_000, secrets8);
