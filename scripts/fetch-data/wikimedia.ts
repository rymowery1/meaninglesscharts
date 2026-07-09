// Fetches a real monthly pageview series from the Wikimedia Pageviews REST
// API (https://wikimedia.org/api/rest_v1/) — no API key required, but
// Wikimedia's API etiquette asks for a descriptive User-Agent header. See
// CLAUDE.md's "Data Acquisition Model" for the rules this script must follow.
//
// Uses agent=user (Wikimedia's heuristic bot-filtering), not all-agents, to
// better match the "culture-attention" domain framing — still an imperfect
// filter, noted as a bias risk in docs/data/approved-sources.md.

import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { SeriesFile, SeriesPoint } from "../../src/data/types.ts";

const SCRIPT_PATH = "scripts/fetch-data/wikimedia.ts";
const SOURCE_ORGANIZATION = "Wikimedia Foundation";
const DATASET_ID = "wikimedia-enwiki-pageviews-monthly";
const PROJECT = "en.wikipedia";
const START_TIMESTAMP = "2015070100"; // Wikimedia Pageviews API data begins July 2015
const USER_AGENT = "meaningless-charts-fetcher/0.1 (personal project; no contact URL yet)";

type WikimediaItem = {
  timestamp: string; // "YYYYMMDD00"
  views: number;
};

type WikimediaResponse = {
  items: WikimediaItem[];
};

function endTimestamp(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}00`;
}

function buildUrl(): string {
  return `https://wikimedia.org/api/rest_v1/metrics/pageviews/aggregate/${PROJECT}/all-access/user/monthly/${START_TIMESTAMP}/${endTimestamp()}`;
}

async function main(): Promise<void> {
  const url = buildUrl();
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) {
    throw new Error(`Wikimedia Pageviews API returned ${response.status} ${response.statusText} for ${url}`);
  }

  const body = (await response.json()) as WikimediaResponse;
  if (!Array.isArray(body.items)) {
    throw new Error(`Wikimedia Pageviews API response is missing an items array for ${url}`);
  }

  // Defensive: drop the current calendar month if present, since a
  // still-accumulating month isn't comparable to a completed one. In
  // practice Wikimedia's monthly endpoint only publishes completed months.
  const currentMonthPrefix = endTimestamp().slice(0, 6);

  const points: SeriesPoint[] = body.items
    .filter((item) => item.timestamp.slice(0, 6) !== currentMonthPrefix)
    .filter((item) => Number.isFinite(item.views) && item.views > 0)
    .map((item) => {
      const year = item.timestamp.slice(0, 4);
      const month = item.timestamp.slice(4, 6);
      return { date: `${year}-${month}-01`, value: item.views };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  if (points.length === 0) {
    throw new Error(`Wikimedia Pageviews API returned zero valid monthly points for ${url}. Refusing to write an empty series file.`);
  }

  const seriesFile: SeriesFile = {
    datasetId: DATASET_ID,
    sourceOrganization: SOURCE_ORGANIZATION,
    sourceUrl: url,
    unit: "pageviews (user agent, all-access)",
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
  console.log(`OK: ${DATASET_ID} — ${points.length} points, ${firstDate} to ${lastDate} — wrote ${outPath}`);
}

main().catch((err) => {
  console.error(`FAIL: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
