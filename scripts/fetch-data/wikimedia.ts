// Fetches real monthly pageview series from the Wikimedia Pageviews REST
// API (https://wikimedia.org/api/rest_v1/) — no API key required, but
// Wikimedia's API etiquette asks for a descriptive User-Agent header. See
// CLAUDE.md's "Data Acquisition Model" for the rules this script must follow.
//
// Two kinds of series are fetched, both at monthly frequency and both using
// agent=user (Wikimedia's heuristic bot-filtering, not all-agents) to match
// the "culture-attention" domain framing — still an imperfect filter, noted
// as a bias risk in docs/data/approved-sources.md:
//
//   1. The project-wide aggregate for en.wikipedia (the original dataset).
//   2. Per-article pageviews for a hand-picked set of deliberately absurd
//      articles (Bigfoot, Nicolas Cage, …). Each is its own dataset. Because
//      every one of these shares sourceOrganization "Wikimedia Foundation",
//      they can't pair with each other — each can only pair with a
//      different-org monthly dataset (e.g. usgs-quakes-m5-5-monthly-count).
//
// The article slugs below are real English Wikipedia page titles — they
// configure *which* series to request. The actual data points written to
// src/data/series/ come only from the live API response.

import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { SeriesFile, SeriesPoint } from "../../src/data/types.ts";

const SCRIPT_PATH = "scripts/fetch-data/wikimedia.ts";
const SOURCE_ORGANIZATION = "Wikimedia Foundation";
const PROJECT = "en.wikipedia";
const START_TIMESTAMP = "2015070100"; // Wikimedia Pageviews API data begins July 2015
const USER_AGENT = "meaningless-charts-fetcher/0.1 (personal project; no contact URL yet)";

// The project-wide aggregate (dataset #1).
const AGGREGATE_DATASET_ID = "wikimedia-enwiki-pageviews-monthly";

// Per-article jobs (dataset #2..N). `slug` is the exact English Wikipedia
// page title (underscores for spaces), used verbatim in the API path.
type ArticleJob = {
  slug: string;
  datasetId: string;
};

const ARTICLES: ArticleJob[] = [
  // "Bigfoot" was dropped: the Wikimedia per-article endpoint returns a stable
  // (negative-cached) 404 for its current-month end-boundary URL even though the
  // article has data, so it can't be fetched reliably. Not worth special-casing.
  { slug: "Nicolas_Cage", datasetId: "wikimedia-pageviews-nicolas-cage-monthly" },
  { slug: "Loch_Ness_Monster", datasetId: "wikimedia-pageviews-loch-ness-monster-monthly" },
  { slug: "Area_51", datasetId: "wikimedia-pageviews-area-51-monthly" },
  { slug: "Godzilla", datasetId: "wikimedia-pageviews-godzilla-monthly" },
  { slug: "Bermuda_Triangle", datasetId: "wikimedia-pageviews-bermuda-triangle-monthly" },
  { slug: "Ouija", datasetId: "wikimedia-pageviews-ouija-monthly" },
  { slug: "Time_travel", datasetId: "wikimedia-pageviews-time-travel-monthly" },
];

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

function aggregateUrl(): string {
  return `https://wikimedia.org/api/rest_v1/metrics/pageviews/aggregate/${PROJECT}/all-access/user/monthly/${START_TIMESTAMP}/${endTimestamp()}`;
}

function perArticleUrl(slug: string): string {
  // The article title is a single path segment; encode it so titles with
  // characters like parentheses or slashes can't break the URL. Underscores
  // and plain ASCII letters pass through unchanged.
  return `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/${PROJECT}/all-access/user/${encodeURIComponent(slug)}/monthly/${START_TIMESTAMP}/${endTimestamp()}`;
}

// Both the aggregate and per-article endpoints return the same
// { items: [{ timestamp, views }] } shape, so one parser serves both.
function parsePoints(body: WikimediaResponse, url: string, datasetId: string): SeriesPoint[] {
  if (!Array.isArray(body.items)) {
    throw new Error(`${datasetId}: Wikimedia Pageviews API response is missing an items array for ${url}`);
  }

  // Drop the current calendar month if present, since a still-accumulating
  // month isn't comparable to a completed one. In practice Wikimedia's
  // monthly endpoint only publishes completed months.
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
    throw new Error(`${datasetId}: Wikimedia Pageviews API returned zero valid monthly points for ${url}. Refusing to write an empty series file.`);
  }
  return points;
}

function writeSeries(outDir: string, datasetId: string, unit: string, url: string, points: SeriesPoint[]): void {
  const seriesFile: SeriesFile = {
    datasetId,
    sourceOrganization: SOURCE_ORGANIZATION,
    sourceUrl: url,
    unit,
    frequency: "monthly",
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJob(url: string, datasetId: string): Promise<WikimediaResponse> {
  // Wikimedia's REST API intermittently returns a transient 404 (and
  // occasionally 429/5xx) for an article that plainly has data — a retry a
  // moment later succeeds. Retry those specific statuses a few times with a
  // short backoff; still fail loudly if it never recovers, and never retry a
  // 400 (a genuinely malformed request).
  const RETRYABLE = new Set([404, 429, 500, 502, 503, 504]);
  const MAX_ATTEMPTS = 4;
  let lastStatus = 0;
  let lastText = "";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (response.ok) {
      return (await response.json()) as WikimediaResponse;
    }
    lastStatus = response.status;
    lastText = response.statusText;
    if (!RETRYABLE.has(response.status) || attempt === MAX_ATTEMPTS) {
      break;
    }
    await sleep(500 * attempt); // 0.5s, 1s, 1.5s
  }
  throw new Error(`${datasetId}: Wikimedia Pageviews API returned ${lastStatus} ${lastText} for ${url} (after retries)`);
}

async function main(): Promise<void> {
  const outDir = fileURLToPath(new URL("../../src/data/series/", import.meta.url));
  mkdirSync(outDir, { recursive: true });

  let failures = 0;

  // Dataset #1: project-wide aggregate.
  try {
    const url = aggregateUrl();
    const body = await fetchJob(url, AGGREGATE_DATASET_ID);
    const points = parsePoints(body, url, AGGREGATE_DATASET_ID);
    writeSeries(outDir, AGGREGATE_DATASET_ID, "pageviews (user agent, all-access)", url, points);
  } catch (err) {
    failures += 1;
    console.error(`FAIL: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Datasets #2..N: per-article pageviews.
  for (const article of ARTICLES) {
    try {
      const url = perArticleUrl(article.slug);
      const body = await fetchJob(url, article.datasetId);
      const points = parsePoints(body, url, article.datasetId);
      writeSeries(outDir, article.datasetId, `monthly pageviews of "${article.slug.replace(/_/g, " ")}" (user agent, all-access)`, url, points);
    } catch (err) {
      failures += 1;
      console.error(`FAIL: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const total = 1 + ARTICLES.length;
  if (failures > 0) {
    console.error(`\n${failures} of ${total} Wikimedia series failed to fetch.`);
    process.exit(1);
  }
  console.log(`\nAll ${total} Wikimedia series fetched successfully.`);
}

main().catch((err) => {
  console.error(`FAIL: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
