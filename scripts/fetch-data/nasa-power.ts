// Fetches a real annual temperature series from the NASA POWER API
// (https://power.larc.nasa.gov/) — no API key required. See CLAUDE.md's
// "Data Acquisition Model" for the rules this script must follow.
//
// NASA POWER's temporal/monthly/point endpoint returns keys "YYYY01".."YYYY12"
// for each month plus a "YYYY13" key that is NASA POWER's own annual average
// for that year — confirmed live against the API before writing this script.
// Only the "13" keys are used here, so this is the source's native annual
// statistic, not a resampling/aggregation computed by this script (which the
// pairing rules forbid in the MVP).
//
// Geography: a single point (Washington, D.C.), not a global average — NASA
// POWER's point API doesn't offer a whole-globe aggregate the way the World
// Bank's "WLD" code does. This is a single-location sample and must be
// disclosed as such in the source panel, not presented as "global weather."

import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { SeriesFile, SeriesPoint } from "../../src/data/types.ts";

const SCRIPT_PATH = "scripts/fetch-data/nasa-power.ts";
const SOURCE_ORGANIZATION = "NASA POWER";
const ANNUAL_DATASET_ID = "nasa-power-temp-annual";
const MONTHLY_DATASET_ID = "nasa-power-temp-monthly";
const PARAMETER = "T2M"; // Temperature at 2 Meters, °C
const LATITUDE = 38.9072; // Washington, D.C., USA
const LONGITUDE = -77.0369;
const START_YEAR = 1981; // satellite/model era start, per background knowledge — confirmed by what the API actually returns below

type PowerMonthlyResponse = {
  properties?: {
    parameter?: {
      [param: string]: Record<string, number>;
    };
  };
  parameters?: {
    [param: string]: { units: string; longname: string };
  };
  header?: {
    fill_value?: number;
    title?: string;
  };
  messages?: string[];
};

function buildUrl(endYear: number): string {
  return `https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=${PARAMETER}&community=RE&longitude=${LONGITUDE}&latitude=${LATITUDE}&start=${START_YEAR}&end=${endYear}&format=JSON`;
}

async function fetchMonthly(endYear: number): Promise<{ ok: boolean; status: number; body: PowerMonthlyResponse }> {
  const url = buildUrl(endYear);
  const response = await fetch(url);
  // NASA POWER returns structured error messages in the JSON body even on a
  // non-2xx status (e.g. 422 for an out-of-range date), so parse it before
  // deciding whether this is recoverable, instead of throwing on status alone.
  const body = (await response.json()) as PowerMonthlyResponse;
  return { ok: response.ok, status: response.status, body };
}

async function main(): Promise<void> {
  let endYear = new Date().getUTCFullYear();
  let result = await fetchMonthly(endYear);

  // The API's published data lags the current year — if it tells us the
  // exact date it's available through, retry once at that year rather than
  // hardcoding a cutoff that would go stale. Any other error still fails loudly.
  const outOfRangeMessage = result.body.messages?.find((m) => /available to (\d{4})/.test(m));
  if (!result.ok && outOfRangeMessage) {
    const match = outOfRangeMessage.match(/available to (\d{4})/);
    const availableThroughYear = match ? Number(match[1]) : null;
    if (!availableThroughYear || availableThroughYear >= endYear) {
      throw new Error(`NASA POWER API returned messages/errors: ${result.body.messages!.join("; ")}`);
    }
    endYear = availableThroughYear;
    result = await fetchMonthly(endYear);
  }

  if (!result.ok) {
    throw new Error(
      `NASA POWER API returned status ${result.status} for ${buildUrl(endYear)}: ${result.body.messages?.join("; ") ?? "no message body"}`,
    );
  }

  const body = result.body;
  if (body.messages && body.messages.length > 0) {
    throw new Error(`NASA POWER API returned messages/errors: ${body.messages.join("; ")}`);
  }

  const series = body.properties?.parameter?.[PARAMETER];
  if (!series) {
    throw new Error(`NASA POWER API response is missing properties.parameter.${PARAMETER} for ${buildUrl(endYear)}`);
  }

  const fillValue = body.header?.fill_value;
  const unit = body.parameters?.[PARAMETER]?.units;
  if (!unit) {
    throw new Error(`NASA POWER API response is missing the unit for ${PARAMETER}`);
  }

  // NASA POWER returns the unit as "C"; read from the response rather than
  // hardcoding, so a future API change can't silently mislabel the series.
  const displayUnit = unit === "C" ? "°C" : unit;
  const outDir = fileURLToPath(new URL("../../src/data/series/", import.meta.url));
  mkdirSync(outDir, { recursive: true });

  const annualPoints: SeriesPoint[] = Object.entries(series)
    .filter(([key]) => key.endsWith("13")) // native annual average key, not a computed aggregate
    .map(([key, value]) => ({ year: key.slice(0, 4), value }))
    .filter(({ value }) => value !== fillValue && Number.isFinite(value))
    .map(({ year, value }) => ({ date: `${year}-01-01`, value }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (annualPoints.length === 0) {
    throw new Error(`NASA POWER API returned zero valid annual points for ${buildUrl(endYear)}. Refusing to write an empty series file.`);
  }

  writeSeries(outDir, ANNUAL_DATASET_ID, "annual", displayUnit, buildUrl(endYear), annualPoints);

  // Native monthly keys ("YYYY01".."YYYY12"), not the "13" annual average —
  // this is the API's own monthly granularity, not a resampling computed by
  // this script.
  const monthlyPoints: SeriesPoint[] = Object.entries(series)
    .filter(([key]) => !key.endsWith("13"))
    .map(([key, value]) => ({ year: key.slice(0, 4), month: key.slice(4, 6), value }))
    .filter(({ value }) => value !== fillValue && Number.isFinite(value))
    .map(({ year, month, value }) => ({ date: `${year}-${month}-01`, value }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (monthlyPoints.length === 0) {
    throw new Error(`NASA POWER API returned zero valid monthly points for ${buildUrl(endYear)}. Refusing to write an empty series file.`);
  }

  writeSeries(outDir, MONTHLY_DATASET_ID, "monthly", displayUnit, buildUrl(endYear), monthlyPoints);
}

function writeSeries(
  outDir: string,
  datasetId: string,
  frequency: "annual" | "monthly",
  unit: string,
  sourceUrl: string,
  points: SeriesPoint[],
): void {
  const seriesFile: SeriesFile = {
    datasetId,
    sourceOrganization: SOURCE_ORGANIZATION,
    sourceUrl,
    unit,
    frequency,
    fetchedAt: new Date().toISOString(),
    fetchedBy: SCRIPT_PATH,
    provenance: "script",
    points,
  };
  const outPath = `${outDir}${datasetId}.json`;
  writeFileSync(outPath, JSON.stringify(seriesFile, null, 2) + "\n", "utf-8");
  const firstDate = points[0].date;
  const lastDate = points[points.length - 1].date;
  console.log(`OK: ${datasetId} — ${points.length} points, ${firstDate} to ${lastDate} — wrote ${outPath}`);
}

main().catch((err) => {
  console.error(`FAIL: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
