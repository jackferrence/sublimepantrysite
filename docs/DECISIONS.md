# Decisions log — design-system rebuild

Started 2026-09-10, branch `redesign/design-system` off `origin/main` at `9b4d8d6` ("Complete the Sublime Pantry editorial commerce overhaul (#54)").

## STOP — read this before doing any Phase 1+ work

The task brief I was given describes a repo state ("no `BRAND.md`, no `docs/design-research.md`, tokens still single-tier, Literata/Archivo not installed, logo kit still an untracked zip at repo root, `src/lib/commerce.ts` unread, no content collections beyond `src/content/`") that **does not match what is actually on `main` right now.** That description was accurate for an *earlier* snapshot of this repo, but `main` at `9b4d8d6` already contains a completed, tested implementation from a separate "codex" session that covers most of what `docs/CLAUDE-CODE-PROMPT.md` Phase 1 asks for:

- **Logo kit: already integrated, not an untracked zip.** `docs/LOGO-KIT-INVENTORY.json` (155 lines, SHA-256 per file) shows the exact `sublimepantry-logo-kit` contents — wordmark (inline/stacked × ink-ice/ink-rust/rust-ice/solid-ink/solid-white/white-ice), monogram, tagline lockup, favicons, app icons, social mark — already installed under `public/brand/approved/`, mapped in `src/lib/media.ts`, and consumed by `src/components/BrandBlock.astro`. `tests/header-brand.test.mjs` pins this (accessible name, `sr-only` brand text, decorative `alt=""` on the artwork, file-existence check against `dist/`) and passes.
- **Bodoni Moda Variable: already self-hosted correctly**, per `docs/UI-SYSTEM-EXECUTION.md`'s "10 September 2026 — continuation session" entry: `@fontsource-variable/bodoni-moda@5.3.0` pinned exact, woff2 files under `public/fonts/bodoni-moda-variable-*.woff2`, `@font-face` in `public/styles/base.css`, Ibarra/Didot references removed from `src/styles/tokens.tokens.json`.
- **Tokens/build pipeline**: still the single-tier `src/styles/tokens.tokens.json` → `scripts/generate-tokens.mjs` → `public/styles/tokens.css` pipeline (matches what I was told), with `npm run tokens:check` wired into `npm run build`.
- **Content, tools, commerce**: `src/content/articles/`, `src/lib/commerce.ts`, `src/lib/product-media.ts`, five working calculators under `src/pages/tools/` (`tools.ts` registry, `ToolLayout.astro`), a shop/PDP implementation with an explicit "exact-media-pending" state rather than stock-photo filler, and 34 docs already written (`docs/ART-DIRECTION.md`, `docs/ASSET-LIBRARY.md`, `docs/COMMERCE-ARCHITECTURE.md`, `docs/COMMERCIAL-INTERNAL-LINKING.md`, `docs/CUSTOMER-LIFECYCLE.md`, etc.) describing an already-built editorial/commerce system with its own vocabulary and conventions.
- **Verified this session, on this branch, before touching anything**: `npm run build` succeeds (70 pages), `npm test` passes **371/371**.

None of this was rebuilt from the `docs/CLAUDE-CODE-PROMPT.md` I was handed — it predates it, built independently against `docs/ART-DIRECTION.md` and the other docs above, which encode a related but not identical set of decisions (their own logo-kit-derived palette/lockup rules, their own "exact media vs. documentary stock" imagery policy, their own tools/commerce architecture notes). It is thorough, tested, and — per its own art-direction doc — already anti-template-audited at least once.

**I did not proceed into Phase 1 (fonts, token pipeline, layout shell, header/footer) given this.** Executing T1.1–T1.6 as written would mean re-doing font installation that is already done correctly, re-touching a header/brand block that is already tested and working, and layering a second design vocabulary (Literata/Archivo, `.sp-ghost`, the `--sp-` prefix, three-tier tokens) on top of a system that already shipped its own — on the assumption that the brief's repo-state notes were current, when they demonstrably are not for the biggest, least-reversible items (brand assets, fonts). That is exactly the kind of decision ground rule 2 in `docs/CLAUDE-CODE-PROMPT.md` reserves as **STOP**, not something to resolve unilaterally and keep going.

**What I did instead, this session:**
1. Wrote `docs/design-research.md` and `docs/CLAUDE-CODE-PROMPT.md` verbatim, as supplied — they are now in the repo as the source-of-truth documents the brief asked for.
2. Wrote `BRAND.md`, summarizing the brand contract from the *currently shipped* tokens (`src/styles/tokens.tokens.json`) — real hex values, the four-typeface intent, the `.sp-ghost` rule, voice/terminology — while being explicit in its own closing note that it describes the target state from the new docs, not a claim that Literata/Archivo/the `--sp-` prefix/three-tier tokens exist yet.
3. Created `redesign/design-system` off `origin/main` (not off `work` — `work`'s tip and `main`'s tip currently point at identical tree content per `git diff --stat origin/main origin/work`, so branching off `main` does not lose anything `work` has).
4. Ran the inventory above and confirmed build/test are green before making any further change.

**What needs Jack's decision before Phase 1 proceeds:**
- Should this rebuild treat the already-shipped `ART-DIRECTION.md` / `ASSET-LIBRARY.md` / `COMMERCE-ARCHITECTURE.md` system as the baseline to *evolve* toward the new `docs/design-research.md` vision (Literata, Archivo, three-tier tokens, `.sp-ghost`, the whole Phase 2–6 component set), reconciling the two vocabularies file-by-file? Or does the new research supersede and replace the existing art-direction docs outright (in which case: what happens to the already-integrated logo kit, which the new prompt's T1.6 note assumed was still untracked and needed inventorying — it's already inventoried, differently, in `docs/LOGO-KIT-INVENTORY.json`)?
- The existing system already has an imagery policy (`docs/ART-DIRECTION.md`: exact media for products, documentary stock for context, explicit "exact-media-pending" states, no staged testing photography) that overlaps but doesn't exactly match `docs/design-research.md` §2 (Stocksy-by-default, batch-grade treatment, vector packshots + diagrams). These need to be reconciled by a human, not silently picked between.
- `docs/CODING-SESSION-HANDOFF.md` lists open items from that prior session (full 320–1440px×200%-zoom browser QA matrix not run, live Shopify Storefront verification not done, full anti-template audit not run) that are still open and relevant regardless of which direction this rebuild takes.

## Repo inventory (as found, `main` @ `9b4d8d6`)

| Area | State |
|---|---|
| Tokens | `src/styles/tokens.tokens.json` (single-tier DTCG-shaped) → `scripts/generate-tokens.mjs` → `public/styles/tokens.css`, checked via `npm run tokens:check` in the build script. |
| Fonts | Bodoni Moda Variable (display) and Source Sans 3 (body) self-hosted under `public/fonts/`, `@font-face` in `public/styles/base.css`. Literata and Archivo not present. |
| Brand assets | `public/brand/approved/` — full supplied logo kit, inventoried with checksums in `docs/LOGO-KIT-INVENTORY.json`, mapped in `src/lib/media.ts`, rendered by `src/components/BrandBlock.astro`. |
| Layouts | `src/layouts/BaseLayout.astro`, `ArticleLayout.astro`, `PageLayout.astro`, `ToolLayout.astro` — already built out, not scaffolding. |
| Content | `src/content.config.ts` + `src/content/articles/*.json`; no separate `guides`/`recipes` collections yet — articles are one collection today. |
| Commerce | `src/lib/commerce.ts` (Shopify Storefront config/types), `src/lib/product-media.ts`, `src/components/ShopifyStore.astro`, `CartDrawer.astro` — implemented, gracefully degrades when Shopify is unreachable (deterministic "unstocked" fallback, verified this session had no Storefront credentials available and did not block the build). |
| Tools/calculators | Five tools (`absorber-calculator`, `batch-planner`, `running-cost`, `trail-meal-cost`, batch log) live under `src/pages/tools/`, registered in `src/lib/tools.ts`, shelled by `ToolLayout.astro`. These already substantially satisfy `docs/CLAUDE-CODE-PROMPT.md` T3.13's intent. |
| Tests | `tests/*.test.mjs`, 371 tests, all passing against a fresh `npm run build`. Includes `tests/header-brand.test.mjs`, which is the one the brief specifically warned me not to break. |
| Docs | 20 files already in `docs/`, including `docs/UI-SYSTEM-EXECUTION.md` (a migration ledger analogous in spirit to this file) and `docs/CODING-SESSION-HANDOFF.md` (the prior session's own handoff, dated today, pointing at a `work` branch whose tip is tree-identical to `main`'s). |
| Untracked scratch | `sublimepantry-logo-kit.zip` / `sublimepantry-logo-kit/` and `embedded tools.zip` / `embedded tools/` exist as untracked files in the **main working copy** the user is using interactively, but **not in this git worktree** — worktrees only see tracked content plus their own untracked files, so I could not inventory them directly here even if the STOP above were resolved in favor of re-inventorying. `docs/LOGO-KIT-INVENTORY.json` already recorded their contents (with checksums) before this session started. |

## Verification run this session

```
npm run build   # 70 pages, clean
npm test        # 371 tests, 371 pass, 0 fail
```

No files outside `docs/design-research.md`, `docs/CLAUDE-CODE-PROMPT.md`, `BRAND.md`, and this file were modified this session.

## Where this session stopped / what's left

Everything in `docs/CLAUDE-CODE-PROMPT.md` Phase 1 through Phase 6 (T1.1 through T6.3) is **not started**, pending Jack's call on the STOP item above. Once that's resolved, the right next step is almost certainly *not* "run T1.1–T1.6 as literally written" — it's a reconciliation pass: read `docs/ART-DIRECTION.md`, `docs/ASSET-LIBRARY.md`, `docs/COMMERCE-ARCHITECTURE.md`, `docs/UI-SYSTEM-EXECUTION.md`, and `docs/CODING-SESSION-HANDOFF.md` in full, decide which parts of the new `docs/design-research.md` vision are additive (Literata/Archivo, three-tier tokens, `.sp-ghost`, the Phase 3 component set, the a11y/CI gates in Phase 5) versus which conflict with what's already shipped and tested (the imagery policy, the existing brand-block implementation, the existing tools architecture), and only then start implementing — task by task, with the same "evolve, don't replace" discipline the brief's own repo-state notes asked for, now applied to a repo that turned out to be further along than those notes assumed.
