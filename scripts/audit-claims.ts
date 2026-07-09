// Scans shipped content and copy for language that could imply a real causal or
// statistical relationship. This is a raw scanner, not a judgment tool: it lists
// every hit with file:line so a human (or the /interpretation-audit skill) can
// classify each one. It does not try to auto-approve/reject matches, because a
// "smart" filter risks quietly hiding a real problem behind a false negative.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("..", import.meta.url));

const RISK_WORDS = [
  "proves",
  "causes",
  "drives",
  "predicts",
  "explains",
  "responsible for",
  "significant relationship",
  "evidence that",
  "linked to",
  "associated with",
  "correlation",
  "causation",
  "statistically significant",
  "trend indicates",
  "data shows",
  "data proves",
];

const SCAN_TARGETS = [
  "docs/content",
  "docs/data/data-methodology.md",
  "docs/data/pairing-rules.md",
  "src/utils/chart-data.ts",
  "src/components",
  "src/pages",
];

const SCAN_EXTENSIONS = [".md", ".ts", ".astro"];

function collectFiles(relPath: string): string[] {
  const fullPath = `${rootDir}${relPath}`;
  const stat = statSync(fullPath, { throwIfNoEntry: false });
  if (!stat) return [];
  if (stat.isFile()) return [fullPath];
  const out: string[] = [];
  for (const entry of readdirSync(fullPath)) {
    const entryRel = `${relPath}/${entry}`;
    const entryFull = `${rootDir}${entryRel}`;
    const entryStat = statSync(entryFull);
    if (entryStat.isDirectory()) {
      out.push(...collectFiles(entryRel));
    } else if (SCAN_EXTENSIONS.some((ext) => entry.endsWith(ext))) {
      out.push(entryFull);
    }
  }
  return out;
}

type Hit = { file: string; line: number; text: string; word: string };

const hits: Hit[] = [];

for (const target of SCAN_TARGETS) {
  for (const file of collectFiles(target)) {
    const lines = readFileSync(file, "utf-8").split("\n");
    lines.forEach((line, i) => {
      const lower = line.toLowerCase();
      for (const word of RISK_WORDS) {
        if (lower.includes(word)) {
          hits.push({ file: file.replace(rootDir, ""), line: i + 1, text: line.trim(), word });
        }
      }
    });
  }
}

if (hits.length === 0) {
  console.log("OK: no risk-word hits found in scanned content.");
  process.exit(0);
}

console.log(`Found ${hits.length} risk-word hit(s). Review each — a hit is not automatically a problem`);
console.log(`(the non-causal disclaimer itself and this project's own policy docs legitimately use these words).\n`);

for (const hit of hits) {
  console.log(`${hit.file}:${hit.line} [${hit.word}]`);
  console.log(`  ${hit.text}`);
}

// This scanner surfaces candidates; it doesn't decide pass/fail. Run
// /interpretation-audit for the classified, human-reviewed version.
process.exit(0);
