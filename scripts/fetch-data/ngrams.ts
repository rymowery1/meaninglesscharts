// Fetches real yearly word-frequency series from the Google Books Ngram
// Viewer's JSON endpoint (https://books.google.com/ngrams/) — no API key
// required. See CLAUDE.md's "Data Acquisition Model" for the rules this
// script must follow: no hardcoded values, fail loudly on a non-200 response
// or unexpected shape, drop nothing silently.
//
// This is the same JSON endpoint the public Ngram Viewer uses. It is not a
// formally documented API, so it is treated defensively: the response must be
// a JSON array, the requested word must be present as an object, and its
// "timeseries" must contain exactly one value per year in the requested range
// (year_end - year_start + 1) — otherwise the index->year mapping would be
// wrong and the script fails rather than writing a misaligned series.
//
// Corpus: en-2019 (English 2019), which runs through 2019. smoothing=0 so each
// year is the raw yearly frequency, not a blended/smoothed value.

import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { SeriesFile, SeriesPoint } from "../../src/data/types.ts";

const SCRIPT_PATH = "scripts/fetch-data/ngrams.ts";
const SOURCE_ORGANIZATION = "Google Books Ngram Viewer";
const CORPUS = "en-2019";
const YEAR_START = 1800;
const YEAR_END = 2019;
const USER_AGENT = "meaningless-charts-fetcher/0.1 (personal project; no contact URL yet)";

type WordJob = {
  word: string;
  datasetId: string;
};

const WORDS: WordJob[] = [
  { word: "moist", datasetId: "ngrams-word-moist-annual" },
  { word: "awesome", datasetId: "ngrams-word-awesome-annual" },
  { word: "groovy", datasetId: "ngrams-word-groovy-annual" },
  { word: "email", datasetId: "ngrams-word-email-annual" },
  { word: "dude", datasetId: "ngrams-word-dude-annual" },
  { word: "apocalypse", datasetId: "ngrams-word-apocalypse-annual" },
  { word: "spaghetti", datasetId: "ngrams-word-spaghetti-annual" },
  { word: "existential", datasetId: "ngrams-word-existential-annual" },
];

type NgramEntry = {
  ngram: string;
  type?: string;
  timeseries: number[];
};

function buildUrl(word: string): string {
  return `https://books.google.com/ngrams/json?content=${encodeURIComponent(word)}&year_start=${YEAR_START}&year_end=${YEAR_END}&corpus=${CORPUS}&smoothing=0`;
}

function parsePoints(body: unknown, word: string, url: string): SeriesPoint[] {
  if (!Array.isArray(body)) {
    throw new Error(`${word}: Ngram endpoint did not return a JSON array for ${url}`);
  }
  const entries = body as NgramEntry[];
  // Some words expand into multiple objects (e.g. part-of-speech variants);
  // take the one whose ngram matches the requested word exactly (case-insensitive).
  const entry = entries.find((e) => typeof e?.ngram === "string" && e.ngram.toLowerCase() === word.toLowerCase());
  if (!entry) {
    const got = entries.map((e) => e?.ngram).join(", ") || "(none)";
    throw new Error(`${word}: Ngram endpoint returned no exact match for "${word}" (got: ${got}) for ${url}`);
  }
  if (!Array.isArray(entry.timeseries)) {
    throw new Error(`${word}: Ngram entry is missing a numeric timeseries array for ${url}`);
  }

  const expected = YEAR_END - YEAR_START + 1;
  if (entry.timeseries.length !== expected) {
    throw new Error(
      `${word}: Ngram timeseries has ${entry.timeseries.length} values but the ${YEAR_START}-${YEAR_END} range expects ${expected}. Refusing to write a misaligned series.`,
    );
  }

  const points: SeriesPoint[] = entry.timeseries.map((value, i) => {
    if (!Number.isFinite(value)) {
      throw new Error(`${word}: Ngram timeseries contains a non-finite value at index ${i} for ${url}`);
    }
    return { date: `${YEAR_START + i}-01-01`, value };
  });
  return points;
}

async function main(): Promise<void> {
  const outDir = fileURLToPath(new URL("../../src/data/series/", import.meta.url));
  mkdirSync(outDir, { recursive: true });

  let failures = 0;
  for (const job of WORDS) {
    try {
      const url = buildUrl(job.word);
      const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (!response.ok) {
        throw new Error(`${job.word}: Ngram endpoint returned ${response.status} ${response.statusText} for ${url}`);
      }
      const points = parsePoints(await response.json(), job.word, url);

      const seriesFile: SeriesFile = {
        datasetId: job.datasetId,
        sourceOrganization: SOURCE_ORGANIZATION,
        sourceUrl: url,
        unit: `frequency (share of 1-grams in the Google Books ${CORPUS} corpus)`,
        frequency: "annual",
        fetchedAt: new Date().toISOString(),
        fetchedBy: SCRIPT_PATH,
        provenance: "script",
        points,
      };
      const outPath = `${outDir}${job.datasetId}.json`;
      writeFileSync(outPath, JSON.stringify(seriesFile, null, 2) + "\n", "utf-8");
      console.log(`OK: ${job.datasetId} — ${points.length} points, ${points[0].date} to ${points[points.length - 1].date} — wrote ${outPath}`);
    } catch (err) {
      failures += 1;
      console.error(`FAIL: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (failures > 0) {
    console.error(`\n${failures} of ${WORDS.length} Ngram word series failed to fetch.`);
    process.exit(1);
  }
  console.log(`\nAll ${WORDS.length} Ngram word series fetched successfully.`);
}

main().catch((err) => {
  console.error(`FAIL: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
