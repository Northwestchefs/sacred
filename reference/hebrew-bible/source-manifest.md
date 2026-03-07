# Hebrew Bible Source Manifest (Canonical)

## Overview

This document is the human-readable companion to `source-manifest.json`. It defines Sacred's canonical source metadata layer for Hebrew Bible reference data.

Purpose:
- keep provenance and licensing decisions explicit,
- make unknowns visible,
- give importer and reader tooling a single source of truth before any production data import.

## Candidate Source

Current candidate source line:
- **Open Scriptures Hebrew Bible / Westminster Leningrad Codex (WLC)**

This remains a **candidate** until Sacred records and verifies the exact official source URL, download path, and release identifier.

## Current Status

Status: **candidate**

Known vs unconfirmed:
- Known (current repository understanding):
  - WLC text is understood to be public domain.
  - Open Scriptures lemma/morphology annotations are understood to be CC BY 4.0.
- Unconfirmed (must be verified from upstream documentation before import):
  - Official source URL and canonical download URL.
  - Exact release/version pin (tag, commit, or date-based release marker).
  - Final selected source file format for Sacred raw ingestion.

Where wording is not final, treat all licensing and source claims as **to be confirmed from official source documentation**.

## Source Details

The machine-readable manifest in `source-manifest.json` records:
- source identity fields (`name`, `provider`, URLs, version, release date),
- content metadata (text tradition, script, optional annotation capabilities),
- technical expectations (UTF-8, RTL handling, numbering policy),
- verification checkpoints and open questions.

Unknown scalar fields are intentionally set to `null` until confirmed.

## Licensing Snapshot

Current understanding (not yet final):
- **Text layer (WLC line):** public domain (to be confirmed from official source documentation).
- **Annotation layers (e.g., lemma/morphology):** CC BY 4.0 (to be confirmed from official source documentation).

Implementation constraints:
- Do not assume attribution terms are complete until exact upstream wording is captured.
- Do not merge annotation layers into bundled outputs carelessly.
- Keep annotation provenance and attribution metadata separable and explicit.
- Verify compatibility before combining text and third-party annotation layers in distributable artifacts.

## Technical Notes

- Sacred importers should preserve upstream chapter/verse numbering as-is.
- Hebrew processing must support UTF-8 and right-to-left rendering requirements.
- Handling for niqqud and cantillation is intentionally undecided and must be formalized in importer profiles.
- Raw assets should remain immutable; normalization decisions belong in processed outputs with traceable metadata.

## Verse Numbering Considerations

Hebrew/Jewish chapter and verse numbering may differ from common English Christian numbering traditions in some passages.

Required project behavior:
- preserve source numbering in canonical storage,
- avoid renumbering source references,
- provide explicit mapping metadata for alternate traditions when needed.

Future importer and reader code should preserve source numbering and optionally apply crosswalk mappings at query/render time rather than mutating canonical references.

## Open Questions

1. Which exact upstream URL will be pinned as Sacred's canonical source endpoint?
2. Which release identifier (tag/commit/date) will Sacred treat as the first locked import target?
3. Which raw format (XML/JSON/plain text) should be selected for canonical ingestion?
4. What exact attribution text is required for any annotation layers used?
5. How will numbering crosswalk metadata be versioned and tested?

## Next Steps

1. Confirm official upstream source documentation and record canonical URLs in `source-manifest.json`.
2. Confirm license text and attribution requirements with exact wording and links.
3. Choose and record a pinned release/version reference.
4. Decide the initial canonical raw format and add importer expectations.
5. Build an importer scaffold that reads `source-manifest.json` and enforces verification gates before processing.
