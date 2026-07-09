import { describe, expect, it } from "vitest";
import { checkPairing } from "../src/utils/pairings";
import { BLOCKED_DOMAIN_PAIRS, MIN_SHARED_POINTS, type DatasetDomain, type DatasetMeta, type SeriesFile } from "../src/data/types";

// Synthetic fixtures for exercising the pairing rules in isolation — not
// real datasets, never written to src/data/.
function makeDataset(overrides: Partial<DatasetMeta> = {}): DatasetMeta {
  return {
    id: "test-dataset",
    label: "Test Dataset",
    sourceOrganization: "Test Org A",
    sourceType: "government",
    sourceUrl: "https://example.com/api",
    domain: "economy",
    frequency: "annual",
    unit: "units",
    geography: "Test",
    dateRange: { start: "2000-01-01", end: "2020-01-01" },
    access: "public-api",
    cost: "free",
    biasRisk: "low",
    methodologyNotes: "Test methodology",
    licenseOrReuseNotes: "Test license",
    fetchedAt: "2026-01-01T00:00:00.000Z",
    seriesPath: "src/data/series/test-dataset.json",
    verificationStatus: "approved",
    launchReady: true,
    ...overrides,
  };
}

function makeSeries(overrides: Partial<SeriesFile> = {}): SeriesFile {
  const frequency = overrides.frequency ?? "annual";
  const count = Math.max(MIN_SHARED_POINTS[frequency] + 2, 8);
  const points = Array.from({ length: count }, (_, i) => ({
    date: `${2000 + i}-01-01`,
    value: 10 + i,
  }));
  return {
    datasetId: "test-dataset",
    sourceOrganization: "Test Org A",
    sourceUrl: "https://example.com/api",
    unit: "units",
    frequency,
    fetchedAt: "2026-01-01T00:00:00.000Z",
    fetchedBy: "scripts/fetch-data/test.ts",
    provenance: "script",
    points,
    ...overrides,
  };
}

describe("checkPairing — a well-formed pairing passes", () => {
  it("passes with no violations", () => {
    const a = makeDataset({ id: "a", domain: "economy", sourceOrganization: "Org A" });
    const b = makeDataset({ id: "b", domain: "weather", sourceOrganization: "Org B" });
    const result = checkPairing(a, b, makeSeries({ datasetId: "a" }), makeSeries({ datasetId: "b" }));
    expect(result).toEqual({ valid: true, reasons: [] });
  });
});

describe("checkPairing — BLOCKED_DOMAIN_PAIRS", () => {
  it.each(BLOCKED_DOMAIN_PAIRS)("rejects %s + %s in both orders", (domainA, domainB) => {
    const a = makeDataset({ id: "a", domain: domainA, sourceOrganization: "Org A" });
    const b = makeDataset({ id: "b", domain: domainB, sourceOrganization: "Org B" });
    const seriesA = makeSeries({ datasetId: "a" });
    const seriesB = makeSeries({ datasetId: "b" });

    expect(checkPairing(a, b, seriesA, seriesB).reasons).toContain("blocked-domain-pair");
    expect(checkPairing(b, a, seriesB, seriesA).reasons).toContain("blocked-domain-pair");
  });
});

describe("checkPairing — same-domain and same-org", () => {
  it("rejects same-domain pairs", () => {
    const a = makeDataset({ id: "a", domain: "economy", sourceOrganization: "Org A" });
    const b = makeDataset({ id: "b", domain: "economy", sourceOrganization: "Org B" });
    const result = checkPairing(a, b, makeSeries({ datasetId: "a" }), makeSeries({ datasetId: "b" }));
    expect(result.reasons).toContain("same-domain");
  });

  it("rejects same sourceOrganization pairs even across permitted domains", () => {
    const a = makeDataset({ id: "a", domain: "economy", sourceOrganization: "Shared Org" });
    const b = makeDataset({ id: "b", domain: "weather", sourceOrganization: "Shared Org" });
    const result = checkPairing(a, b, makeSeries({ datasetId: "a" }), makeSeries({ datasetId: "b" }));
    expect(result.reasons).toContain("same-source-organization");
  });
});

describe("checkPairing — frequency and date overlap", () => {
  it("rejects mismatched frequencies", () => {
    const a = makeDataset({ id: "a", domain: "economy", frequency: "annual", sourceOrganization: "Org A" });
    const b = makeDataset({ id: "b", domain: "weather", frequency: "monthly", sourceOrganization: "Org B" });
    const result = checkPairing(
      a,
      b,
      makeSeries({ datasetId: "a", frequency: "annual" }),
      makeSeries({ datasetId: "b", frequency: "monthly" }),
    );
    expect(result.reasons).toContain("frequency-mismatch");
  });

  it("rejects non-overlapping dates", () => {
    const a = makeDataset({ id: "a", domain: "economy", sourceOrganization: "Org A" });
    const b = makeDataset({ id: "b", domain: "weather", sourceOrganization: "Org B" });
    const seriesA = makeSeries({
      datasetId: "a",
      points: [{ date: "1980-01-01", value: 1 }, { date: "1981-01-01", value: 2 }],
    });
    const seriesB = makeSeries({
      datasetId: "b",
      points: [{ date: "2020-01-01", value: 1 }, { date: "2021-01-01", value: 2 }],
    });
    const result = checkPairing(a, b, seriesA, seriesB);
    expect(result.reasons).toContain("no-overlapping-dates");
  });

  it("rejects a shared window below the frequency minimum", () => {
    const a = makeDataset({ id: "a", domain: "economy", sourceOrganization: "Org A" });
    const b = makeDataset({ id: "b", domain: "weather", sourceOrganization: "Org B" });
    // Only 2 shared annual points; MIN_SHARED_POINTS.annual is 6.
    const seriesA = makeSeries({
      datasetId: "a",
      points: [{ date: "2019-01-01", value: 1 }, { date: "2020-01-01", value: 2 }],
    });
    const seriesB = makeSeries({
      datasetId: "b",
      points: [{ date: "2019-01-01", value: 1 }, { date: "2020-01-01", value: 2 }],
    });
    const result = checkPairing(a, b, seriesA, seriesB);
    expect(result.reasons).toContain("insufficient-shared-points");
  });
});

describe("checkPairing — provenance and domain gates", () => {
  it("rejects a placeholder-provenance dataset", () => {
    const a = makeDataset({ id: "a", domain: "economy", sourceOrganization: "Org A" });
    const b = makeDataset({ id: "b", domain: "weather", sourceOrganization: "Org B" });
    const seriesA = makeSeries({ datasetId: "a", provenance: "placeholder", points: [] });
    const seriesB = makeSeries({ datasetId: "b" });
    const result = checkPairing(a, b, seriesA, seriesB);
    expect(result.reasons).toContain("placeholder-provenance");
    expect(result.valid).toBe(false);
  });

  it("never allows an 'other'-domain dataset without explicit approval", () => {
    const a = makeDataset({ id: "a", domain: "other" as DatasetDomain, sourceOrganization: "Org A" });
    const b = makeDataset({ id: "b", domain: "weather", sourceOrganization: "Org B" });
    const result = checkPairing(a, b, makeSeries({ datasetId: "a" }), makeSeries({ datasetId: "b" }));
    expect(result.reasons).toContain("unapproved-other-domain");
    expect(result.valid).toBe(false);
  });

  it("rejects a dataset that isn't launchReady or approved", () => {
    const a = makeDataset({ id: "a", domain: "economy", sourceOrganization: "Org A", launchReady: false, verificationStatus: "needs-verification" });
    const b = makeDataset({ id: "b", domain: "weather", sourceOrganization: "Org B" });
    const result = checkPairing(a, b, makeSeries({ datasetId: "a" }), makeSeries({ datasetId: "b" }));
    expect(result.reasons).toContain("not-launch-ready");
    expect(result.reasons).toContain("not-approved");
  });
});

describe("checkPairing — normalization eligibility gate", () => {
  it("rejects a pairing when one series crosses zero (mirrors the real GDP-growth finding)", () => {
    const a = makeDataset({ id: "a", domain: "economy", sourceOrganization: "Org A" });
    const b = makeDataset({ id: "b", domain: "weather", sourceOrganization: "Org B" });
    const seriesA = makeSeries({
      datasetId: "a",
      points: [
        { date: "2018-01-01", value: 2 },
        { date: "2019-01-01", value: 3 },
        { date: "2020-01-01", value: -1 }, // negative — ineligible
        { date: "2021-01-01", value: 4 },
        { date: "2022-01-01", value: 5 },
        { date: "2023-01-01", value: 6 },
      ],
    });
    const seriesB = makeSeries({
      datasetId: "b",
      points: [
        { date: "2018-01-01", value: 10 },
        { date: "2019-01-01", value: 11 },
        { date: "2020-01-01", value: 12 },
        { date: "2021-01-01", value: 13 },
        { date: "2022-01-01", value: 14 },
        { date: "2023-01-01", value: 15 },
      ],
    });
    const result = checkPairing(a, b, seriesA, seriesB);
    expect(result.reasons).toContain("normalization-ineligible-a");
    expect(result.valid).toBe(false);
  });
});
