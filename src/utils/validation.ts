// Implements the "Dataset Validation Rules" from the build plan (§11): a
// dataset that claims to be launchReady must actually be complete. A
// dataset that isn't launchReady is allowed to be incomplete — that's the
// normal, expected state for anything still proposed/needs-source/
// needs-verification.

import type { DatasetFrequency, DatasetMeta, SeriesFile } from "../data/types";

export type DatasetValidationResult = {
  valid: boolean;
  errors: string[];
};

const FREQUENCY_DATE_PATTERNS: Record<DatasetFrequency, RegExp> = {
  annual: /^\d{4}-01-01$/,
  monthly: /^\d{4}-\d{2}-01$/,
  daily: /^\d{4}-\d{2}-\d{2}$/,
};

function isNeedsSource(value: unknown): boolean {
  return value === "NEEDS_SOURCE";
}

export function validateDataset(meta: DatasetMeta, seriesFile: SeriesFile | undefined): DatasetValidationResult {
  const errors: string[] = [];

  // A dataset that isn't claiming to be launch-ready is allowed to be
  // incomplete — that's not an error, it's the honest default state.
  if (!meta.launchReady) {
    return { valid: true, errors };
  }

  if (meta.verificationStatus !== "approved") {
    errors.push(`launchReady is true but verificationStatus is "${meta.verificationStatus}", not "approved"`);
  }

  const requiredStringFields: (keyof DatasetMeta)[] = [
    "sourceOrganization",
    "sourceUrl",
    "methodologyNotes",
    "licenseOrReuseNotes",
    "fetchedAt",
    "seriesPath",
  ];
  for (const field of requiredStringFields) {
    if (isNeedsSource(meta[field])) {
      errors.push(`launchReady is true but ${field} is still NEEDS_SOURCE`);
    }
  }
  if (isNeedsSource(meta.dateRange.start)) {
    errors.push("launchReady is true but dateRange.start is still NEEDS_SOURCE");
  }
  if (isNeedsSource(meta.dateRange.end)) {
    errors.push("launchReady is true but dateRange.end is still NEEDS_SOURCE");
  }

  if (!seriesFile) {
    errors.push(`launchReady is true but no series file was found at ${meta.seriesPath}`);
    return { valid: errors.length === 0, errors };
  }

  if (seriesFile.provenance === "placeholder") {
    errors.push("launchReady is true but series file provenance is \"placeholder\"");
  }

  if (seriesFile.points.length === 0) {
    errors.push("launchReady is true but series file has no points");
  }

  for (const point of seriesFile.points) {
    if (typeof point.value !== "number" || !Number.isFinite(point.value)) {
      errors.push(`series file contains a non-numeric or non-finite value at ${point.date}`);
      break;
    }
  }

  const datePattern = FREQUENCY_DATE_PATTERNS[meta.frequency];
  for (const point of seriesFile.points) {
    if (!datePattern.test(point.date)) {
      errors.push(`series file date "${point.date}" does not match the ${meta.frequency} date format`);
      break;
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateAllDatasets(
  datasets: DatasetMeta[],
  seriesByDatasetId: Map<string, SeriesFile>,
): { valid: boolean; results: { id: string; result: DatasetValidationResult }[] } {
  const results = datasets.map((meta) => ({
    id: meta.id,
    result: validateDataset(meta, seriesByDatasetId.get(meta.id)),
  }));
  return { valid: results.every((r) => r.result.valid), results };
}
