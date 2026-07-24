// Scratch analysis: score every candidate pairing by shared-window length and
// how strongly the two normalized lines visually track together (Pearson r).
// Used to pick which pairings are worth writing chart copy for. Read-only.
import { loadDatasets, loadSeriesByDatasetId, loadPairings } from "../src/utils/chart-data";
import { getSharedWindow, normalizeToIndex100 } from "../src/utils/normalize";

const root = "./";
const datasets = loadDatasets(root);
const byId = new Map(datasets.map((d) => [d.id, d]));
const series = loadSeriesByDatasetId(root);
const pairings = loadPairings(root);

function pearson(a: number[], b: number[]): number {
  const n = a.length;
  const ma = a.reduce((s, x) => s + x, 0) / n;
  const mb = b.reduce((s, x) => s + x, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  const den = Math.sqrt(da * db);
  return den === 0 ? 0 : num / den;
}

const funny = new Set([
  "wikimedia-pageviews-nicolas-cage-monthly",
  "wikimedia-pageviews-loch-ness-monster-monthly",
  "wikimedia-pageviews-area-51-monthly",
  "wikimedia-pageviews-godzilla-monthly",
  "wikimedia-pageviews-bermuda-triangle-monthly",
  "wikimedia-pageviews-ouija-monthly",
  "wikimedia-pageviews-time-travel-monthly",
  "silso-sunspots-monthly",
  "ngrams-word-moist-annual",
  "ngrams-word-awesome-annual",
  "ngrams-word-groovy-annual",
  "ngrams-word-email-annual",
  "ngrams-word-dude-annual",
  "ngrams-word-apocalypse-annual",
  "ngrams-word-spaghetti-annual",
  "ngrams-word-existential-annual",
]);

type Row = { a: string; b: string; n: number; r: number; funny: boolean };
const rows: Row[] = [];

for (const { datasetAId, datasetBId } of pairings) {
  const sa = series.get(datasetAId);
  const sb = series.get(datasetBId);
  if (!sa || !sb) continue;
  const shared = getSharedWindow(sa.points, sb.points);
  if (shared.dates.length < 8) continue;
  const ai = normalizeToIndex100(shared.aValues);
  const bi = normalizeToIndex100(shared.bValues);
  const r = pearson(ai, bi);
  rows.push({
    a: datasetAId,
    b: datasetBId,
    n: shared.dates.length,
    r,
    funny: funny.has(datasetAId) || funny.has(datasetBId),
  });
}

const mode = process.argv[2] ?? "funny";
let filtered = rows;
if (mode === "funny") filtered = rows.filter((x) => x.funny);

// sort by absolute correlation (strong visual coincidence = funnier chart)
filtered.sort((x, y) => Math.abs(y.r) - Math.abs(x.r));

console.log(`\n${filtered.length} candidate pairings (mode=${mode}), top 40 by |r|:\n`);
for (const row of filtered.slice(0, 40)) {
  const dir = row.r >= 0 ? "same" : "opp ";
  console.log(
    `r=${row.r.toFixed(2)} ${dir} n=${String(row.n).padStart(3)}  ${row.a}  ×  ${row.b}`,
  );
}
