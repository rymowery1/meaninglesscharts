// Fetches a real monthly earthquake-count series from the USGS FDSN Event
// Web Service (https://earthquake.usgs.gov/fdsnws/event/1/) — no API key
// required. See CLAUDE.md's "Data Acquisition Model" for the rules this
// script must follow.
//
// USGS doesn't publish a ready-made "monthly count" series — it publishes a
// raw event catalog. Counting events per calendar month from that catalog is
// how a monthly earthquake-frequency series is constructed at all; it isn't
// resampling an existing monthly/daily series into a different frequency
// (the thing docs/data/pairing-rules.md forbids). There's no other native
// frequency to preserve here. Documented as a deliberate call in
// docs/source-of-truth/decision-log.md.
//
// Magnitude threshold is M5.5+ (raised from an earlier M4.5+ idea) so a
// single request stays under USGS's 20,000-result cap without pagination —
// confirmed via the API's own /count endpoint before writing this script.

import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { SeriesFile, SeriesPoint } from "../../src/data/types.ts";

const SCRIPT_PATH = "scripts/fetch-data/usgs.ts";
const SOURCE_ORGANIZATION = "U.S. Geological Survey";
const DATASET_ID = "usgs-quakes-m5-5-monthly-count";
const MIN_MAGNITUDE = 5.5;
const START_DATE = "2000-01-01";
const RESULT_CAP = 20000;
const SAFE_RESULT_LIMIT = 19500; // refuse rather than silently truncate near the API's hard cap

type UsgsFeature = {
  properties: {
    time: number; // epoch milliseconds
    mag: number | null;
  };
};

type UsgsResponse = {
  features: UsgsFeature[];
};

function endDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildUrl(): string {
  return `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${START_DATE}&endtime=${endDate()}&minmagnitude=${MIN_MAGNITUDE}&orderby=time`;
}

async function main(): Promise<void> {
  const url = buildUrl();
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`USGS API returned ${response.status} ${response.statusText} for ${url}`);
  }

  const body = (await response.json()) as UsgsResponse;
  if (!Array.isArray(body.features)) {
    throw new Error(`USGS API response is missing a features array for ${url}`);
  }

  if (body.features.length >= SAFE_RESULT_LIMIT) {
    throw new Error(
      `USGS API returned ${body.features.length} events, within ${RESULT_CAP - body.features.length} of the ${RESULT_CAP}-result cap — results may be truncated. Narrow the date range or raise MIN_MAGNITUDE instead of trusting this response.`,
    );
  }

  const monthlyCounts = new Map<string, number>();
  for (const feature of body.features) {
    const mag = feature.properties.mag;
    if (mag === null || !Number.isFinite(mag)) {
      throw new Error(`USGS API returned an event with a null/invalid magnitude — refusing to silently drop it.`);
    }
    const isoDate = new Date(feature.properties.time).toISOString();
    const monthKey = isoDate.slice(0, 7); // "YYYY-MM"
    monthlyCounts.set(monthKey, (monthlyCounts.get(monthKey) ?? 0) + 1);
  }

  // Drop the current, still-in-progress month — it isn't comparable to a
  // completed month and its count would trend down as the series is refreshed
  // through the month, which is exactly the kind of clean-looking-but-wrong
  // artifact this project's methodology rules forbid.
  const currentMonthKey = endDate().slice(0, 7);
  monthlyCounts.delete(currentMonthKey);

  const points: SeriesPoint[] = Array.from(monthlyCounts.entries())
    .map(([monthKey, count]) => ({ date: `${monthKey}-01`, value: count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (points.length === 0) {
    throw new Error(`USGS API returned zero monthly points for ${url}. Refusing to write an empty series file.`);
  }

  const seriesFile: SeriesFile = {
    datasetId: DATASET_ID,
    sourceOrganization: SOURCE_ORGANIZATION,
    sourceUrl: url,
    unit: `count of M${MIN_MAGNITUDE}+ earthquakes`,
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

  const firstDate = points[0].date;
  const lastDate = points[points.length - 1].date;
  console.log(
    `OK: ${DATASET_ID} — ${points.length} points, ${firstDate} to ${lastDate}, ${body.features.length} raw events — wrote ${outPath}`,
  );
}

main().catch((err) => {
  console.error(`FAIL: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
