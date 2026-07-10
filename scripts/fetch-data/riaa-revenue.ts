// Converts the RIAA U.S. Sales Database CSV (user-downloaded) into per-format
// annual revenue series. MANUAL-DOWNLOAD source (provenance: "manual-download"):
// the user downloads the CSV from https://www.riaa.com/u-s-sales-database/ into
// data-import/riaa-us-sales.csv; this script only reads/validates it and never
// contains any numbers itself (CLAUDE.md "Data Acquisition Model").
//
// The RIAA file's exact column names aren't guaranteed, so the parser detects
// the format / year / value columns by name and FAILS LOUDLY — printing the
// actual header row and the distinct format labels it found — if anything
// doesn't line up. That makes it a one-line fix to adapt FORMAT_GROUPS /
// column matchers to the real file rather than silently writing garbage.
//
// License note: RIAA reuse terms are unconfirmed (the site directs data-use
// questions to research@riaa.com). These datasets are written but must stay
// launchReady:false until the license is verified — see docs/data/approved-sources.md.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { SeriesFile, SeriesPoint } from "../../src/data/types.ts";

const SCRIPT_PATH = "scripts/fetch-data/riaa-revenue.ts";
const SOURCE_ORGANIZATION = "Recording Industry Association of America (RIAA), U.S. Sales Database";
const SOURCE_URL = "https://www.riaa.com/u-s-sales-database/";
const INPUT_REL = "data-import/riaa-us-sales.csv";

// Preferred revenue metric, most-preferred first. RIAA publishes both nominal
// ("actual") and inflation-adjusted dollars; the first metric present is used.
const METRIC_PREFERENCE = [
  "value (inflation adjusted)",
  "value (adjusted)",
  "value (actual)",
  "value",
];

// datasetId -> the RIAA "Format" labels to include (summed per year). These are
// best-guess labels; if a group matches zero rows the script fails and lists the
// real labels so this map can be corrected. All values are summed within a group.
type FormatGroup = { datasetId: string; label: string; riaaFormats: string[] };
const FORMAT_GROUPS: FormatGroup[] = [
  { datasetId: "riaa-vinyl-revenue-annual", label: "Vinyl", riaaFormats: ["LP/EP", "Vinyl Single"] },
  { datasetId: "riaa-cassette-revenue-annual", label: "Cassette", riaaFormats: ["Cassette", "Cassette Single"] },
  { datasetId: "riaa-cd-revenue-annual", label: "CD", riaaFormats: ["CD", "CD Single"] },
  { datasetId: "riaa-download-revenue-annual", label: "Download", riaaFormats: ["Download Single", "Download Album", "Ringtones & Ringbacks"] },
  { datasetId: "riaa-streaming-revenue-annual", label: "Streaming", riaaFormats: ["Paid Subscription", "On-Demand Streaming (Ad-Supported)", "SoundExchange Distributions", "Other Ad-Supported Streaming", "Limited Tier Paid Subscription"] },
];

// Minimal CSV line parser handling double-quoted fields (RIAA values can be
// quoted with thousands separators, e.g. "1,234,500,000").
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else { inQuotes = false; }
      } else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

function findColumn(header: string[], test: (h: string) => boolean, what: string): number {
  const idx = header.findIndex((h) => test(h.toLowerCase()));
  if (idx === -1) {
    throw new Error(`RIAA: could not find the ${what} column. Actual header: [${header.join(" | ")}]`);
  }
  return idx;
}

function toNumber(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, "");
  if (cleaned === "" || cleaned === "-") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function main(): void {
  const rootDir = fileURLToPath(new URL("../../", import.meta.url));
  const inputPath = `${rootDir}${INPUT_REL}`;
  if (!existsSync(inputPath)) {
    throw new Error(`RIAA: input file not found at ${INPUT_REL}. Download the RIAA U.S. Sales Database CSV into that path (see data-import/README.md).`);
  }

  const lines = readFileSync(inputPath, "utf-8").split("\n").filter((l) => l.trim() && !l.trim().startsWith("#"));
  if (lines.length < 2) throw new Error(`RIAA: ${INPUT_REL} has no data rows.`);

  const header = parseCsvLine(lines[0]);
  const formatIdx = findColumn(header, (h) => h.includes("format"), "format");
  const yearIdx = findColumn(header, (h) => h.includes("year"), "year");
  const metricIdx = header.findIndex((h) => h.toLowerCase().includes("metric"));

  const rows = lines.slice(1).map(parseCsvLine);

  // Choose the value column + metric filter.
  let valueIdx: number;
  let metricUsed = "(none)";
  let valueHeaderLabel: string;
  if (metricIdx !== -1) {
    // Long format: one "value" column, filtered by the Metric column.
    valueIdx = findColumn(header, (h) => h.includes("value") || h.includes("revenue"), "value/revenue");
    const metricsPresent = new Set(rows.map((r) => (r[metricIdx] ?? "").toLowerCase()));
    const chosen = METRIC_PREFERENCE.find((m) => metricsPresent.has(m));
    if (!chosen) {
      throw new Error(`RIAA: none of the preferred metrics ${JSON.stringify(METRIC_PREFERENCE)} were found. Metrics present: [${[...metricsPresent].join(" | ")}]`);
    }
    metricUsed = chosen;
    valueHeaderLabel = `${header[valueIdx]} (${chosen})`;
  } else {
    // Wide format without a metric column: prefer an inflation-adjusted value header.
    const adjusted = header.findIndex((h) => /value|revenue/.test(h.toLowerCase()) && /adjust/.test(h.toLowerCase()));
    valueIdx = adjusted !== -1 ? adjusted : findColumn(header, (h) => h.includes("value") || h.includes("revenue"), "value/revenue");
    valueHeaderLabel = header[valueIdx];
  }

  const distinctFormats = new Set(rows.map((r) => r[formatIdx]).filter(Boolean));
  const outDir = fileURLToPath(new URL("../../src/data/series/", import.meta.url));
  mkdirSync(outDir, { recursive: true });

  let written = 0;
  const problems: string[] = [];
  for (const group of FORMAT_GROUPS) {
    const wanted = new Set(group.riaaFormats.map((f) => f.toLowerCase()));
    const matched = [...distinctFormats].filter((f) => wanted.has(f.toLowerCase()));
    if (matched.length === 0) {
      problems.push(`  ${group.datasetId}: none of ${JSON.stringify(group.riaaFormats)} matched any RIAA format`);
      continue;
    }

    const byYear = new Map<string, number>();
    for (const r of rows) {
      if (!wanted.has((r[formatIdx] ?? "").toLowerCase())) continue;
      if (metricIdx !== -1 && (r[metricIdx] ?? "").toLowerCase() !== metricUsed) continue;
      const year = (r[yearIdx] ?? "").slice(0, 4);
      if (!/^\d{4}$/.test(year)) continue;
      const val = toNumber(r[valueIdx] ?? "");
      if (val === null) continue; // missing → absence, never zero-filled
      byYear.set(year, (byYear.get(year) ?? 0) + val);
    }

    const points: SeriesPoint[] = [...byYear.entries()]
      .map(([year, value]) => ({ date: `${year}-01-01`, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
    if (points.length === 0) {
      problems.push(`  ${group.datasetId}: matched formats [${matched.join(", ")}] but produced 0 points`);
      continue;
    }

    const seriesFile: SeriesFile = {
      datasetId: group.datasetId,
      sourceOrganization: SOURCE_ORGANIZATION,
      sourceUrl: SOURCE_URL,
      unit: `US$ — RIAA "${valueHeaderLabel}" (sum of: ${matched.join(", ")})`,
      frequency: "annual",
      fetchedAt: new Date().toISOString(),
      fetchedBy: SCRIPT_PATH,
      provenance: "manual-download",
      points,
    };
    writeFileSync(`${outDir}${group.datasetId}.json`, JSON.stringify(seriesFile, null, 2) + "\n", "utf-8");
    console.log(`OK: ${group.datasetId} — ${points.length} points, ${points[0].date} to ${points[points.length - 1].date}, formats: ${matched.join(", ")}`);
    written++;
  }

  if (problems.length > 0) {
    console.error(`\nSome format groups did not match. Distinct RIAA formats in the file:\n  [${[...distinctFormats].join(" | ")}]\nProblems:\n${problems.join("\n")}\nAdjust FORMAT_GROUPS in ${SCRIPT_PATH} to match these labels.`);
    if (written === 0) process.exit(1);
  }
  console.log(`\nWrote ${written} of ${FORMAT_GROUPS.length} RIAA format series. Log the download URL + date in docs/data/source-verification-log.md.`);
}

try {
  main();
} catch (err) {
  console.error(`FAIL: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
