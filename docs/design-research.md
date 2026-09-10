# sublimepantry.com — design-system research, September 2026

This is the "why" behind the rebuild. `BRAND.md` is the contract, `tokens/` is the source of truth, `docs/CLAUDE-CODE-PROMPT.md` is the plan. Read this when a decision in those files looks arbitrary — it usually is not.

Five research tracks were run fresh; the earlier evidence-based audit (Baymard / NN/g / GEO, the 100-point rubric) is not repeated here and is still valid for trust signals, CRO, PDP hierarchy, mobile and GEO. What follows is what changed with the new business facts: **no original photography for now**, **one operator who fulfils everything**, **editorial first, commerce second**, and the **sublimation identity** (Bodoni Moda wordmark, ink/paper/ice/rust).

---

## 0. Calls made on the open questions

| Question | Decision | Why |
|---|---|---|
| Body typeface | **Literata** (article prose) + **Source Sans 3** (product copy, tables, UI), Archivo kept for micro labels | Literata has an optical-size axis like Bodoni Moda, so the whole system breathes the same way across sizes; Source Sans 3 has real tabular figures for prices and specs. Source Serif 4 was the runner-up — cooler, more "review-site"; Literata's warmth fits food. Ibarra Real Nova and the old Source Sans are retired. |
| Dark mode | **Ship it, `prefers-color-scheme` only, no toggle** | The dark palette is already sunk cost in the tokens; text-heavy guides are read at night; a toggle is UI surface, state and testing for little gain. Contrast re-audited on the dark palette (`tokens/CONTRAST.md`). |
| Scope | **Whole site, store pages included** | Product pages go through the same layouts and tokens as articles. That is what makes commerce feel native to a publication rather than bolted on. |
| Photography gap | **Vector packshots + two-colour technical diagrams now; premium stock under one batch grade; real photography later without changing the system** | See §2. |
| Reference sites | REI's Cedar (Stuart + Graphik) is the only reference whose type we could verify; Wirecutter and Food52 were read from secondary sources | Their *structure* is what we borrow, not their fonts. |

---

## 1. Typography — a Didone on screen without it breaking

**Bodoni Moda is built for this.** It is the Google Fonts cut of Indestructible Type's "Bodoni*", designed with true optical-size masters precisely so hairlines survive at screen sizes. The variable font carries `wght` 400–900 and `opsz` 6–96.

Rules that came out of it (all encoded in tokens):

- Never render Bodoni Moda under **20px**. Between 20 and 28px use weight **≥500**. Above ~28px it is reliably crisp.
- Leave `font-optical-sizing: auto` on everywhere. Only pin `opsz` on the logo lockup, which must look identical at every rendered size.
- H1 **900** desktop / **800** mobile; H2 800; H3–H4 700; nothing under 600 in a heading.
- Tracking **−0.015em** above 48px, ~0 to +0.005em at 20–28px. Line-height 1.05–1.15 single-line display, 1.2 wrapping.
- Body serif 1.55–1.65 line-height (serifs want more than sans at the same size).

**Fluid scale (Utopia, 320→1440px, 16→19px body, ratio 1.2→1.25)** is in `tokens/global.tokens.json` as `font.size.step--2 … step-6`. Article measure **60–75ch** (token: 68ch); product/spec measure **45–60ch** (token: 56ch). The body column defines the grid, not the hero.

**Loading.** Fontsource variable packages, latin subset, woff2 only, `font-display: swap`. Preload exactly one file: the Bodoni Moda variable font used by the hero H1. Generate metric-matched fallbacks (Fontaine, or Astro's fonts API when stable) for all four families so a font swap moves nothing: CLS stays 0.

**What the references actually use.** REI (Cedar): Stuart (custom serif) headings, Graphik body. NYT properties: nyt-cheltenham / nyt-franklin / nyt-karnak — whether Wirecutter's subsection shares that exact stack is unverified. Food52: unverified. None of this changes our choices; the takeaway is that all three pair a characterful display face with a quiet text face and let the body column set the page.

---

## 2. Imagery without a camera

**The seam is hidden by treatment, not selection.** Editorial brands that run on stock apply one mechanical pass to everything after purchase so unrelated shoots converge:

- White-balance window at intake (reject warmer than ~4800K or cooler than ~6500K); target neutral-to-cool to sit with ice.
- One lighting rule per slot (hero: soft daylight from camera-left; workbench: flat top light), one camera angle per slot (overhead for process, 3/4 for workbench, straight-on for packshots).
- **One batch grade at ingest**, baked into the delivered AVIF/WebP: desaturate 10–15%, lift blacks, split-tone shadows toward deep ice and highlights toward paper. Not a flat colour overlay — texture stays. CSS/SVG duotone is reserved for hover states only.
- **No faces.** Hands doing a task only. Faces are the fastest "different shoots" tell and carry model-release risk.
- **Fixed ratios per slot**: hero 16:9, card 4:5, inline 3:2, packshot 1:1 — tokens plus a CI check, not convention.
- Crop for the layout: leave negative space on the side where the text column sits.

**Sources.** Stocksy by default for anything with hands in frame (all model-released; standard licence covers site use; Enhanced only if printed on a product). Adobe Stock or Unsplash+ for textures and backdrops that get graded anyway. **Never** anything flagged Editorial (Getty/iStock/Shutterstock/Stocksy Editorial) on any page that sells.

**What carries the site instead:** freeze-drying is diagrammatic. Sublimation curve, chamber cutaway, sealing steps, "what freeze-drying removes", the puffy-bag test, the oxygen-indicator colour chart. Spec: **2px stroke**, ink line on paper, ice-100 as the single fill, rust for one accent per diagram, never more than two fills, patent-drawing flatness. Diagrams are first-class content, not filler. The 8 SKUs get **flat vector packshots** in the same spec now; 3D renders (~$150–300 each) or phone photography can replace them later without touching anything else.

**Manifest.** `src/data/images.json`, one row per purchased asset, controlled `restrictions` vocabulary (`editorial-only`, `no-merch-without-enhanced-license`, `no-sensitive-use`, `attribution-required`, `expires`), a `usedOn` array, a `treatment` field. A build-time lint fails if an `editorial-only` asset is referenced from `/store/`.

**Astro.** `<Picture formats={['avif','webp']}>`; global `image.layout: 'constrained'` + `responsiveStyles: true` in `astro.config.mjs` instead of hand-written `sizes`; `loading="eager" fetchpriority="high"` on the single LCP image only; art-directed mobile crops for at most the 2–3 top hero slots; **solid brand-colour placeholders**, not blur-up (a blurry stock photo flashing in is its own tell).

---

## 3. Not looking like AI — what the tells are, and the opposite

A 2025–26 practitioner taxonomy tested against ~1,600 launched sites found the "AI-built" signal clusters in colour, page skeleton and motion — and that bento grids, mesh backgrounds and glass on their own are *not* the tell; the combination with the skeleton is.

**Banned (encoded in `docs/CLAUDE-CODE-PROMPT.md` as hard rules):** indigo/violet anywhere; purple→blue or gradient-text headlines; untouched framework defaults (`rounded-lg border shadow-sm`); glowing CTAs; the cream + serif + sage "tasteful default"; uniform `rounded-2xl` and pill buttons; centred hero → 3-column icon cards → testimonial strip → CTA band; badge-above-H1; identical card heights regardless of content; stat rows without context; emoji as icons; Inter/Geist alone; a single italic serif accent word in an all-sans hero; scroll-reveal on every section; hover-scale on every card; scroll-jacking; "Transform / Supercharge / Unleash / effortlessly" copy; arbitrary spacing outside a scale.

**What human editorial craft does instead:** start from the body column; hierarchy built from weight, size, colour, position and rules together; a stated type pairing; **hairline rules, not shadowed cards**; asymmetric grids that let a full-width image, a two-column passage and a data table share a page; pull-quotes and marginalia; drop caps only at true section starts; byline + "Updated [date]" under every headline; whitespace that means "new section"; **tabular numerals and real `<table>`s**; one accent tied to one meaning; content-driven card heights; inline "buy here" links in prose rather than "Get Started" buttons; **varying section rhythm** (text → wide image → table → text); a visible point of view — verdicts, "we tested and rejected X"; photo credit lines.

**Shared anatomy of REI / Wirecutter / Food52 (REI measured directly; the others secondary-sourced):** editorial-first template — headline, byline, methodology/trust block, long prose with verdict boxes and comparison tables, product cards only where a claim is made; body column ~65–85 characters wide regardless of page width; verdict boxes typographically continuous with the page, not a foreign card; commerce inline and contextual, never a banner grid; radius 0–4px, light or no shadows; dense useful footers; motion essentially invisible (hover = colour/underline change).

**Motion budget:** 100ms feedback, 200ms exits, 300ms entrances, 400ms ceiling; animations written *inside* `@media (prefers-reduced-motion: no-preference)` so nothing animates by default; View Transitions as a crossfade only.

---

## 4. The category and the audience

**Nobody in home freeze-drying looks quiet.** Harvest Right is competent corporate-appliance DTC (hero carousel, benefit icons). PackFreshUSA has the closest thing to editorial content (a dense Q&A and technical reference on absorbers) with no design applied to it. Wallaby is a conversion-tuned Shopify template — notably it lets the silver/black bag set its palette, which reads as trustworthy in-category. The bag suppliers are PDF-era B2B. The content players (Freeze Drying Mama, Retired at 40, r/freezedrying, the Facebook groups) are ad-heavy recipe-blog grammar or no design at all. **A calm, data-forward, magazine-grade site with visible methodology is unclaimed territory.**

**What the audience asks and trusts (their vocabulary, to be used verbatim):** mil thickness (5 / 7 / 7.5 / 10 mil), oxygen-absorber **cc rating** matched to bag volume and food density (light/fluffy foods need 2–3× more cc than dense), **food-safe / FDA-compliant** with actual certification language, the **puffy-bag test** (flat after 24–48h = good seal + live absorber), **oxygen indicator** pills (pink = absorbed, blue = oxygen present), **moisture at packaging time** as the main failure cause, rehydration behaviour, and the practical batch math — bags per batch, bag size per food volume. They are sceptical of unsourced "25-year" shelf-life claims.

**Devices to borrow:** a standing **How We Test** page (OutdoorGearLab model) linked from every review; spec tables above the fold; a boxed **"what we haven't tested"** limitations callout on every guide; day-0 / day-30 / day-180 named test photos when photography arrives; "who this is for / isn't for" at the top of guides; "why this cc / why this mil" unit-math asides; visible last-tested date; Best Overall / Budget / Best-for-X pick cards.

**Worth building:** the **bag-size ↔ food-amount and absorbers-per-batch calculator** (most repeated question in the niche, nobody has made it usable); starter bundles framed as **"who this kit is for"** with stated limitations; **subscribe-and-save reorder** for consumables. **Not worth building:** a precise-looking shelf-life-in-years calculator — use ranges with stated conditions or it undermines the voice.

**Packaging continuity** with a plain silver bag: consistent angle/light/background renders of the actual bag on every touchpoint; a one-card insert (seal-check / indicator guide) in the site's type; a label system (size, contents, pack date) in the site's type. The absence of colour becomes the signature.

---

## 5. Architecture that will not need resetting

- **DTCG tokens are stable** (spec 2025.10, Oct 2025). Keep `$value/$type/$description`. **Style Dictionary, pinned** (5.5.x at time of writing), compiles `tokens/*.tokens.json` → `src/styles/tokens.css`; the CSS is committed but never hand-edited; CI regenerates and `git diff --exit-code`s it. Terrazzo is the fallback if Style Dictionary's DTCG handling bites.
- **Three tiers**: global (raw) → semantic (intent, theme-aware — the only tier components touch) → component (thin, only where truly needed).
- **Tokens only on `:root` / media query**, never inside a scoped Astro `<style>` (scoped styles can't see custom properties that aren't on an ancestor).
- **Astro 5 Content Layer**: `content.config.ts` at the root, `glob` loaders, shared Zod base schema (title, description, pubDate, updatedDate, author, heroImage, tags) extended per collection (`guides`, `articles`, `recipes`). No `products` collection — products come from Shopify.
- `BaseLayout` (shell, skip link, landmarks, tokens import) → `ArticleLayout` / `ProductLayout`. Same tokens, same rhythm: product pages read as part of the publication.
- **Cart drawer is the only hydrated island.** Everything else ships zero JS. `<ClientRouter />` from `astro:transitions` for crossfades.
- **Shopify**: plain GraphQL `fetch` against the Storefront API, version pinned (`2025-10`), cart mutations (`cartCreate`, `cartLinesAdd`…) and handoff via `checkoutUrl`. Not `hydrogen-react`. Product copy/images at build time; price + `availableForSale` re-queried in a tiny island on the PDP and in the cart; a Shopify `products/update` webhook triggers a Netlify rebuild.
- **Checkout Editor** (non-Plus): logo, colours, font from its list — a manual admin task, mirrored to the tokens. No custom CSS on non-Plus. **Hard deadline already passed / imminent:** legacy thank-you and order-status customisations had to migrate by **August 2026** — verify in admin.
- **WCAG 2.2 AA as build rules**, AAA (7:1) for body/muted text. New 2.2 criteria that apply: focus not obscured (sticky header must never cover the focused element), target size ≥24×24px (buttons 44px), consistent help placement, no drag-only interactions. `:focus-visible` 2px outline at ≥3:1 on every surface (tokens `border.focus` / `border.focusOnInverse`). Skip link first in tab order. One `<h1>`, landmarks, no skipped heading levels, `<caption>` + `<th scope>` on every table, labelled inputs with `aria-describedby` errors that never rely on colour alone.
- **CI gates on every PR**: axe-core via Playwright (fail on serious/critical), pa11y-ci crawl of the built site, Lighthouse CI thresholds, Stylelint (`declaration-property-value-disallowed-list` blocking raw hex/rgb on colour properties, raw px outside border widths), token staleness check, images-manifest lint.
- **Budgets**: LCP ≤2.5s, INP ≤200ms, CLS ≤0.1; page ≤500KB excluding hero; CSS ≤50KB gz; JS ≤30KB gz on an article page (≈0 without the cart).
- **Print stylesheet** for guides: hide chrome, expand collapsed content, black on white, URLs after links, `break-after: avoid` on headings.

(Sources list omitted from the working file — keep the original bibliography as an appendix if useful; not required for build correctness.)
