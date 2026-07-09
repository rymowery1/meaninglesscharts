# src/data/series/

Time-series JSON files live here, one per dataset, matching the `SeriesFile` type in `src/data/types.ts`.

Every file here must be written by a script in `scripts/fetch-data/` (or, for `provenance: "manual-download"`, hand-converted from a real downloaded file with a matching entry in `docs/data/source-verification-log.md`). Nobody — human or Claude — hand-writes numeric values into a file in this directory. See CLAUDE.md's "Data Acquisition Model" section.

Empty as of Phase 1. Populated starting in Phase 4.
