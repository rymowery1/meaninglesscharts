// Fetches the real monthly mean total sunspot number from WDC-SILSO, Royal
// Observatory of Belgium — no API key required, plain semicolon-separated CSV
// over HTTPS. See CLAUDE.md's "Data Acquisition Model" for the rules this
// script must follow.
//
// File: SN_m_tot_V2.0.csv — no header row, semicolon-separated. Columns:
//   year ; month ; decimal year ; monthly mean SSN ; stddev ; n_obs ; flag
// The sunspot value is column index 3. SILSO marks a genuinely missing month
// with a negative value (-1); a real 0.0 (deep solar minimum) is valid data,
// so the filter keeps >= 0 and drops only negatives.

import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { SeriesFile, SeriesPoint } from "../../src/data/types.ts";

const SCRIPT_PATH = "scripts/fetch-data/silso-sunspots.ts";
const SOURCE_ORGANIZATION = "WDC-SILSO, Royal Observatory of Belgium";
const DATASET_ID = "silso-sunspots-monthly";
const DATA_URL = "https://www.sidc.be/SILSO/DATA/SN_m_tot_V2.0.csv";
const USER_AGENT = "meaningless-charts-fetcher/0.1 (personal project; no contact URL yet)";

function parse(text: string): SeriesPoint[] {
  const points: SeriesPoint[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const cols = line.split(";").map((c) => c.trim());
    const year = cols[0];
    const month = cols[1];
    if (!/^\d{4}$/.test(year) || !/^\d{1,2}$/.test(month)) continue;
    const value = Number(cols[3]);
    if (!Number.isFinite(value) || value < 0) continue; // -1 = missing; 0.0 is a real minimum
    points.push({ date: `${year}-${month.padStart(2, "0")}-01`, value });
  }
  return points.sort((a, b) => a.date.localeCompare(b.date));
}

async function main(): Promise<void> {
  const response = await fetch(DATA_URL, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) {
    throw new Error(`${DATASET_ID}: SILSO returned ${response.status} ${response.statusText} for ${DATA_URL}`);
  }
  const points = parse(await response.text());
  if (points.length === 0) {
    throw new Error(`${DATASET_ID}: parsed zero valid points from ${DATA_URL}. Refusing to write an empty series file.`);
  }

  const seriesFile: SeriesFile = {
    datasetId: DATASET_ID,
    sourceOrganization: SOURCE_ORGANIZATION,
    sourceUrl: DATA_URL,
    unit: "monthly mean total sunspot number (SILSO v2.0)",
    frequency: "monthly",
    fetchedAt: new Date().toISOString(),
    fetchedBy: SCRIPT_PATH,
    provenance: "script",
    points,
  };

  const outDir = fileURLToPath(new URL("../../src/data/series/", import.meta.url));
  mkdirSync(outDir, { recursive: true });
  const outPath = `${outDir}${DATASET_ID}.json`;
  writeFileSync(outPath, JSON.stringify(seriesFile, null, 2) + "\n", "utf-8");
  console.log(`OK: ${DATASET_ID} — ${points.length} points, ${points[0].date} to ${points[points.length - 1].date} — wrote ${outPath}`);
}

main().catch((err) => {
  console.error(`FAIL: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
