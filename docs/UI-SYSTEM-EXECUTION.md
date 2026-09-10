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
