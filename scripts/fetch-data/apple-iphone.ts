// Converts a user-compiled CSV of annual iPhone unit sales into a series file.
// This is a MANUAL-DOWNLOAD source (provenance: "manual-download"), not a live
// fetch: Apple has no free units API and stopped reporting iPhone unit sales
// after fiscal year 2018. The numbers must be compiled BY THE USER from Apple's
// own 10-K filings on SEC EDGAR — per CLAUDE.md's "Data Acquisition Model",
// Claude never types dataset values, so this script only reads and validates
// the user's file; it never contains any numbers itself.
//
// Input (create from data-import/apple-iphone-units.template.csv):
//   data-import/apple-iphone-units.csv
//   columns: fiscalYear,unitsMillions,source10kUrl
// Every row must cite the 10-K URL it came from, so the series stays auditable.
//
// Apple's fiscal year ends in late September, so "FY2015" is not calendar 2015;
// this is disclosed in the dataset's methodologyNotes. The annual date is
// written as <fiscalYear>-01-01 only to satisfy the annual date format.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { SeriesFile, SeriesPoint } from "../../src/data/types.ts";

const SCRIPT_PATH = "scripts/fetch-data/apple-iphone.ts";
const SOURCE_ORGANIZATION = "Apple Inc. (Form 10-K, SEC EDGAR)";
const DATASET_ID = "apple-iphone-units-annual";
const INPUT_REL = "data-import/apple-iphone-units.csv";

function main(): void {
  const rootDir = fileURLToPath(new URL("../../", import.meta.url));
  const inputPath = `${rootDir}${INPUT_REL}`;

  if (!existsSync(inputPath)) {
    throw new Error(
      `${DATASET_ID}: input file not found at ${INPUT_REL}. Copy data-import/apple-iphone-units.template.csv to ${INPUT_REL} and fill it in from Apple's 10-K filings (see data-import/README.md).`,
    );
  }

  const text = readFileSync(inputPath, "utf-8");
  const points: SeriesPoint[] = [];
  let lineNo = 0;
  for (const raw of text.split("\n")) {
    lineNo++;
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const cols = line.split(",").map((c) => c.trim());
    // skip the header row
    if (cols[0].toLowerCase() === "fiscalyear") continue;

    const [fiscalYear, unitsStr, source10kUrl] = cols;
    if (!/^\d{4}$/.test(fiscalYear ?? "")) {
      throw new Error(`${DATASET_ID}: line ${lineNo}: first column must be a 4-digit fiscal year, got "${fiscalYear}"`);
    }
    const units = Number(unitsStr);
    if (!Number.isFinite(units) || units <= 0) {
      throw new Error(`${DATASET_ID}: line ${lineNo} (FY${fiscalYear}): unitsMillions must be a positive number, got "${unitsStr}"`);
    }
    if (!source10kUrl || !/^https?:\/\//.test(source10kUrl)) {
      throw new Error(
        `${DATASET_ID}: line ${lineNo} (FY${fiscalYear}): every row must cite its 10-K source URL (column 3) so the value is auditable, got "${source10kUrl ?? ""}"`,
      );
    }
    points.push({ date: `${fiscalYear}-01-01`, value: units });
  }

  points.sort((a, b) => a.date.localeCompare(b.date));
  if (points.length === 0) {
    throw new Error(`${DATASET_ID}: no data rows found in ${INPUT_REL}. Fill in the template before running this converter.`);
  }

  const seriesFile: SeriesFile = {
    datasetId: DATASET_ID,
    sourceOrganization: SOURCE_ORGANIZATION,
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0000320193&type=10-K",
    unit: "units sold (millions)",
    frequency: "annual",
    fetchedAt: new Date().toISOString(),
    fetchedBy: SCRIPT_PATH,
    provenance: "manual-download",
    points,
  };

  const outDir = fileURLToPath(new URL("../../src/data/series/", import.meta.url));
  mkdirSync(outDir, { recursive: true });
  const outPath = `${outDir}${DATASET_ID}.json`;
  writeFileSync(outPath, JSON.stringify(seriesFile, null, 2) + "\n", "utf-8");
  console.log(`OK: ${DATASET_ID} — ${points.length} points, ${points[0].date} to ${points[points.length - 1].date} — wrote ${outPath}`);
  console.log(`   Remember to log the source (SEC EDGAR / 10-K URLs) + date in docs/data/source-verification-log.md.`);
}

try {
  main();
} catch (err) {
  console.error(`FAIL: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
