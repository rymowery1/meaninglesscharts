// Implements docs/data/pairing-rules.md.

import {
  BLOCKED_DOMAIN_PAIRS,
  MIN_SHARED_POINTS,
  type DatasetMeta,
  type SeriesFile,
} from "../data/types";
import { checkNormalizationEligibility, getSharedWindow } from "./normalize";

export type PairingInvalidReason =
  | "same-domain"
  | "blocked-domain-pair"
  | "unapproved-other-domain"
  | "same-source-organization"
  | "frequency-mismatch"
  | "no-overlapping-dates"
  | "insufficient-shared-points"
  | "not-launch-ready"
  | "not-approved"
  | "placeholder-provenance"
  | "normalization-ineligible-a"
  | "normalization-ineligible-b";

export type PairingCheck = {
  valid: boolean;
  reasons: PairingInvalidReason[];
};

function isBlockedDomainPair(domainA: DatasetMeta["domain"], domainB: DatasetMeta["domain"]): boolean {
  return BLOCKED_DOMAIN_PAIRS.some(
    ([x, y]) => (x === domainA && y === domainB) || (x === domainB && y === domainA),
  );
}

/**
 * Checks whether two datasets may be paired. Requires each dataset's
 * corresponding SeriesFile so real overlapping dates, point counts, and
 * normalization eligibility can be checked — not just metadata.
 */
export function checkPairing(
  a: DatasetMeta,
  b: DatasetMeta,
  seriesA: SeriesFile,
  seriesB: SeriesFile,
): PairingCheck {
  const reasons: PairingInvalidReason[] = [];

  if (a.domain === b.domain) {
    reasons.push("same-domain");
  } else if (isBlockedDomainPair(a.domain, b.domain)) {
    reasons.push("blocked-domain-pair");
  }

  if (a.domain === "other" || b.domain === "other") {
    reasons.push("unapproved-other-domain");
  }

  if (a.sourceOrganization === b.sourceOrganization) {
    reasons.push("same-source-organization");
  }

  if (a.frequency !== b.frequency) {
    reasons.push("frequency-mismatch");
  }

  if (!a.launchReady || !b.launchReady) {
    reasons.push("not-launch-ready");
  }

  if (a.verificationStatus !== "approved" || b.verificationStatus !== "approved") {
    reasons.push("not-approved");
  }

  if (seriesA.provenance === "placeholder" || seriesB.provenance === "placeholder") {
    reasons.push("placeholder-provenance");
  }

  // Only check dates/points/normalization if frequencies match — an
  // intersection across mismatched frequencies isn't meaningful.
  if (a.frequency === b.frequency) {
    const shared = getSharedWindow(seriesA.points, seriesB.points);

    if (shared.dates.length === 0) {
      reasons.push("no-overlapping-dates");
    } else {
      const minPoints = MIN_SHARED_POINTS[a.frequency];
      if (shared.dates.length < minPoints) {
        reasons.push("insufficient-shared-points");
      }

      if (!checkNormalizationEligibility(shared.aValues).eligible) {
        reasons.push("normalization-ineligible-a");
      }
      if (!checkNormalizationEligibility(shared.bValues).eligible) {
        reasons.push("normalization-ineligible-b");
      }
    }
  }

  return { valid: reasons.length === 0, reasons };
}

export type ValidPairing = {
  datasetAId: string;
  datasetBId: string;
};

/**
 * Enumerates every valid pairing across a dataset list. Order-independent —
 * each unordered pair is checked once.
 */
export function findValidPairings(
  datasets: DatasetMeta[],
  seriesByDatasetId: Map<string, SeriesFile>,
): ValidPairing[] {
  const valid: ValidPairing[] = [];

  for (let i = 0; i < datasets.length; i++) {
    for (let j = i + 1; j < datasets.length; j++) {
      const a = datasets[i];
      const b = datasets[j];
      const seriesA = seriesByDatasetId.get(a.id);
      const seriesB = seriesByDatasetId.get(b.id);
      if (!seriesA || !seriesB) continue;

      const result = checkPairing(a, b, seriesA, seriesB);
      if (result.valid) {
        valid.push({ datasetAId: a.id, datasetBId: b.id });
      }
    }
  }

  return valid;
}
