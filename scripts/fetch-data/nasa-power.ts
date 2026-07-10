// Fetches real temperature/weather series from the NASA POWER API
// (https://power.larc.nasa.gov/) — no API key required. See CLAUDE.md's
// "Data Acquisition Model" for the rules this script must follow.
//
// NASA POWER's temporal/monthly/point endpoint returns keys "YYYY01".."YYYY12"
// for each requested parameter plus a "YYYY13" key that is NASA POWER's own
// annual average for that year — confirmed live against the API before writing
// this script. The "13" keys become the annual series and the "01".."12" keys
// become the monthly series, so both are the source's own native statistics,
// not a resampling/aggregation computed by this script (which the pairing
// rules forbid in the MVP).
//
// Geography: single points, never a global average — NASA POWER's point API
// doesn't offer a whole-globe aggregate the way the World Bank's "WLD" code
// does. Each series must be disclosed as a single-location sample in its
// source panel, not presented as "global weather."
//
// Two point requests are configured:
//   1. Washington, D.C. — 2m air temperature (T2M). Temperature crosses 0°C,
//      so these two series are normalization-ineligible (kept as catalog
//      content). This is the original NASA dataset, unchanged.
//   2. Area 51 (Groom Lake, NV) — wind speed (WS10M), relative humidity
//      (RH2M), and all-sky surface shortwave irradiance (ALLSKY_SFC_SW_DWN).
//      All three are strictly positive, so unlike temperature they ARE
//      normalization-eligible and can pair with non-weather-blocked domains
//      (e.g. World Bank economy / global-indicators annual series).
//
// Parameter codes and locations below configure *which* series to request;
// the actual data points come only from the live API response.

import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { DatasetFrequency, SeriesFile, SeriesPoint } from "../../src/data/types.ts";

const SCRIPT_PATH = "scripts/fetch-data/nasa-power.ts";
const SOURCE_ORGANIZATION = "NASA POWER";

type ParamConfig = {
  parameter: string; // NASA POWER parameter code
  annualDatasetId: string;
  monthlyDatasetId: string;
};

type PointRequest = {
  label: string;
  latitude: number;
  longitude: number;
  startYear: number;
  params: ParamConfig[];
};

const REQUESTS: PointRequest[] = [
  {
    label: "Washington, D.C.",
    latitude: 38.9072,
    longitude: -77.0369,
    startYear: 1981, // satellite/model era start — confirmed by what the API actually returns
    params: [
      {
        parameter: "T2M", // Temperature at 2 Meters, °C
        annualDatasetId: "nasa-power-temp-annual",
        monthlyDatasetId: "nasa-power-temp-monthly",
      },
    ],
  },
  {
    label: "Area 51 (Groom Lake, NV)",
    latitude: 37.2431,
    longitude: -115.793,
    startYear: 1981,
    params: [
      {
        parameter: "WS10M", // Wind Speed at 10 Meters, m/s
        annualDatasetId: "nasa-power-area51-windspeed-annual",
        monthlyDatasetId: "nasa-power-area51-windspeed-monthly",
      },
      {
        parameter: "RH2M", // Relative Humidity at 2 Meters, %
        annualDatasetId: "nasa-power-area51-humidity-annual",
        monthlyDatasetId: "nasa-power-area51-humidity-monthly",
      },
      {
        parameter: "ALLSKY_SFC_SW_DWN", // All-Sky Surface Shortwave Downward Irradiance, kWh/m^2/day
        annualDatasetId: "nasa-power-area51-solar-annual",
        monthlyDatasetId: "nasa-power-area51-solar-monthly",
      },
    ],
  },
];

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

function buildUrl(request: PointRequest, endYear: number): string {
  const params = request.params.map((p) => p.parameter).join(",");
  return `https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=${params}&community=RE&longitude=${request.longitude}&latitude=${request.latitude}&start=${request.startYear}&end=${endYear}&format=JSON`;
}

async function fetchMonthly(
  request: PointRequest,
  endYear: number,
): Promise<{ ok: boolean; status: number; body: PowerMonthlyResponse }> {
  const url = buildUrl(request, endYear);
  // NASA POWER returns structured error messages in the JSON body even on a
  // non-2xx status (e.g. 422 for an out-of-range date), so parse it before
  // deciding whether this is recoverable, instead of throwing on status alone.
  const response = await fetch(url);
  const body = (await response.json()) as PowerMonthlyResponse;
  return { ok: response.ok, status: response.status, body };
}

async function resolveResponse(request: PointRequest): Promise<{ body: PowerMonthlyResponse; url: string }> {
  let endYear = new Date().getUTCFullYear();
  let result = await fetchMonthly(request, endYear);

  // The API's published data lags the current year — if it tells us the
  // exact date it's available through, retry once at that year rather than
  // hardcoding a cutoff that would go stale. Any other error still fails loudly.
  const outOfRangeMessage = result.body.messages?.find((m) => /available to (\d{4})/.test(m));
  if (!result.ok && outOfRangeMessage) {
    const match = outOfRangeMessage.match(/available to (\d{4})/);
    const availableThroughYear = match ? Number(match[1]) : null;
    if (!availableThroughYear || availableThroughYear >= endYear) {
      throw new Error(`${request.label}: NASA POWER API returned messages/errors: ${result.body.messages!.join("; ")}`);
    }
    endYear = availableThroughYear;
    result = await fetchMonthly(request, endYear);
  }

  if (!result.ok) {
    throw new Error(
      `${request.label}: NASA POWER API returned status ${result.status} for ${buildUrl(request, endYear)}: ${result.body.messages?.join("; ") ?? "no message body"}`,
    );
  }
  if (result.body.messages && result.body.messages.length > 0) {
    throw new Error(`${request.label}: NASA POWER API returned messages/errors: ${result.body.messages.join("; ")}`);
  }

  return { body: result.body, url: buildUrl(request, endYear) };
}

function writeSeries(
  outDir: string,
  datasetId: string,
  frequency: DatasetFrequency,
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

function extractParam(
  outDir: string,
  request: PointRequest,
  param: ParamConfig,
  body: PowerMonthlyResponse,
  url: string,
): void {
  const series = body.properties?.parameter?.[param.parameter];
  if (!series) {
    throw new Error(`${param.parameter} @ ${request.label}: NASA POWER response is missing properties.parameter.${param.parameter} for ${url}`);
  }

  const fillValue = body.header?.fill_value;
  const unit = body.parameters?.[param.parameter]?.units;
  if (!unit) {
    throw new Error(`${param.parameter} @ ${request.label}: NASA POWER response is missing the unit for ${param.parameter}`);
  }
  // NASA POWER returns temperature's unit as "C"; read from the response
  // rather than hardcoding, so a future API change can't silently mislabel it.
  const displayUnit = unit === "C" ? "°C" : unit;

  // Annual: the native "YYYY13" average key, not a computed aggregate.
  const annualPoints: SeriesPoint[] = Object.entries(series)
    .filter(([key]) => key.endsWith("13"))
    .map(([key, value]) => ({ year: key.slice(0, 4), value }))
    .filter(({ value }) => value !== fillValue && Number.isFinite(value))
    .map(({ year, value }) => ({ date: `${year}-01-01`, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (annualPoints.length === 0) {
    throw new Error(`${param.parameter} @ ${request.label}: NASA POWER returned zero valid annual points for ${url}. Refusing to write an empty series file.`);
  }
  writeSeries(outDir, param.annualDatasetId, "annual", displayUnit, url, annualPoints);

  // Monthly: native "YYYY01".."YYYY12" keys, not the "13" annual average.
  const monthlyPoints: SeriesPoint[] = Object.entries(series)
    .filter(([key]) => !key.endsWith("13"))
    .map(([key, value]) => ({ year: key.slice(0, 4), month: key.slice(4, 6), value }))
    .filter(({ value }) => value !== fillValue && Number.isFinite(value))
    .map(({ year, month, value }) => ({ date: `${year}-${month}-01`, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (monthlyPoints.length === 0) {
    throw new Error(`${param.parameter} @ ${request.label}: NASA POWER returned zero valid monthly points for ${url}. Refusing to write an empty series file.`);
  }
  writeSeries(outDir, param.monthlyDatasetId, "monthly", displayUnit, url, monthlyPoints);
}

async function main(): Promise<void> {
  const outDir = fileURLToPath(new URL("../../src/data/series/", import.meta.url));
  mkdirSync(outDir, { recursive: true });

  let failures = 0;
  for (const request of REQUESTS) {
    try {
      const { body, url } = await resolveResponse(request);
      for (const param of request.params) {
        extractParam(outDir, request, param, body, url);
      }
    } catch (err) {
      failures += 1;
      console.error(`FAIL: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (failures > 0) {
    console.error(`\n${failures} of ${REQUESTS.length} NASA POWER point request(s) failed.`);
    process.exit(1);
  }
  console.log(`\nAll ${REQUESTS.length} NASA POWER point request(s) fetched successfully.`);
}

main().catch((err) => {
  console.error(`FAIL: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
