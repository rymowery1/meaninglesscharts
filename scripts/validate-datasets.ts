// Validates src/data/datasets.json against the real launch-readiness rules
// in src/utils/validation.ts (build plan §11). A dataset that isn't
// launchReady is allowed to be incomplete; a dataset that claims to be
// launchReady must be fully real.

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { DatasetMeta, SeriesFile } from "../src/data/types.ts";
import { validateAllDatasets } from "../src/utils/validation.ts";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const datasetsPath = `${rootDir}src/data/datasets.json`;

const datasets = JSON.parse(readFileSync(datasetsPath, "utf-8")) as DatasetMeta[];
if (!Array.isArray(datasets)) {
  console.error(`FAIL: ${datasetsPath} must contain a JSON array.`);
  process.exit(1);
}

const seriesByDatasetId = new Map<string, SeriesFile>();
for (const dataset of datasets) {
  if (dataset.seriesPath === "NEEDS_SOURCE") continue;
  const seriesFilePath = `${rootDir}${dataset.seriesPath}`;
  if (!existsSync(seriesFilePath)) continue;
  const seriesFile = JSON.parse(readFileSync(seriesFilePath, "utf-8")) as SeriesFile;
  seriesByDatasetId.set(dataset.id, seriesFile);
}

const { valid, results } = validateAllDatasets(datasets, seriesByDatasetId);

const stale180Days = 180 * 24 * 60 * 60 * 1000;
const now = Date.now();
const staleWarnings: string[] = [];
for (const dataset of datasets) {
  if (dataset.fetchedAt === "NEEDS_SOURCE") continue;
  const fetchedAt = new Date(dataset.fetchedAt).getTime();
  if (Number.isFinite(fetchedAt) && now - fetchedAt > stale180Days) {
    staleWarnings.push(`${dataset.id}: fetched ${dataset.fetchedAt}, more than 180 days ago`);
  }
}

let launchReadyCount = 0;
let errorCount = 0;
for (const { id, result } of results) {
  const dataset = datasets.find((d) => d.id === id)!;
  if (dataset.launchReady) launchReadyCount++;
  if (!result.valid) {
    errorCount += result.errors.length;
    console.error(`FAIL: ${id}`);
    for (const error of result.errors) {
      console.error(`  - ${error}`);
    }
  }
}

console.log(
  `\n${datasets.length} dataset(s): ${launchReadyCount} launchReady, ${datasets.length - launchReadyCount} not yet.`,
);
if (staleWarnings.length > 0) {
  console.warn(`\n${staleWarnings.length} stale dataset(s) (fetched >180 days ago):`);
  for (const warning of staleWarnings) console.warn(`  - ${warning}`);
}

if (!valid) {
  console.error(`\nFAIL: ${errorCount} validation error(s) across launch-ready datasets.`);
  process.exit(1);
}

console.log("\nOK: all launch-ready datasets pass validation.");
