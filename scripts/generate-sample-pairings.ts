// Runs findValidPairings() against the real src/data/datasets.json and
// src/data/series/ files and writes the result to src/data/pairings.json.
// This only reports pairings that are actually launchReady + approved — it
// does not lower the bar to produce a demo. If nothing qualifies yet, the
// output is an empty array, which is the correct and expected result until
// the remaining license/methodology verification is done.

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { DatasetMeta, SeriesFile } from "../src/data/types.ts";
import { checkPairing, findValidPairings } from "../src/utils/pairings.ts";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const datasetsPath = `${rootDir}src/data/datasets.json`;
const pairingsPath = `${rootDir}src/data/pairings.json`;
const seriesDir = `${rootDir}src/data/series/`;

const datasets = JSON.parse(readFileSync(datasetsPath, "utf-8")) as DatasetMeta[];

const seriesByDatasetId = new Map<string, SeriesFile>();
for (const file of readdirSync(seriesDir).filter((f) => f.endsWith(".json"))) {
  const series = JSON.parse(readFileSync(`${seriesDir}${file}`, "utf-8")) as SeriesFile;
  seriesByDatasetId.set(series.datasetId, series);
}

const validPairings = findValidPairings(datasets, seriesByDatasetId);

writeFileSync(pairingsPath, JSON.stringify(validPairings, null, 2) + "\n", "utf-8");
console.log(`Wrote ${validPairings.length} launch-ready pairing(s) to ${pairingsPath}`);

// Also report pairings that would be structurally valid (real data checks
// out — domains, org, frequency, overlap, normalization eligibility) but
// are blocked purely by launchReady/verificationStatus gating, so it's
// visible what's one license confirmation away from shipping.
let structurallyReadyButGated = 0;
for (let i = 0; i < datasets.length; i++) {
  for (let j = i + 1; j < datasets.length; j++) {
    const a = datasets[i];
    const b = datasets[j];
    const seriesA = seriesByDatasetId.get(a.id);
    const seriesB = seriesByDatasetId.get(b.id);
    if (!seriesA || !seriesB) continue;

    const hypotheticallyApproved = checkPairing(
      { ...a, launchReady: true, verificationStatus: "approved" },
      { ...b, launchReady: true, verificationStatus: "approved" },
      seriesA,
      seriesB,
    );
    const actual = checkPairing(a, b, seriesA, seriesB);
    if (hypotheticallyApproved.valid && !actual.valid) {
      structurallyReadyButGated++;
      console.log(
        `  structurally ready, gated on launch status only: ${a.id} + ${b.id}`,
      );
    }
  }
}
if (structurallyReadyButGated > 0) {
  console.log(
    `\n${structurallyReadyButGated} pairing(s) would qualify as soon as launchReady/verificationStatus are set — see docs/data/dataset-reality-sheet.md for what's still missing (licenseOrReuseNotes).`,
  );
}
