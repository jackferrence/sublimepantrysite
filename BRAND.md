# Sublime Pantry — brand contract

This is the contract. `docs/design-research.md` is the why. `docs/CLAUDE-CODE-PROMPT.md` is the plan. When code and this file disagree, this file wins until it's deliberately changed (and the tokens file is the executable form of the colour/type/space rows below — if the two drift, the tokens file is the bug).

Sublime Pantry is a publication first, a shop second: a niche Wirecutter for home freeze-drying, run by one person who tests and fulfils everything himself. Readers are capable adults who already own a $2,000+ freeze dryer. Nothing here should read as "AI-built" — see Appendix A of `docs/CLAUDE-CODE-PROMPT.md` for the explicit banned list.

## Palette — ink / paper / ice / rust

Current values, as they live today in `src/styles/tokens.tokens.json` (`color.brand.*` / `color.semantic.*`). This is a single-tier token file today; `docs/design-research.md` §5 describes the eventual three-tier (global → semantic → component) structure the pipeline should grow into — these hexes are the ones to carry forward into that structure, not new colours to invent.

| Role | Token | Hex |
|---|---|---|
| Ink (text) | `color.brand.ink` | `#000000` |
| White | `color.brand.white` | `#FFFFFF` |
| Paper (page ground) | `color.brand.paper` | `#FAF8F4` |
| Ice (the logo's pale blue — logo ground and the `.sp-ghost` offset only) | `color.brand.ice` | `#B4D9EC` |
| Deep ice | `color.brand.deepIce` | `#7FB6D2` |
| Rust (the one accent, tied to one meaning) | `color.brand.rust` | `#8B4A21` |
| Body text | `color.semantic.text` | `#191713` |
| Muted text | `color.semantic.muted` | `#5D554D` |
| Surface (page) | `color.semantic.surface` | `{color.brand.paper}` → `#FAF8F4` |
| Raised surface | `color.semantic.raised` | `{color.brand.white}` → `#FFFFFF` |
| Warm surface | `color.semantic.warm` | `#F2ECE3` |
| Rust-soft surface | `color.semantic.rustSoft` | `#F1E2D6` |
| Border | `color.semantic.border` | `#D9D1C6` |
| Action | `color.semantic.action` | `{color.brand.rust}` → `#8B4A21` |
| Action hover | `color.semantic.actionHover` | `#6F3517` |
| Info | `color.semantic.info` | `#315F73` |
| Success | `color.semantic.success` | `#2F694D` |
| Danger | `color.semantic.danger` | `#96362F` |

Never a raw hex in a component — always the semantic custom property (`var(--color-semantic-*)` today; `var(--sp-color-*)` once the `--sp-` prefixed pipeline described in the execution prompt exists). Ice is a logo/ghost colour, not a section background — see the note already carried in `public/styles/base.css` next to `--logo-frost`. Rust is the one accent, tied to one meaning: a verdict, a limitation, a warning. Indigo, violet, and purple are banned outright, anywhere in the system.

Dark mode ships via `prefers-color-scheme` only — no toggle. Any dark palette added to the tokens must pass the same contrast audit as light (AAA / 7:1 for body and muted text, AA / 4.5:1 for everything else) before it ships.

## Typeface — four families, each with one job

| Family | Job | Notes |
|---|---|---|
| **Bodoni Moda** (variable, `wght` 400–900, `opsz` 6–96) | Display: headlines, the wordmark, `PullQuote` | Never under 20px. Weight ≥500 between 20–28px. `font-optical-sizing: auto` everywhere except the logo lockup, which pins `opsz`. H1 900 desktop / 800 mobile, H2 800, H3–H4 700 — nothing under 600 in a heading. Tracking −0.015em above 48px. Currently shipped as `Bodoni Moda Variable` in `src/styles/tokens.tokens.json` (`font.family.display`) and self-hosted at `public/fonts/bodoni-moda-variable-latin*.woff2` — this is already correct and should not be re-sourced. |
| **Literata** (variable, has an optical-size axis like Bodoni Moda) | Article prose, `.lead` | Not yet installed in this repo — see `docs/CLAUDE-CODE-PROMPT.md` T1.1/T1.3. Body serif line-height 1.55–1.65. |
| **Source Sans 3** (variable) | Product copy, tables, UI, nav | Already shipped as `font.family.body` in `src/styles/tokens.tokens.json` and self-hosted under `public/fonts/source-sans-3-*.woff2`. Has real tabular figures — use for prices and specs (`font-variant-numeric: tabular-nums`). |
| **Archivo** | Micro labels (`.label` / `Eyebrow`) only | Not yet installed. Uppercase, tracked, step--2, weight 600. |

No Inter, Geist, Roboto, or `system-ui` as a deliberate choice anywhere in the system.

Fluid type scale: Utopia-style, 320→1440px viewport, 16→19px body, ratio 1.2→1.25 (`font.size.step--2 … step-6` once the scale is built out per `docs/design-research.md` §1/§5). Article measure ~68ch (currently `size.measure` = 68ch in the tokens file); product/spec measure narrower, ~56ch.

## Spacing and radius

From `space.*` (8/16/24/32/48/72/96px scale, `space.1`–`space.7`) and `radius.*` (`radius.control` = 3px, `radius.panel` = 8px) in `src/styles/tokens.tokens.json`. Radius 0 is the conceptual default per the execution prompt's Appendix A ("radius 0 by default"); the values currently shipped (3px/8px) are what exists today and should be reconciled toward that ceiling (4px max per ground rule 6) as the token system is extended, not silently overridden. Raw `px` outside the token scale is allowed only for 1–2px borders and outlines.

## Motion

Durations from `motion.*` (`motion.fast` = 140ms, `motion.normal` = 200ms today; ceiling is 300ms per the execution prompt). Everything animated lives inside `@media (prefers-reduced-motion: no-preference)`. No scroll-reveal, no hover-scale, no parallax, no scroll-jacking, no auto-advancing carousels — ever.

## The ghost (`.sp-ghost`)

An offset second copy of a headline, rendered in ice, sitting just behind/beside the ink copy — the logo's own construction technique reused as a typographic device. It appears on: the logo files, the H1 of every page, and `PullQuote`. Nowhere else — never under 24px, never on body text, nav, buttons, or links. On an ice-coloured band (`surface.ice`), wrap it in `.sp-on-ice` so the ghost turns rust instead of disappearing into its own ground.

## Voice and terminology

Use the audience's own vocabulary, verbatim, in copy and in code/comments: *guide*, *the bag*, *absorber*, *puffy-bag test*, *cc rating*, *mil* (bag thickness — 5 / 7 / 7.5 / 10 mil), *food-safe / FDA-compliant*, *oxygen indicator* (pink = absorbed, blue = oxygen present), *moisture at packaging time*.

Never: "transform," "supercharge," "unleash," "effortlessly," "reimagined," "elevate," or any of the other banned phrasing in `docs/CLAUDE-CODE-PROMPT.md` Appendix A. No invented test results, quotes, testimonials, review counts, star ratings, "as seen on" logos, or unsourced shelf-life numbers ("25-year shelf life" claims are treated with explicit skepticism, not repeated as fact). Where content is missing, say so — `<!-- TODO(jack): … -->` plus a visible "Content pending" placeholder in muted text — rather than filling the gap with something invented.

## Imagery, for now

No original photography yet. The system runs on flat two-colour vector packshots (ink stroke, one ice fill, at most one rust accent) for the 8 SKUs, and diagrams (sublimation curve, chamber cutaway, seal steps, puffy-bag test, oxygen indicator chart) as first-class content — not filler. See `docs/design-research.md` §2 for the full imagery spec (ratios per slot, the manifest schema, the no-faces / no-Editorial-license rules) before any stock photography is purchased.

---

*This file describes the intended full system per `docs/design-research.md` and `docs/CLAUDE-CODE-PROMPT.md`. Where it names files, tokens, or components that do not exist in the repo yet (Literata, Archivo, the `--sp-` prefix, `.sp-ghost`, the three-tier token split), treat this as the target state the rebuild is working toward, not a claim about what ships today. `docs/DECISIONS.md` tracks the actual, current state of the migration.*
