// Regenerates the three content docs (chart-copy, fake-insight-templates,
// reveal-templates) from the canonical CHART_COPY map in src/utils/chart-data.ts
// so the docs can't drift from what actually renders. Run after editing copy.
// Uses pairings.json for the stored A/B order and dataset labels from datasets.json.
import { writeFileSync } from "node:fs";
import { CHART_COPY_FOR_DOCS } from "../src/utils/chart-data";
import { loadDatasets, loadPairings } from "../src/utils/chart-data";

const root = "./";
const pairings = loadPairings(root);
const datasets = loadDatasets(root);
const labelById = new Map(datasets.map((d) => [d.id, d.label]));

function pairKey(a: string, b: string): string {
  return [a, b].sort().join("|");
}

// Walk pairings in file order; keep those that have copy, in stored A/B order.
const entries: { aId: string; bId: string; copy: { title: string; fakeInsight: string; reveal: string } }[] = [];
for (const { datasetAId, datasetBId } of pairings) {
  const copy = CHART_COPY_FOR_DOCS[pairKey(datasetAId, datasetBId)];
  if (copy) entries.push({ aId: datasetAId, bId: datasetBId, copy });
}

const count = entries.length;

const chartCopy = [
  "# Chart Copy",
  "",
  `Titles for the ${count} rendered pairings in \`src/data/pairings.json\`. Descriptive, not a claim — the title names the two series, it doesn't assert a relationship. **Canonical source: \`CHART_COPY\` in \`src/utils/chart-data.ts\`; regenerate this file with \`npx tsx scripts/sync-copy-docs.ts\`.**`,
  "",
  "| pairing | title |",
  "|---|---|",
  ...entries.map((e) => `| \`${e.aId}\` + \`${e.bId}\` | ${e.copy.title} |`),
  "",
].join("\n");

const fakeInsight = [
  "# Fake Insight Copy",
  "",
  `Written for the ${count} rendered pairings, not generic templates — tailored copy still reads better than a mail-merge template at this count. **Canonical source: \`CHART_COPY\` in \`src/utils/chart-data.ts\`; regenerate with \`npx tsx scripts/sync-copy-docs.ts\`.**`,
  "",
  "Language check against CLAUDE.md / `.claude/agents/brand-content.md`: none of these assert `proves, causes, drives, predicts, explains, responsible for, significant relationship, evidence that, linked to, associated with`. Safer language throughout: `seems to`, `invites`, `as if`.",
  "",
  ...entries.flatMap((e) => [
    `## \`${e.aId}\` + \`${e.bId}\``,
    "",
    `> ${e.copy.fakeInsight}`,
    "",
  ]),
].join("\n");

const reveal = [
  "# Reveal Copy",
  "",
  `Paired 1:1 with \`docs/content/fake-insight-templates.md\`. Every reveal must make clear the chart doesn't support the fake insight — per CLAUDE.md, non-negotiable. **Canonical source: \`CHART_COPY\` in \`src/utils/chart-data.ts\`; regenerate with \`npx tsx scripts/sync-copy-docs.ts\`.**`,
  "",
  ...entries.flatMap((e) => [
    `## \`${e.aId}\` + \`${e.bId}\``,
    "",
    `> ${e.copy.reveal}`,
    "",
  ]),
].join("\n");

writeFileSync(`${root}docs/content/chart-copy.md`, chartCopy);
writeFileSync(`${root}docs/content/fake-insight-templates.md`, fakeInsight);
writeFileSync(`${root}docs/content/reveal-templates.md`, reveal);
console.log(`Synced 3 docs from ${count} pairings with copy. (labelById has ${labelById.size} entries)`);
