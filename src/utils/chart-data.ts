// Server-side (build-time) assembly of GeneratedChart objects from real
// data: src/data/datasets.json, src/data/series/*.json, and
// src/data/pairings.json. Re-validates every pairing with checkPairing()
// before building it — pairings.json should already only contain valid
// pairings (see scripts/generate-sample-pairings.ts), but a page shouldn't
// trust a data file blindly.

import { readFileSync, readdirSync } from "node:fs";
import {
  NON_CAUSAL_DISCLAIMER,
  type DatasetMeta,
  type GeneratedChart,
  type SeriesFile,
} from "../data/types";
import { getSharedWindow, normalizeToIndex100 } from "./normalize";
import { checkPairing, type ValidPairing } from "./pairings";

type ChartCopy = { title: string; fakeInsight: string; reveal: string };

function pairKey(a: string, b: string): string {
  return [a, b].sort().join("|");
}

// Mirrors docs/content/chart-copy.md, fake-insight-templates.md, and
// reveal-templates.md — written by hand for these 3 specific pairings
// (see .claude/agents/brand-content.md for the language rules followed).
const CHART_COPY: Record<string, ChartCopy> = {
  [pairKey("worldbank-population-total-annual", "nasa-power-temp-annual")]: {
    title: "World Population vs. Washington, D.C. Annual Temperature",
    fakeInsight:
      "As Earth's population climbed past eight billion, Washington, D.C.'s yearly average temperature climbed right along with it — a tidy two-line story that seems to write itself.",
    reveal:
      "Global population has risen almost every year for decades, for reasons that have nothing to do with the weather in Washington, D.C. Annual temperature readings move for their own reasons too. Two rising lines on the same chart are not a relationship.",
  },
  [pairKey("nasa-power-temp-annual", "worldbank-internet-users-pct-annual")]: {
    title: "Washington, D.C. Annual Temperature vs. Global Internet Adoption",
    fakeInsight:
      "The share of the world online and the warmth of a single American city both climbed through the same twenty years, inviting the eye to connect two lines that have never actually met.",
    reveal:
      "Internet adoption is a story about affordable devices and expanding networks. A single city's yearly average temperature is a story about weather. They happen to share a chart. They don't share a cause.",
  },
  [pairKey("usgs-quakes-m5-5-monthly-count", "wikimedia-enwiki-pageviews-monthly")]: {
    title: "Monthly Earthquake Counts vs. English Wikipedia Pageviews",
    fakeInsight:
      "Earthquake counts and encyclopedia traffic swing up and down together, month after month, as if the planet's shaking and the internet's curiosity were somehow in sync.",
    reveal:
      "Wikipedia traffic moves with news cycles, search trends, and unrelated internet events. Earthquake counts move with plate tectonics. Any month where both go up is a coincidence, not a pattern — and plenty of months, they don't.",
  },
  [pairKey("nasa-power-temp-annual", "worldbank-life-expectancy-annual")]: {
    title: "Global Life Expectancy vs. Washington, D.C. Annual Temperature",
    fakeInsight:
      "Since 1981, life expectancy worldwide has climbed year after year right alongside Washington, D.C.'s warming summers — two long, steady lines that seem to be telling the same story.",
    reveal:
      "Life expectancy has risen for decades because of vaccines, medicine, sanitation, and falling infant mortality — none of it tied to a temperature reading in one American city. Two lines climbing over the same forty-some years is not evidence they're connected.",
  },
  [pairKey("nasa-power-temp-annual", "worldbank-unemployment-rate-annual")]: {
    title: "Washington, D.C. Annual Temperature vs. Global Unemployment Rate",
    fakeInsight:
      "Since 1991, Washington's summers have warmed by a few degrees while the world's unemployment rate has quietly drifted the other way — an inverse relationship tidy enough to build a headline around.",
    reveal:
      "Global unemployment reflects labor markets, demographics, and in 2020, a pandemic — not the temperature in one American city. A slow rise in one line and a slow fall in another, over the same three and a half decades, is a coincidence of timing, not cause.",
  },
  [pairKey("nasa-power-temp-annual", "worldbank-electric-power-consumption-annual")]: {
    title: "Washington, D.C. Annual Temperature vs. Global Electric Power Consumption",
    fakeInsight:
      "As Washington, D.C.'s yearly average temperature climbed, so did how much electricity the average person on Earth uses each year — two rising lines, thirty years apart in origin but perfectly aligned on the page.",
    reveal:
      "Electricity use has grown with rising incomes, more appliances, and expanding power grids worldwide — not with the weather in one U.S. city. A single location's temperature record and a global consumption trend sit on entirely different scales, shaped by entirely different things.",
  },
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function loadDatasets(rootDir: string): DatasetMeta[] {
  return JSON.parse(readFileSync(`${rootDir}src/data/datasets.json`, "utf-8")) as DatasetMeta[];
}

export function loadSeriesByDatasetId(rootDir: string): Map<string, SeriesFile> {
  const seriesDir = `${rootDir}src/data/series/`;
  const map = new Map<string, SeriesFile>();
  for (const file of readdirSync(seriesDir).filter((f) => f.endsWith(".json"))) {
    const series = JSON.parse(readFileSync(`${seriesDir}${file}`, "utf-8")) as SeriesFile;
    map.set(series.datasetId, series);
  }
  return map;
}

export function loadPairings(rootDir: string): ValidPairing[] {
  return JSON.parse(readFileSync(`${rootDir}src/data/pairings.json`, "utf-8")) as ValidPairing[];
}

/**
 * Builds one GeneratedChart from two datasets + their series. Throws if the
 * pairing doesn't actually pass checkPairing() — callers must not catch
 * this and fall back to placeholder data.
 */
export function buildGeneratedChart(
  a: DatasetMeta,
  b: DatasetMeta,
  seriesA: SeriesFile,
  seriesB: SeriesFile,
): GeneratedChart {
  const check = checkPairing(a, b, seriesA, seriesB);
  if (!check.valid) {
    throw new Error(`Cannot build chart for ${a.id} + ${b.id}: invalid pairing (${check.reasons.join(", ")})`);
  }

  const shared = getSharedWindow(seriesA.points, seriesB.points);
  const aIndexed = normalizeToIndex100(shared.aValues);
  const bIndexed = normalizeToIndex100(shared.bValues);

  const points = shared.dates.map((date, i) => ({
    date,
    aOriginal: shared.aValues[i],
    bOriginal: shared.bValues[i],
    aIndexed: round1(aIndexed[i]),
    bIndexed: round1(bIndexed[i]),
  }));

  const copy = CHART_COPY[pairKey(a.id, b.id)];
  if (!copy) {
    throw new Error(
      `No copy found for pairing ${a.id} + ${b.id} — add an entry to CHART_COPY in src/utils/chart-data.ts and docs/content/*.md before this pairing can be shown.`,
    );
  }

  return {
    id: `${a.id}__${b.id}`,
    title: copy.title,
    datasetA: a,
    datasetB: b,
    points,
    normalization: "Indexed to 100 at first shared date",
    normalizationBaselineDate: shared.dates[0],
    fakeInsight: copy.fakeInsight,
    reveal: copy.reveal,
    disclaimer: NON_CAUSAL_DISCLAIMER,
  };
}

export function buildAllCharts(rootDir: string): GeneratedChart[] {
  const datasets = loadDatasets(rootDir);
  const datasetById = new Map(datasets.map((d) => [d.id, d]));
  const seriesByDatasetId = loadSeriesByDatasetId(rootDir);
  const pairings = loadPairings(rootDir);

  return pairings.map(({ datasetAId, datasetBId }) => {
    const a = datasetById.get(datasetAId);
    const b = datasetById.get(datasetBId);
    const seriesA = seriesByDatasetId.get(datasetAId);
    const seriesB = seriesByDatasetId.get(datasetBId);
    if (!a || !b || !seriesA || !seriesB) {
      throw new Error(`Pairing references missing dataset or series: ${datasetAId} + ${datasetBId}`);
    }
    return buildGeneratedChart(a, b, seriesA, seriesB);
  });
}
