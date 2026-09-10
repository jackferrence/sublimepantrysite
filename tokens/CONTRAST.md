# Contrast audit

Generated automatically by `scripts/contrast-audit.mjs` (`npm run contrast`) from the actual `public/styles/tokens.css` — not a hand-maintained copy of hex values. **Do not hand-edit this file**; edit `tokens/*.tokens.json`, run `npm run tokens`, then `npm run contrast`.

Thresholds per BRAND.md / `docs/CLAUDE-CODE-PROMPT.md` ground rule 8: **AAA (7:1)** for body and muted text, **AA (4.5:1)** for other text, **AA (3:1)** for non-text UI.

Run 2026-09-10.

## Light

| Pair | Ratio | Threshold | Result |
|---|---|---|---|
| text.body on surface.page (#191713 / #FAF8F4) | 16.87:1 | 7:1 | Pass |
| text.muted on surface.page (#585149 / #FAF8F4) | 7.37:1 | 7:1 | Pass |
| text.body on surface.raised (#191713 / #FFFFFF) | 17.90:1 | 7:1 | Pass |
| text.muted on surface.raised (#585149 / #FFFFFF) | 7.81:1 | 7:1 | Pass |
| action.primaryText on action.primary (#FFFFFF / #8B4A21) | 6.78:1 | 4.5:1 | Pass |
| action.primary on surface.page (#8B4A21 / #FAF8F4) | 6.39:1 | 4.5:1 | Pass |
| border.focus on surface.page (#8B4A21 / #FAF8F4) | 6.39:1 | 3:1 | Pass |
| status.danger on surface.page (#96362F / #FAF8F4) | 6.91:1 | 4.5:1 | Pass |
| status.success on surface.page (#2F694D / #FAF8F4) | 6.09:1 | 4.5:1 | Pass |
| status.info on surface.page (#315F73 / #FAF8F4) | 6.57:1 | 4.5:1 | Pass |

## Dark

| Pair | Ratio | Threshold | Result |
|---|---|---|---|
| text.body on surface.page (#F2EFE9 / #15130F) | 16.17:1 | 7:1 | Pass |
| text.muted on surface.page (#B9AFA2 / #15130F) | 8.58:1 | 7:1 | Pass |
| text.body on surface.raised (#F2EFE9 / #1F1C17) | 14.80:1 | 7:1 | Pass |
| text.muted on surface.raised (#B9AFA2 / #1F1C17) | 7.86:1 | 7:1 | Pass |
| action.primaryText on action.primary (#15130F / #C97A45) | 5.61:1 | 4.5:1 | Pass |
| action.primary on surface.page (#C97A45 / #15130F) | 5.61:1 | 4.5:1 | Pass |
| border.focus on surface.page (#C97A45 / #15130F) | 5.61:1 | 3:1 | Pass |
| status.danger on surface.page (#D98A82 / #15130F) | 6.99:1 | 4.5:1 | Pass |
| status.success on surface.page (#6BAE8B / #15130F) | 7.11:1 | 4.5:1 | Pass |
| status.info on surface.page (#6FA3BD / #15130F) | 6.76:1 | 4.5:1 | Pass |

## Not checked by this script

- `status.warn` (aliased to `action.primary`/rust in both palettes) — same numbers as the `action.primary` rows above.
- `status.indicatorPink` / `status.indicatorBlue` (the `OxygenIndicator` diagram tokens) — these are SVG fills behind label text set in `currentColor`/`text.body`, not text printed directly on them.
- Hover/pressed state variants.
- `border.hairline` — decorative only, never carries meaning alone, so it isn't held to a text-contrast threshold.
