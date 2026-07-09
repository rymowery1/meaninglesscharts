// Validates src/data/pairings.json: every entry must actually pass
// checkPairing() against the real datasets.json metadata and real series
// files — see docs/data/pairing-rules.md.

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { DatasetMeta, SeriesFile } from "../src/data/types.ts";
import { checkPairing, type ValidPairing } from "../src/utils/pairings.ts";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const datasetsPath = `${rootDir}src/data/datasets.json`;
const pairingsPath = `${rootDir}src/data/pairings.json`;

const datasets = JSON.parse(readFileSync(datasetsPath, "utf-8")) as DatasetMeta[];
const pairings = JSON.parse(readFileSync(pairingsPath, "utf-8")) as ValidPairing[];

if (!Array.isArray(pairings)) {
  console.error(`FAIL: ${pairingsPath} must contain a JSON array.`);
  process.exit(1);
}

const datasetById = new Map(datasets.map((d) => [d.id, d]));
const seriesByDatasetId = new Map<string, SeriesFile>();
for (const dataset of datasets) {
  if (dataset.seriesPath === "NEEDS_SOURCE") continue;
  const seriesFilePath = `${rootDir}${dataset.seriesPath}`;
  if (!existsSync(seriesFilePath)) continue;
  seriesByDatasetId.set(dataset.id, JSON.parse(readFileSync(seriesFilePath, "utf-8")) as SeriesFile);
}

let failures = 0;
for (const pairing of pairings) {
  const a = datasetById.get(pairing.datasetAId);
  const b = datasetById.get(pairing.datasetBId);
  if (!a || !b) {
    console.error(`FAIL: pairing references unknown dataset id(s): ${pairing.datasetAId} / ${pairing.datasetBId}`);
    failures++;
    continue;
  }
  const seriesA = seriesByDatasetId.get(a.id);
  const seriesB = seriesByDatasetId.get(b.id);
  if (!seriesA || !seriesB) {
    console.error(`FAIL: ${a.id} + ${b.id}: missing series file`);
    failures++;
    continue;
  }
  const result = checkPairing(a, b, seriesA, seriesB);
  if (!result.valid) {
    console.error(`FAIL: ${a.id} + ${b.id}: ${result.reasons.join(", ")}`);
    failures++;
  }
}

if (failures > 0) {
  console.error(`\nFAIL: ${failures} of ${pairings.length} pairing(s) in pairings.json are invalid.`);
  process.exit(1);
}

console.log(`OK: ${pairings.length} pairing(s) in pairings.json, all valid.`);
