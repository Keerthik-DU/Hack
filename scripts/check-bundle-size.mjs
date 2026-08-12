import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const root = process.cwd();
const budget = JSON.parse(fs.readFileSync(path.join(root, '.bundle-budget.json'), 'utf8'));
const dist = path.join(root, 'dist');

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const files = walk(dist);
let total = 0;
const perFile = [];
for (const file of files) {
  const buf = fs.readFileSync(file);
  const gz = zlib.gzipSync(buf).length;
  total += gz;
  perFile.push({ file: path.relative(root, file), gzipBytes: gz });
}

const totalKb = total / 1024;
const report = {
  totalGzippedBytes: total,
  totalGzippedKb: Number(totalKb.toFixed(2)),
  budgetKb: budget.totalGzippedKbMax,
  withinBudget: totalKb <= budget.totalGzippedKbMax,
  deltaVsBaselineKb:
    budget.baselineTotalGzippedKb > 0
      ? Number((totalKb - budget.baselineTotalGzippedKb).toFixed(2))
      : null,
  files: perFile,
};

const outDir = path.join(root, 'reports');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'bundle-size.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.withinBudget) {
  console.error(
    `Bundle budget exceeded: ${report.totalGzippedKb} KB > ${budget.totalGzippedKbMax} KB`
  );
  process.exit(1);
}
