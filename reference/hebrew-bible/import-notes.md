# Import Notes

## Raw vs Processed

- `raw/`: immutable (or as-close-as-possible) copies of downloaded source assets.
- `processed/`: normalized outputs produced for Sacred application use.

The `raw/` directory protects provenance and reproducibility. The `processed/` directory supports stable downstream consumption.

## Recommended Import Workflow

1. Download source from the confirmed upstream location.
2. Store the original files in `raw/` without structural edits.
3. Document source URL, access date, version, and license notes.
4. Transform raw data into Sacred’s normalized verse-level format.
5. Store transformed outputs in `processed/`.
6. Record all mapping and normalization decisions (including any numbering crosswalks).

## Future Parser Considerations

- **Verse mapping:** maintain explicit mapping tables where traditions differ.
- **Hebrew diacritics:** define whether niqqud/cantillation are preserved, stripped, or made optional per output profile.
- **RTL display:** ensure right-to-left rendering support in UI and exported formats.
- **Source attribution:** keep attribution metadata attached to datasets and derivative artifacts.
- **Optional morphology layer separation:** isolate morphology/lemma layers when needed to keep license boundaries clear and make enrichment opt-in.
