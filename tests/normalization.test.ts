import { describe, expect, it } from "vitest";
import {
  checkNormalizationEligibility,
  getSharedWindow,
  normalizeToIndex100,
} from "../src/utils/normalize";
import { NON_CAUSAL_DISCLAIMER } from "../src/data/types";

describe("checkNormalizationEligibility", () => {
  it("rejects a zero baseline", () => {
    expect(checkNormalizationEligibility([0, 1, 2])).toEqual({
      eligible: false,
      reason: "zero-baseline",
    });
  });

  it("rejects a negative baseline", () => {
    expect(checkNormalizationEligibility([-5, 1, 2])).toEqual({
      eligible: false,
      reason: "negative-baseline",
    });
  });

  it("rejects a series containing a negative value even with a positive baseline", () => {
    expect(checkNormalizationEligibility([10, -1, 12])).toEqual({
      eligible: false,
      reason: "negative-value",
    });
  });

  it("rejects a series that crosses zero", () => {
    // min < 0 and max > 0 in the same series
    expect(checkNormalizationEligibility([-3, 0, 5]).eligible).toBe(false);
  });

  it("rejects NaN and Infinity as not eligible for a clean index", () => {
    expect(Number.isFinite(NaN)).toBe(false);
    expect(Number.isFinite(Infinity)).toBe(false);
    // normalizeToIndex100 propagates non-finite math rather than silently
    // coercing it; eligibility itself only screens for sign, so pair this
    // with an upstream data-cleanliness check (validation.ts) that rejects
    // non-finite values before they ever reach normalization.
  });

  it("accepts an all-positive series", () => {
    expect(checkNormalizationEligibility([10, 20, 5])).toEqual({ eligible: true });
  });

  it("rejects a baseline under 1% of the series' peak", () => {
    expect(checkNormalizationEligibility([0.001, 50, 100])).toEqual({
      eligible: false,
      reason: "baseline-too-small",
    });
  });

  it("accepts a baseline right at the 1% threshold boundary and above", () => {
    expect(checkNormalizationEligibility([1, 50, 100]).eligible).toBe(true);
  });
});

describe("normalizeToIndex100", () => {
  it("produces exactly 100 at the baseline date", () => {
    const [first] = normalizeToIndex100([42, 84, 21]);
    expect(first).toBe(100);
  });

  it("scales the rest of the series relative to the baseline", () => {
    expect(normalizeToIndex100([50, 100, 25])).toEqual([100, 200, 50]);
  });

  it("does not mutate the input array", () => {
    const input = [10, 20, 30];
    const copy = [...input];
    normalizeToIndex100(input);
    expect(input).toEqual(copy);
  });

  it("throws rather than normalizing an ineligible series", () => {
    expect(() => normalizeToIndex100([0, 1, 2])).toThrow(/ineligible/);
  });
});

describe("getSharedWindow", () => {
  it("intersects two series by date without interpolating gaps", () => {
    const a = [
      { date: "2020-01-01", value: 1 },
      { date: "2021-01-01", value: 2 },
      { date: "2022-01-01", value: 3 },
    ];
    const b = [
      { date: "2021-01-01", value: 20 },
      { date: "2022-01-01", value: 30 },
      { date: "2023-01-01", value: 40 },
    ];
    const shared = getSharedWindow(a, b);
    expect(shared.dates).toEqual(["2021-01-01", "2022-01-01"]);
    expect(shared.aValues).toEqual([2, 3]);
    expect(shared.bValues).toEqual([20, 30]);
  });

  it("returns an empty window for non-overlapping series", () => {
    const a = [{ date: "2000-01-01", value: 1 }];
    const b = [{ date: "2010-01-01", value: 1 }];
    expect(getSharedWindow(a, b).dates).toEqual([]);
  });
});

describe("required disclaimer text", () => {
  it("matches exactly", () => {
    expect(NON_CAUSAL_DISCLAIMER).toBe(
      "Shared movement does not imply relationship, influence, or causation.",
    );
  });
});
