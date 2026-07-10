// Fetches real annual indicator series from the World Bank Indicators API
// (https://api.worldbank.org/v2/) — no API key required. See CLAUDE.md's
// "Data Acquisition Model" for the rules this script must follow: no
// hardcoded data values, no synthetic gap-filling, fail loudly on any
// non-200 response or unexpected shape, write exactly one series file per
// dataset with real provenance.
//
// The indicator codes, geography, and unit strings below are World Bank's
// own published indicator metadata (documented on their site), not fetched
// data — they configure *which* series to request. The actual data points
// written to src/data/series/ come only from the live API response.

import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { SeriesFile, SeriesPoint } from "../../src/data/types.ts";

const SCRIPT_PATH = "scripts/fetch-data/worldbank.ts";
const SOURCE_ORGANIZATION = "The World Bank";
const GEOGRAPHY = "WLD"; // World Bank aggregate code for "World"

type IndicatorConfig = {
  datasetId: string;
  indicatorCode: string;
  unit: string;
};

// World aggregate ("WLD") series for each candidate dataset in
// docs/data/dataset-catalog.md. Units are World Bank's published metadata
// for these indicators.
const INDICATORS: IndicatorConfig[] = [
  { datasetId: "worldbank-gdp-growth-annual", indicatorCode: "NY.GDP.MKTP.KD.ZG", unit: "annual % change" },
  { datasetId: "worldbank-population-total-annual", indicatorCode: "SP.POP.TOTL", unit: "number of people" },
  { datasetId: "worldbank-forest-area-pct-annual", indicatorCode: "AG.LND.FRST.ZS", unit: "% of land area" },
  { datasetId: "worldbank-agricultural-land-pct-annual", indicatorCode: "AG.LND.AGRI.ZS", unit: "% of land area" },
  { datasetId: "worldbank-internet-users-pct-annual", indicatorCode: "IT.NET.USER.ZS", unit: "% of population" },
  { datasetId: "worldbank-life-expectancy-annual", indicatorCode: "SP.DYN.LE00.IN", unit: "years" },
  { datasetId: "worldbank-co2-emissions-per-capita-annual", indicatorCode: "EN.GHG.CO2.PC.CE.AR5", unit: "t CO2e per capita" },
  { datasetId: "worldbank-unemployment-rate-annual", indicatorCode: "SL.UEM.TOTL.ZS", unit: "% of total labor force" },
  { datasetId: "worldbank-electric-power-consumption-annual", indicatorCode: "EG.USE.ELEC.KH.PC", unit: "kWh per capita" },
  { datasetId: "worldbank-mobile-subscriptions-annual", indicatorCode: "IT.CEL.SETS.P2", unit: "subscriptions per 100 people" },
  { datasetId: "worldbank-inflation-annual", indicatorCode: "FP.CPI.TOTL.ZG", unit: "annual % change in consumer prices" },
  { datasetId: "worldbank-renewable-energy-pct-annual", indicatorCode: "EG.FEC.RNEW.ZS", unit: "% of total final energy consumption" },
  { datasetId: "worldbank-cereal-yield-annual", indicatorCode: "AG.YLD.CREL.KG", unit: "kg per hectare" },
];

type WorldBankMetaEntry = {
  message?: { id: string; key: string; value: string }[];
};

type WorldBankDataPoint = {
  date: string;
  value: number | null;
};

type WorldBankResponse = [WorldBankMetaEntry, WorldBankDataPoint[] | null];

async function fetchIndicator(config: IndicatorConfig): Promise<void> {
  const url = `https://api.worldbank.org/v2/country/${GEOGRAPHY}/indicator/${config.indicatorCode}?format=json&per_page=1000`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `${config.datasetId}: World Bank API returned ${response.status} ${response.statusText} for ${url}`,
    );
  }

  const body = (await response.json()) as WorldBankResponse;
  const [meta, data] = body;

  if (meta?.message) {
    const detail = meta.message.map((m) => `${m.key}: ${m.value}`).join("; ");
    throw new Error(`${config.datasetId}: World Bank API error — ${detail}`);
  }

  if (!Array.isArray(data)) {
    throw new Error(
      `${config.datasetId}: unexpected response shape from World Bank API (no data array) for ${url}`,
    );
  }

  // Gaps are represented by absence, never by a null value — drop null
  // entries rather than filling them.
  const points: SeriesPoint[] = data
    .filter((entry): entry is WorldBankDataPoint & { value: number } => entry.value !== null)
    .map((entry) => ({ date: `${entry.date}-01-01`, value: entry.value }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (points.length === 0) {
    throw new Error(
      `${config.datasetId}: World Bank API returned zero non-null points for ${url}. Refusing to write an empty series file.`,
    );
  }

  const seriesFile: SeriesFile = {
    datasetId: config.datasetId,
    sourceOrganization: SOURCE_ORGANIZATION,
    sourceUrl: url,
    unit: config.unit,
    frequency: "annual",
    fetchedAt: new Date().toISOString(),
    fetchedBy: SCRIPT_PATH,
    provenance: "script",
    points,
  };

  const outDir = fileURLToPath(new URL("../../src/data/series/", import.meta.url));
  mkdirSync(outDir, { recursive: true });
  const outPath = `${outDir}${config.datasetId}.json`;
  writeFileSync(outPath, JSON.stringify(seriesFile, null, 2) + "\n", "utf-8");

  const firstDate = points[0].date;
  const lastDate = points[points.length - 1].date;
  console.log(
    `OK: ${config.datasetId} — ${points.length} points, ${firstDate} to ${lastDate} — wrote ${outPath}`,
  );
}

async function main(): Promise<void> {
  let failures = 0;
  for (const config of INDICATORS) {
    try {
      await fetchIndicator(config);
    } catch (err) {
      failures += 1;
      console.error(`FAIL: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (failures > 0) {
    console.error(`\n${failures} of ${INDICATORS.length} World Bank indicator(s) failed to fetch.`);
    process.exit(1);
  }

  console.log(`\nAll ${INDICATORS.length} World Bank indicators fetched successfully.`);
}

main();
