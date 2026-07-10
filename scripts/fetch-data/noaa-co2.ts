// Fetches real atmospheric CO2 series from NOAA's Global Monitoring Laboratory
// (Mauna Loa record) — no API key required, plain CSV over HTTPS. See CLAUDE.md's
// "Data Acquisition Model" for the rules this script must follow: no hardcoded
// values, fail loudly on a non-200 response or unexpected shape, drop missing
// readings by absence rather than filling them.
//
// Two files are read (both published by NOAA GML):
//   - co2_mm_mlo.csv      → monthly mean CO2 (environment, monthly)
//   - co2_annmean_mlo.csv → annual mean CO2  (environment, annual)
//
// Both are '#'-commented CSVs. Rather than hardcode the comment-line count
// (NOAA changes it), every line is parsed defensively: a data row must start
// with a 4-digit year, and the CO2 value must be a finite positive number
// (NOAA marks missing readings with negative values).

import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { DatasetFrequency, SeriesFile, SeriesPoint } from "../../src/data/types.ts";

const SCRIPT_PATH = "scripts/fetch-data/noaa-co2.ts";
const SOURCE_ORGANIZATION = "NOAA Global Monitoring Laboratory";
const USER_AGENT = "meaningless-charts-fetcher/0.1 (personal project; no contact URL yet)";

type Job = {
  datasetId: string;
  frequency: DatasetFrequency;
  url: string;
  unit: string;
  parse: (text: string) => SeriesPoint[];
};

// Monthly file columns: year, month, decimal date, average, deseasonalized,
// ndays, sdev, unc. We take the raw monthly "average" (index 3), in ppm.
function parseMonthly(text: string): SeriesPoint[] {
  const points: SeriesPoint[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const cols = line.split(",").map((c) => c.trim());
    const year = cols[0];
    const month = cols[1];
    if (!/^\d{4}$/.test(year) || !/^\d{1,2}$/.test(month)) continue; // skips any column-name header row
    const value = Number(cols[3]);
    if (!Number.isFinite(value) || value <= 0) continue; // negative = missing
    points.push({ date: `${year}-${month.padStart(2, "0")}-01`, value });
  }
  return points.sort((a, b) => a.date.localeCompare(b.date));
}

// Annual file columns: year, mean, unc. We take "mean" (index 1), in ppm.
function parseAnnual(text: string): SeriesPoint[] {
  const points: SeriesPoint[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const cols = line.split(",").map((c) => c.trim());
    const year = cols[0];
    if (!/^\d{4}$/.test(year)) continue;
    const value = Number(cols[1]);
    if (!Number.isFinite(value) || value <= 0) continue;
    points.push({ date: `${year}-01-01`, value });
  }
  return points.sort((a, b) => a.date.localeCompare(b.date));
}

const JOBS: Job[] = [
  {
    datasetId: "noaa-co2-mauna-loa-monthly",
    frequency: "monthly",
    url: "https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_mm_mlo.csv",
    unit: "ppm",
    parse: parseMonthly,
  },
  {
    datasetId: "noaa-co2-mauna-loa-annual",
    frequency: "annual",
    url: "https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_annmean_mlo.csv",
    unit: "ppm",
    parse: parseAnnual,
  },
];

function writeSeries(outDir: string, job: Job, points: SeriesPoint[]): void {
  const seriesFile: SeriesFile = {
    datasetId: job.datasetId,
    sourceOrganization: SOURCE_ORGANIZATION,
    sourceUrl: job.url,
    unit: job.unit,
    frequency: job.frequency,
    fetchedAt: new Date().toISOString(),
    fetchedBy: SCRIPT_PATH,
    provenance: "script",
    points,
  };
  const outPath = `${outDir}${job.datasetId}.json`;
  writeFileSync(outPath, JSON.stringify(seriesFile, null, 2) + "\n", "utf-8");
  console.log(`OK: ${job.datasetId} — ${points.length} points, ${points[0].date} to ${points[points.length - 1].date} — wrote ${outPath}`);
}

async function main(): Promise<void> {
  const outDir = fileURLToPath(new URL("../../src/data/series/", import.meta.url));
  mkdirSync(outDir, { recursive: true });

  let failures = 0;
  for (const job of JOBS) {
    try {
      const response = await fetch(job.url, { headers: { "User-Agent": USER_AGENT } });
      if (!response.ok) {
        throw new Error(`${job.datasetId}: NOAA GML returned ${response.status} ${response.statusText} for ${job.url}`);
      }
      const points = job.parse(await response.text());
      if (points.length === 0) {
        throw new Error(`${job.datasetId}: parsed zero valid points from ${job.url}. Refusing to write an empty series file.`);
      }
      writeSeries(outDir, job, points);
    } catch (err) {
      failures += 1;
      console.error(`FAIL: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (failures > 0) {
    console.error(`\n${failures} of ${JOBS.length} NOAA CO2 series failed to fetch.`);
    process.exit(1);
  }
  console.log(`\nAll ${JOBS.length} NOAA CO2 series fetched successfully.`);
}

main().catch((err) => {
  console.error(`FAIL: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
