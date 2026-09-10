# UI system execution note

Continued 10 September 2026 on branch `work` from the recovered UI-foundation
commit `51607ea` (the earlier cloud report identified the same work as
`4b5a84e`). The supplied archives were inspected recursively before integration;
the nested absorber ZIP and batch-planner tar archive were included in that
inventory. The source archives remain outside the deployed site.

## Migration matrix

| Surface | State | Implementation |
| --- | --- | --- |
| Tokens and type | Complete except package-manager provenance | DTCG source, drift check, Paper/Ice/Rust semantics and optical sizing; npm registry access is recorded separately if the Fontsource install remains unavailable |
| Logo system | Complete | Supplied inline wordmark, roman SP monogram, tagline lockup, social mark, small ghostless favicons and app icons; exact files and checksums retained under `public/brand/approved` |
| Global chrome | Complete | Responsive logo contexts, keyboard-safe navigation/search, cart trigger, tagline footer and policy links |
| Homepage and hubs | Complete | Asymmetric publication lead, three task paths, one featured utility, ruled indexes, supply shelf and honest empty states |
| Article template | Complete | Stable hero/no-hero treatment, answer-first opening, evidence/table treatment, contextual tools, product continuation, sources, related ledger and print behavior |
| Tools department | Complete | Five-tool canonical registry, shared standalone layout/embed components, four supplied calculators plus Batch Log, private state and source-forward defaults |
| Shop and products | Complete where truthful media exists | Edited supply shelf, live Shopify boundary, 55/45 PDP, exact supplier-media mappings, zoom gallery, explicit exact-media-pending state and testing-status rationale |
| Newsletter and utility pages | Complete | Shared readable page layout, operational form states, trust links and a direct 404 route |
| Browser QA | Pending final verification | Capture desktop/mobile views after the last build and inspect overflow, focus, embed and gallery states |
| Live commerce verification | External check | Network/credentials were unavailable in the sandbox; deterministic fail-closed inventory and Shopify fallback remain the tested behavior |

## Tool contract

- `src/lib/tools.ts` is the only registry. A tool is either live with a real
  route or absent; no finished calculator carries a pending flag.
- Calculator arithmetic and source records live in `src/data`. Astro renders a
  useful default answer, and client code imports the same pure functions.
- Absorber, planner, running-cost and trail-meal pages use no storage, cookies or
  off-site requests. Batch Log alone uses disclosed local storage and CSV.
- `ToolLayout.astro` sets embed mode before paint, canonicalizes to the full
  route and leaves `Calculator by Sublime Pantry` visible.
- Analytics declarations around discovery and outbound links never include
  calculator field values or results.

## Product-media workflow

Add a supplier or original image to the asset manifest first. Map it by SKU in
`src/lib/product-media.ts`, include intrinsic dimensions and a high-resolution
zoom source, and label supplier frames as manufacturer media. If an exact image
does not exist, leave the SKU unmapped: `ProductGallery.astro` renders the
explicit pending state. Documentary stock must never enter this map.

## Verification record

The final report records the exact commands and outcomes after the last edit.
Shopify availability failures during local builds are expected to produce the
unstocked fallback and must never be promoted to an in-stock guess.

### 10 September 2026 — continuation session

Picked up from `docs/CODING-SESSION-HANDOFF.md`. Registry DNS was available
this session (it was not in the prior sandbox), so the blocking font item
cleared:

- Installed `@fontsource-variable/bodoni-moda@5.3.0` (exact version, pinned).
  Self-hosted the `wght`-axis latin and latin-ext files under
  `public/fonts/bodoni-moda-variable-*.woff2`, following the project's
  existing self-hosted `@font-face` pattern (no Google Fonts link, no CDN
  import) rather than importing the package's own CSS. Left the `opsz`-axis
  subset unused — combining both axes in one file isn't something Fontsource
  ships, and the wght-only file is what `@fontsource-variable/bodoni-moda`'s
  own default entrypoint (`index.css`) selects.
- `src/styles/tokens.tokens.json`'s `font.family.display` now reads
  `["Bodoni Moda Variable", "serif"]` — dropped `Bodoni Moda` (the static
  fallback name) and `Didot`. Regenerated `public/styles/tokens.css` via
  `npm run tokens`.
- Deleted the two tracked but unreferenced `ibarra-variable*.woff2` files
  from `public/fonts/` — confirmed zero references to "Ibarra" anywhere in
  tracked source first.
- Added a regression test (`tests/header-brand.test.mjs`) asserting the
  package is a declared dependency, `base.css` declares `@font-face` for
  "Bodoni Moda Variable" self-hosted under `/fonts/`, and every referenced
  file actually exists in `public/fonts/`.
- Found and fixed 4 broken internal links surfaced by `check-links.py`
  (pre-existing, not introduced this session): `/guides/mylar-bag-materials`
  → `/guides/what-bag-thickness-actually-means` (title match, wrong slug);
  `/troubleshooting/absorber-did-not-work` → `/troubleshooting/storage-failure`
  (topical match — "Why your stored food failed" covers absorber failure).
  `/guides/sealing-mylar-bags` had no matching article anywhere in
  `src/content/articles/` — rather than point it at content that doesn't
  deliver what the anchor text promises, removed the two links
  (`absorber-calculator.astro`, `batch-planner.astro`) instead of guessing a
  target. A dedicated sealing/seal-check guide remains unwritten.

Command gate, run in full:

```
npm test              # 371/371 pass
npm run tokens:check  # clean
astro build            # 70 pages built (ran directly — astro check
                        # still fails locally against an untracked
                        # `embedded tools/` scratch directory in the
                        # working tree that isn't part of the repo)
npm run check-links    # OK — 70 files, 0 broken links
git diff --check       # clean
```

Browser QA: **partial, not the full matrix.** Ran a Playwright smoke check
against the local preview server — homepage at 1280×900 and 375×800, and
`/tools/absorber-calculator` — confirming `getComputedStyle` resolves
`"Bodoni Moda Variable"` and `document.fonts` reports it loaded (not just
declared and silently falling back), the two corrected links resolve in the
rendered DOM, and no horizontal overflow at 375px. Did not cover the full
320–1440px × 200%-zoom matrix or the full page/state inventory the handoff
specifies (hubs, hero/no-hero articles, all five tools, PDPs, cart,
newsletter/policy/404, focus states, loading/error/empty/sold-out). That
remains open.

Live Shopify Storefront verification: **not done, still gated on
credentials.** No `.env` exists in this working tree. The connected Shopify
MCP tool authenticates against the Admin API (confirmed store: Sublime
Pantry, `shop.sublimepantry.com`) — a different credential from the
Storefront API token `src/lib/commerce.ts` needs at runtime, and not a
substitute for it. Did not fabricate or borrow a token. The deterministic
unstocked fallback is what actually ran during this session's builds, which
is the documented, expected behavior without Storefront credentials — not a
positive verification of live price/inventory/cart/checkout.

Anti-template audit: **not a full pass.** The design hook flagged a
"side-tab accent border" pattern three times across files touched or
adjacent to this session's edits (`base.css`, `absorber-calculator.astro`,
`batch-planner.astro`). Reviewed each: they match an accent-bar motif already
used consistently in the site's SVG troubleshooting diagrams elsewhere
(`storage-failure.json`, `vacuum-error.json`) and predate this session's
changes — not something introduced here, and not flagged as a problem by the
user. Left unchanged. No broader site-wide pass for generic grids, vague CTA
copy, or decorative effects was run this session.
