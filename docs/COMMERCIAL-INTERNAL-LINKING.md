# Commercial internal linking map

The rule: **link by reader stage, not by revenue opportunity.** A pre-owner who is sent to a packaging product converts at zero and learns that we sell before we help. The content's credibility is the acquisition channel; protect it.

## Stage model

| Stage | Signal | Correct next action | Never |
|---|---|---|---|
| Researching a machine | Reading `which-freeze-dryer`, `home-freeze-dryers` | Buyer guide → comparison → lead magnet | Packaging product |
| New owner | Reading `complete-batch-workflow`, `batch-not-dry` | Checklist → packaging education → starter kit | Machine comparisons |
| Active owner | Reading `storage-containers`, `storage-failure` | Starter kit | — |
| Cottage seller | Reading `cottage-economics`, `/start-selling` | Packaging + labelling → starter kit | — |

## Current wiring

### Automatic (`src/layouts/ArticleLayout.astro`)

`StarterKitCTA` renders on exactly these article IDs:

- `complete-batch-workflow`
- `storage-containers`
- `storage-failure`
- `batch-not-dry`
- `rehydration-problems`

Deliberately **excluded**: `which-freeze-dryer`, `home-freeze-dryers`, `cottage-economics`, `chewy-candy`, `vacuum-error`.

- `which-freeze-dryer` / `home-freeze-dryers` — pre-owner. Selling packaging here is the mistake the stage model exists to prevent. (`home-freeze-dryers` previously carried this CTA; it was removed.)
- `cottage-economics` — commercially relevant but the reader's question is regulatory and economic. The newsletter block at the foot of every article is the right capture here.
- `vacuum-error` — a machine fault. The reader has a broken cycle, not a packaging need.

The `Newsletter` block renders on **every** article regardless, so no page is a dead end.

### Deliberate links

| From | To | Why |
|---|---|---|
| `/shop` → `/guides/complete-batch-workflow` | Packaging workflow | Product page returns the reader to education |
| Product page → `/guides/complete-batch-workflow` | The storage step in context | |
| Product page → `/freeze-drying-starter-checklist` | Lead magnet for non-buyers | Captures the reader who isn't ready |
| Product page → `/troubleshooting/batch-not-dry` | Verify dryness before packaging | Prevents a bad first experience with the product |
| Product page → `/compare/storage-containers` | Why Mylar | Justifies the product without selling |
| Product page → `/troubleshooting/storage-failure` | What goes wrong later | |
| Product page → `/guides/which-freeze-dryer` | "This is not a freeze dryer" | Routes a mis-staged reader *back* to pre-owner content |
| Product page → `/compare/home-freeze-dryers` | Brand comparison | Same |
| `/freeze-drying-starter-checklist` → starter kit | Lead magnet → product | Correct: this reader is an owner |
| `/freeze-drying-starter-checklist` → `/guides/complete-batch-workflow` | Depth | |

The product page linking *outward* to machine content is intentional and slightly counter-commercial. It is how a pre-owner who landed on the product page finds the content that actually serves them — and how the page earns the trust that makes the eventual purchase possible.

## Gaps to close after launch

These are the highest-value missing links, in priority order. They require content that does not exist yet — **do not mass-generate it.**

1. **Is a Freeze Dryer Worth It?** — the top-of-funnel pre-owner entry point. Nothing currently occupies it. Should link → `which-freeze-dryer` → `home-freeze-dryers` → lead magnet.
2. **Mylar Bags for Freeze-Dried Food** — the highest commercial-intent packaging query. Currently only partly served by `storage-containers`. Should link → starter kit.
3. **Oxygen Absorbers for Freeze-Dried Food** — sizing is the exact problem the kit solves. Should link → starter kit.
4. **Freeze Drying vs Dehydrating** — pre-owner, high volume. Should link → `which-freeze-dryer`, never to packaging.
5. **How Long Does Freeze-Dried Food Last?** — bridges storage education to packaging. Should link → `storage-failure` → starter kit.

When each is written, add owner-stage ones to `starterKitArticles` in `ArticleLayout.astro` and record the decision here. Pre-owner ones must stay out of that set.

## Canonicals

Canonical URLs are generated centrally in `BaseLayout.astro` from the `path` prop. Product and shop pages pass their own clean path. Do not add per-page canonical overrides; UTM parameters on internal CTAs (`?utm_campaign=starter-kit&…`) are stripped from the canonical automatically because the canonical is built from `path`, not from the request URL.
