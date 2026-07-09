// Implements docs/data/normalization-rules.md.

import type { SeriesPoint } from "../data/types";

export type SharedWindow = {
  dates: string[];
  aValues: number[];
  bValues: number[];
};

export type EligibilityResult =
  | { eligible: true }
  | { eligible: false; reason: "zero-baseline" | "negative-baseline" | "negative-value" | "crosses-zero" };

/**
 * Intersects two series by date. Gaps are represented by the absence of a
 * date, never interpolated/forward-filled/back-filled — see
 * docs/data/normalization-rules.md "Missing values".
 */
export function getSharedWindow(a: SeriesPoint[], b: SeriesPoint[]): SharedWindow {
  const bByDate = new Map(b.map((p) => [p.date, p.value]));
  const dates: string[] = [];
  const aValues: number[] = [];
  const bValues: number[] = [];

  for (const point of [...a].sort((x, y) => x.date.localeCompare(y.date))) {
    if (bByDate.has(point.date)) {
      dates.push(point.date);
      aValues.push(point.value);
      bValues.push(bByDate.get(point.date)!);
    }
  }

  return { dates, aValues, bValues };
}

/**
 * Checks whether a series (restricted to the shared window) is eligible for
 * index-to-100 normalization. Never call normalizeToIndex100 on an
 * ineligible series — reject the pairing instead of working around it.
 */
export function checkNormalizationEligibility(values: number[]): EligibilityResult {
  if (values.length === 0) {
    return { eligible: false, reason: "zero-baseline" };
  }

  const baseline = values[0];
  if (baseline === 0) {
    return { eligible: false, reason: "zero-baseline" };
  }
  if (baseline < 0) {
    return { eligible: false, reason: "negative-baseline" };
  }
  if (values.some((v) => v < 0)) {
    return { eligible: false, reason: "negative-value" };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min < 0 && max > 0) {
    return { eligible: false, reason: "crosses-zero" };
  }

  return { eligible: true };
}

/**
 * Indexes a series to 100 at its first value (the baseline). Full float
 * precision — round only at render time. Does not mutate the input array.
 * Throws if the series is ineligible; callers must check eligibility first.
 */
export function normalizeToIndex100(values: number[]): number[] {
  const eligibility = checkNormalizationEligibility(values);
  if (!eligibility.eligible) {
    throw new Error(`Cannot normalize an ineligible series (reason: ${eligibility.reason})`);
  }
  const baseline = values[0];
  return values.map((v) => (v / baseline) * 100);
}
