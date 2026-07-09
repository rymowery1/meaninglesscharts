import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import datasets from "../src/data/datasets.json";
import type { DatasetMeta, SeriesFile } from "../src/data/types";
import { validateAllDatasets } from "../src/utils/validation";

const rootDir = fileURLToPath(new URL("../", import.meta.url));
const seriesDir = `${rootDir}src/data/series/`;

const typedDatasets = datasets as DatasetMeta[];

function loadSeriesFiles(): SeriesFile[] {
  return readdirSync(seriesDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(`${seriesDir}${f}`, "utf-8")) as SeriesFile);
}

describe("datasets.json structure", () => {
  it("is an array", () => {
    expect(Array.isArray(typedDatasets)).toBe(true);
  });

  it("every dataset has a unique id", () => {
    const ids = typedDatasets.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("series files", () => {
  const seriesFiles = loadSeriesFiles();

  it("every series file has a provenance field with a valid value", () => {
    for (const series of seriesFiles) {
      expect(["script", "manual-download", "placeholder"]).toContain(series.provenance);
    }
  });

  it("no series file has provenance 'placeholder' paired with a launchReady dataset", () => {
    const seriesByDatasetId = new Map(seriesFiles.map((s) => [s.datasetId, s]));
    for (const dataset of typedDatasets) {
      const series = seriesByDatasetId.get(dataset.id);
      if (series?.provenance === "placeholder") {
        expect(dataset.launchReady).toBe(false);
      }
    }
  });

  it("no launch-ready dataset's series file has an empty points array", () => {
    const seriesByDatasetId = new Map(seriesFiles.map((s) => [s.datasetId, s]));
    for (const dataset of typedDatasets.filter((d) => d.launchReady)) {
      const series = seriesByDatasetId.get(dataset.id);
      expect(series?.points.length ?? 0).toBeGreaterThan(0);
    }
  });

  it("every launchReady dataset's seriesPath resolves to a file that exists", () => {
    for (const dataset of typedDatasets.filter((d) => d.launchReady)) {
      expect(dataset.seriesPath).not.toBe("NEEDS_SOURCE");
      expect(existsSync(`${rootDir}${dataset.seriesPath}`)).toBe(true);
    }
  });
});

describe("validateAllDatasets against real project state", () => {
  it("passes — nothing currently claims launchReady without being complete", () => {
    const seriesFiles = loadSeriesFiles();
    const seriesByDatasetId = new Map(seriesFiles.map((s) => [s.datasetId, s]));
    const { valid } = validateAllDatasets(typedDatasets, seriesByDatasetId);
    expect(valid).toBe(true);
  });
});
