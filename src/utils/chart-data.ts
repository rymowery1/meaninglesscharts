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
  [pairKey("nasa-power-temp-annual", "worldbank-inflation-annual")]: {
    title: "Washington, D.C. Annual Temperature vs. Global Inflation Rate",
    fakeInsight:
      "Since 1981, Washington's summers have warmed while the world's inflation rate has cooled from double digits to a fraction of that — two long trends running in opposite directions, decade after decade.",
    reveal:
      "Global inflation reflects monetary policy, oil shocks, supply chains, and a hundred other things — not the temperature in Washington, D.C. A forty-four-year decline in one line and a slow rise in another are two separate stories that happen to share a chart.",
  },
  // --- SAMPLE BATCH (2026-07-24): first charts to use the "funny" datasets.
  // Three deliberately different shapes/tones for RyMow to react to before scaling.
  [pairKey("worldbank-forest-area-pct-annual", "ngrams-word-existential-annual")]: {
    title: "Global Forest Cover vs. How Often Books Say “Existential”",
    fakeInsight:
      "As the share of the planet under forest slipped from about 33% to 31%, the word “existential” turned up more than twice as often on the printed page — as if the shrinking of the woods were quietly working its way into the language.",
    reveal:
      "Forest cover falls for reasons of farmland, logging, and land-use policy. A word grows more common in books because of fashions in writing, philosophy, and marketing copy. One line drifting down while another drifts up, over the same 28 years, is a coincidence of timing — not the forest talking.",
  },
  [pairKey("wikimedia-pageviews-time-travel-monthly", "noaa-co2-mauna-loa-monthly")]: {
    title: "Interest in “Time Travel” vs. Atmospheric CO₂",
    fakeInsight:
      "Month after month, the carbon dioxide in the air has ticked upward while the number of people reading about time travel on Wikipedia has fallen by roughly two-thirds — as if the warmer the present gets, the less we let ourselves dream of other eras.",
    reveal:
      "CO₂ rises with fossil-fuel use and follows a yearly seasonal sawtooth from plant growth. Curiosity about a Wikipedia article rises and falls with films, headlines, and search trends. Two lines crossing over eleven years is not one moving the other — they were never on speaking terms.",
  },
  [pairKey("worldbank-population-total-annual", "ngrams-word-spaghetti-annual")]: {
    title: "World Population vs. How Often Books Say “Spaghetti”",
    fakeInsight:
      "The human population went from three billion to nearly eight, and across the very same years the word “spaghetti” roughly tripled in printed books — two lines climbing together so neatly they seem to share an appetite.",
    reveal:
      "Population grows through births, longevity, and demographics. A noun grows more frequent in books because of cookbooks, food writing, and changing tastes in prose. Both happen to rise across the late twentieth century; that shared direction is timing, not a link between people and pasta.",
  },
  // --- BATCH 2 (2026-07-24): +10 charts, mixing matched-magnitude "dancing"
  // pairs, wild-vs-flat drift, and wiggly monthly attention data. Spread across
  // 10 different funny datasets. Every movement described below is the real
  // fetched data; only the pairing and the wink are invented.
  [pairKey("worldbank-journal-articles-annual", "ngrams-word-awesome-annual")]: {
    title: "Scientific Papers Published vs. How Often Books Say “Awesome”",
    fakeInsight:
      "The world's output of scientific journal articles nearly tripled between 1996 and 2019 — and the word “awesome” grew almost exactly as fast on the printed page, as if every new study arrived to a chorus of quiet approval.",
    reveal:
      "Research output climbs with funding, universities, and the pressure to publish. A slang word spreads through speech, advertising, and casual writing. The two lines rise at nearly the same rate here, which makes for a tidy picture and nothing more — matching slopes are not a shared cause.",
  },
  [pairKey("worldbank-electric-power-consumption-annual", "ngrams-word-dude-annual")]: {
    title: "Global Electricity Use vs. How Often Books Say “Dude”",
    fakeInsight:
      "As the average person on Earth drew more electricity year after year, the word “dude” went from rare to routine in books — leaving the impression that the grid and the vernacular powered up together.",
    reveal:
      "Per-person electricity use rises with incomes, appliances, and expanding grids. “Dude” spread through movies, surf culture, and everyday speech working its way into print. One is measured in kilowatt-hours, the other in word counts; they share a decade or two of upward motion and nothing else.",
  },
  [pairKey("worldbank-birth-rate-annual", "ngrams-word-apocalypse-annual")]: {
    title: "Global Birth Rate vs. How Often Books Say “Apocalypse”",
    fakeInsight:
      "Since 1960 the world's birth rate has fallen by almost half, while the word “apocalypse” has grown roughly tenfold in books — two lines pulling hard in opposite directions, as if every unborn child were being counted in dread.",
    reveal:
      "Birth rates fall with rising incomes, education, and access to contraception. “Apocalypse” rises through fiction, film marketing, and a taste for end-times language. A long decline in one line and a steep climb in another, over the same sixty years, is a coincidence of timing — not one driving the other.",
  },
  [pairKey("worldbank-fixed-telephone-annual", "ngrams-word-groovy-annual")]: {
    title: "Landline Telephone Subscriptions vs. How Often Books Say “Groovy”",
    fakeInsight:
      "Landlines and the word “groovy” both belong to a certain idea of the past — and for decades their two lines rose together, as if every new phone line came with a little more slang attached.",
    reveal:
      "Fixed-telephone subscriptions actually peaked around 2006 and then fell as mobile phones took over, while “groovy” kept drifting upward in books on its own retro momentum. Pick the right stretch of years and any two lines will seem to travel together; the source panel shows how differently these two really behave.",
  },
  [pairKey("worldbank-forest-area-pct-annual", "ngrams-word-email-annual")]: {
    title: "Global Forest Cover vs. How Often Books Say “Email”",
    fakeInsight:
      "As the world's forest cover thinned from about 33% to 31%, the word “email” exploded off almost nothing into common usage — a falling line and a rocketing one that together look like a trade: fewer trees, more inboxes.",
    reveal:
      "Forest cover falls through farming, logging, and land-use choices. “Email” surged in books because a new technology needed a word for itself. One barely moves in percentage terms while the other multiplies many times over; putting them on a shared 100-baseline chart flatters the coincidence but changes nothing about it.",
  },
  [pairKey("wikimedia-pageviews-nicolas-cage-monthly", "silso-sunspots-monthly")]: {
    title: "Interest in Nicolas Cage vs. Sunspot Activity",
    fakeInsight:
      "The sun climbed toward the loud peak of its eleven-year cycle, and month by month the number of people reading about Nicolas Cage on Wikipedia rose and jittered right alongside it — as if the actor and the solar surface were somehow keeping time.",
    reveal:
      "Sunspot counts follow the physics of the solar cycle, which peaked around 2024. Pageviews for an actor follow new films, memes, and news cycles. Both wiggle, and any two wiggling lines will occasionally wiggle the same way; that's coincidence, not the sun casting an interest in Nicolas Cage.",
  },
  [pairKey("wikimedia-pageviews-loch-ness-monster-monthly", "nasa-power-area51-solar-monthly")]: {
    title: "Interest in the Loch Ness Monster vs. Sunlight over Area 51",
    fakeInsight:
      "Over the last decade, monthly curiosity about the Loch Ness Monster faded by roughly half — and the sunlight measured over Area 51 dimmed on a similar path, as if Scotland's most famous rumor were tied to the light in the Nevada desert.",
    reveal:
      "Solar radiation over one desert point moves with seasons and cloud cover. Interest in a folklore article moves with documentaries, anniversaries, and passing internet attention. Two lines drifting down over the same years is a coincidence of timing; a lake in Scotland and the sky over Nevada share nothing but this chart.",
  },
  [pairKey("usgs-quakes-m5-5-monthly-count", "wikimedia-pageviews-godzilla-monthly")]: {
    title: "Monthly Major Earthquakes vs. Interest in Godzilla",
    fakeInsight:
      "It is almost too fitting: a monster woken by the earth's violence, and a count of the planet's largest earthquakes, charted side by side — as if every tremor sent a few more people to read about Godzilla.",
    reveal:
      "Earthquake counts move with plate tectonics. Interest in Godzilla moves with film releases and pop culture, and here it actually trends down while quakes hold roughly steady. The theme is a great setup, but the lines don't keep step — a fitting story is not the same as a real one.",
  },
  [pairKey("wikimedia-pageviews-ouija-monthly", "noaa-co2-mauna-loa-monthly")]: {
    title: "Interest in Ouija Boards vs. Atmospheric CO₂",
    fakeInsight:
      "Carbon dioxide in the atmosphere kept climbing while monthly interest in Ouija boards dropped to a quarter of where it started — an inverse pairing tidy enough to suggest the warming air had spooked the spirits away.",
    reveal:
      "CO₂ rises with fossil-fuel use, on a steady seasonal sawtooth. Curiosity about a spooky article spikes around Halloween and fades the rest of the year. One line trends up, the other trends down; a chart can line up two unrelated stories, but it can't make them talk.",
  },
  [pairKey("wikimedia-pageviews-area-51-monthly", "nasa-power-area51-windspeed-monthly")]: {
    title: "Interest in Area 51 vs. the Actual Wind over Area 51",
    fakeInsight:
      "Here, at last, are two lines about the very same patch of desert: how many people are reading about Area 51, and how hard the wind is actually blowing over it — surely, of all pairings, this is the one where they must move together.",
    reveal:
      "They don't. Public fascination with Area 51 spiked with a viral 2019 event and drifted down afterward, while the wind over the site just kept doing its ordinary seasonal thing, barely changing across the decade. Even two things standing on the same ground can be completely unrelated — being about the same place is not a relationship.",
  },
};

// Read-only view of CHART_COPY for the docs generator (scripts/sync-copy-docs.ts).
// Keeps the map itself module-private while letting the sync script mirror it.
export const CHART_COPY_FOR_DOCS: Readonly<Record<string, ChartCopy>> = CHART_COPY;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Whether a pairing has hand-written copy in CHART_COPY. pairings.json holds
 * every structurally-valid *candidate* pairing (see generate-sample-pairings.ts);
 * only the ones with copy are actually rendered as charts. A candidate without
 * copy is skipped by buildAllCharts, not shown with fabricated copy.
 */
export function hasChartCopy(aId: string, bId: string): boolean {
  return CHART_COPY[pairKey(aId, bId)] !== undefined;
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

  const charts: GeneratedChart[] = [];
  let skipped = 0;
  for (const { datasetAId, datasetBId } of pairings) {
    const a = datasetById.get(datasetAId);
    const b = datasetById.get(datasetBId);
    const seriesA = seriesByDatasetId.get(datasetAId);
    const seriesB = seriesByDatasetId.get(datasetBId);
    if (!a || !b || !seriesA || !seriesB) {
      throw new Error(`Pairing references missing dataset or series: ${datasetAId} + ${datasetBId}`);
    }
    // Candidate pairings without hand-written copy are valid data but aren't
    // rendered — skip them rather than throwing or inventing copy.
    if (!hasChartCopy(datasetAId, datasetBId)) {
      skipped++;
      continue;
    }
    charts.push(buildGeneratedChart(a, b, seriesA, seriesB));
  }
  if (skipped > 0) {
    console.warn(
      `buildAllCharts: rendered ${charts.length} chart(s); skipped ${skipped} candidate pairing(s) without copy (add entries to CHART_COPY in src/utils/chart-data.ts to render them).`,
    );
  }
  return charts;
}
