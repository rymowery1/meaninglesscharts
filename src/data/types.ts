export type DatasetDomain =
  | "economy"
  | "global-indicators"
  | "weather"
  | "environment"
  | "physical-events"
  | "culture-attention"
  | "agriculture"
  | "parks"
  | "other";

export type DatasetFrequency = "daily" | "monthly" | "annual";

export type DatasetVerificationStatus =
  | "approved"
  | "proposed"
  | "needs-source"
  | "needs-verification"
  | "rejected";

export type BiasRisk = "low" | "medium-low" | "medium" | "high" | "NEEDS_VERIFICATION";

export type SeriesProvenance = "script" | "manual-download" | "placeholder";

export type DatasetMeta = {
  id: string;
  label: string;
  sourceOrganization: string | "NEEDS_SOURCE";
  sourceType:
    | "government"
    | "intergovernmental"
    | "academic"
    | "nonprofit"
    | "open-data"
    | "NEEDS_SOURCE";
  sourceUrl: string | "NEEDS_SOURCE";

  domain: DatasetDomain;
  frequency: DatasetFrequency;
  unit: string;
  geography: string;
  dateRange: {
    start: string | "NEEDS_SOURCE";
    end: string | "NEEDS_SOURCE";
  };

  access: "public-api" | "download" | "manual-cache" | "NEEDS_VERIFICATION";
  cost: "free" | "free-with-key" | "NEEDS_VERIFICATION";
  biasRisk: BiasRisk;
  methodologyNotes: string | "NEEDS_SOURCE";
  licenseOrReuseNotes: string | "NEEDS_SOURCE";

  fetchedAt: string | "NEEDS_SOURCE";
  seriesPath: string | "NEEDS_SOURCE";

  verificationStatus: DatasetVerificationStatus;
  launchReady: boolean;
};

export type SeriesPoint = {
  date: string;
  value: number;
};

export type SeriesFile = {
  datasetId: string;
  sourceOrganization: string;
  sourceUrl: string;
  unit: string;
  frequency: DatasetFrequency;
  fetchedAt: string;
  fetchedBy: string;
  provenance: SeriesProvenance;
  points: SeriesPoint[];
};

export type GeneratedChart = {
  id: string;
  title: string;
  datasetA: DatasetMeta;
  datasetB: DatasetMeta;
  points: {
    date: string;
    aOriginal: number;
    bOriginal: number;
    aIndexed: number;
    bIndexed: number;
  }[];
  normalization: "Indexed to 100 at first shared date";
  normalizationBaselineDate: string;
  fakeInsight: string;
  reveal: string;
  disclaimer: "Shared movement does not imply relationship, influence, or causation.";
};

/**
 * Pairing a domain in this list with itself or with its listed partner is
 * blocked because the two plausibly influence each other in reality — see
 * docs/data/pairing-rules.md and additions §12.
 */
export const BLOCKED_DOMAIN_PAIRS: ReadonlyArray<readonly [DatasetDomain, DatasetDomain]> = [
  ["weather", "environment"],
  ["weather", "agriculture"],
  ["weather", "parks"],
  ["weather", "physical-events"],
  ["environment", "agriculture"],
  ["economy", "agriculture"],
  ["economy", "global-indicators"],
  ["economy", "culture-attention"],
  ["physical-events", "environment"],
  ["parks", "culture-attention"],
];

export const MIN_SHARED_POINTS: Record<DatasetFrequency, number> = {
  daily: 14,
  monthly: 6,
  annual: 6,
};

export const NON_CAUSAL_DISCLAIMER =
  "Shared movement does not imply relationship, influence, or causation.";
