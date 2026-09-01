# Daily editorial automation

Architecture reference for the daily research → draft PR pipeline. See
`site.yaml` for tunable policy (thresholds, weights, risk rules) and
`docs/LAUNCH-TODO.md` for current launch/rollout status.

## Why this exists

The launch brief is explicit: a daily research run is not a daily
publishing quota, generated content always requires human review, and at
most one new article or substantive update happens per day. This system
is built so that constraint is enforced in code, not by convention:

- The controller (`scripts/editorial-controller.mjs`) is deterministic —
  scoring and the outcome decision are pure functions of the evidence
  packet, never an LLM call.
- Every LLM output is schema-validated before the pipeline trusts it.
- The drafting phase has no web tools — it can only use what the research
  phase already found and cited.
- A separate, independent Claude call verifies the draft's claims against
  the evidence packet before anything is written to the repo.
- The controller writes **at most one** content file per run, and refuses
  to overwrite an existing article.
- The pipeline can only ever open a **draft** PR. Nothing in this codebase
  calls `gh pr merge` on an editorial PR — that action is not implemented,
  on purpose.

## Pipeline stages

```
Search Console (read-only)
        │
        ▼
Research phase (Claude + web_search/web_fetch, read-only)
        │  produces: EvidencePacket (schemas/evidence-packet.schema.json)
        ▼
Deterministic scoring (scripts/lib/scoring.mjs — no LLM)
        │  produces: EditorialDecision (schemas/editorial-decision.schema.json)
        │
        ├── score < 65               → NO_ACTION
        ├── score 65–79              → SOURCED_BRIEF or REFRESH_RECOMMENDATION
        └── score ≥ 80 (draft eligible)
                │
                ▼
        Draft phase (Claude, evidence-only, no tools)
                │  produces: DraftContent (schemas/draft-content.schema.json)
                ▼
        Verification phase (Claude, independent, no tools)
                │  produces: Verification (schemas/verification.schema.json)
                │
                ├── failed  → downgrade to SOURCED_BRIEF, stop (no PR)
                └── passed
                        ▼
                Write one file to src/content/articles/
                        ▼
                Astro build + link/JSON-LD QA (same gate as CI)
                        │
                        ├── failed → no PR, run fails loudly
                        └── passed → open a draft PR (never merged automatically)
```

## Outcomes

| Outcome | Meaning |
|---|---|
| `NO_ACTION` | Score below 65, or the daily quota was already used. A successful, expected result most days. |
| `SOURCED_BRIEF` | Evidence found, but not strong/verified enough for a draft. No content file is written. |
| `REFRESH_RECOMMENDATION` | Topic already has site coverage; evidence suggests it should be refreshed rather than duplicated. |
| `NEWS_ALERT` | Reserved for time-sensitive regulatory/manufacturer changes; current scoring routes these through the same brief/draft thresholds as any other topic — this outcome exists in the schema for future use once a distinct freshness-driven trigger is added. |
| `GROWTH_EXPERIMENT` | Reserved for future non-editorial growth signals (e.g. internal-linking or metadata experiments) — not currently produced by `scoring.mjs`. |
| `DRAFT_PR` | Score ≥ 80, risk rules did not downgrade it, verification passed, and Astro QA passed. A draft PR was opened. |

## Risk rules (can only downgrade, never upgrade)

Defined in `site.yaml` under `risk.downgradeRules` and enforced in
`scripts/lib/scoring.mjs`:

- **elevated-topic-single-source** — an elevated-risk topic (food safety,
  shelf life, water activity, cottage food law, ...) with fewer than two
  primary-tier sources never reaches `DRAFT_PR`.
- **no-primary-source** — no primary-tier source at all caps the outcome
  at `SOURCED_BRIEF`.
- **unverified-claims-present** — applied after the verification phase;
  any unsupported claim, banned-language hit, or editorial-rule violation
  downgrades an otherwise-eligible draft to `SOURCED_BRIEF` and no PR is
  opened.
- **pillar-quota-reached** — if today's run already produced (or found)
  a published article, a second `DRAFT_PR` outcome the same day is forced
  down to `NO_ACTION`.

## Authentication

**Anthropic** — Workload Identity Federation only, no `ANTHROPIC_API_KEY`
anywhere in this repo or its workflows. The workflow requests
`id-token: write`, mints a GitHub OIDC token scoped to audience
`https://api.anthropic.com` via `actions/github-script`, writes it to a
runner-local file (never logged, `core.setSecret`-masked), and points
`ANTHROPIC_IDENTITY_TOKEN_FILE` at it. `scripts/lib/anthropic-client.mjs`
constructs a zero-argument `Anthropic()` client, which auto-detects WIF
from the environment and refuses to run if `ANTHROPIC_API_KEY` /
`ANTHROPIC_AUTH_TOKEN` are set (they would outrank WIF silently).

**Google Search Console** — Workload Identity Federation via
`google-github-actions/auth@v2` (`workload_identity_provider` +
`service_account: search-console-reader@...`), which exchanges the GitHub
OIDC token for a short-lived GCP access token and points
`GOOGLE_APPLICATION_CREDENTIALS` at an ephemeral *external_account*
credential config — no private key is ever downloaded or committed.
`scripts/lib/gsc-collect.mjs` refuses to proceed if that path instead
points at a real `type: "service_account"` key file.

## Resilience

`scripts/lib/anthropic-client.mjs` retries on 429/5xx/network errors with
exponential backoff + jitter (honoring `retry-after` when present), and
explicitly handles non-`end_turn` stop reasons:

- `refusal` — raised as an error with the refusal category/explanation.
- `max_tokens` — raised as an error (a truncated evidence packet/draft is
  never usable).
- `pause_turn` — raised as an error (the current phases don't run a
  client-side agentic loop, so an unresumed pause means something went
  wrong).

## Run logs and artifacts

Every run writes `artifacts/run-log.json` (see `scripts/lib/run-log.mjs`)
containing: run ID and timestamps, the policy/prompt/schema/model versions
in effect, per-call provider usage (`response.usage`), the full citation
ledger, the evidence packet, the score and outcome, the draft and
verification results, the deterministic QA result, and PR/preview details
when applicable. Cost is explicitly marked `computed: false` — dollar-cost
tracking requires the Admin API's usage/cost reports and is not wired up
here; `providerUsage` gives the raw token counts per call for anyone who
wants to compute it later. The GitHub Actions workflow uploads
`artifacts/*.json` with 90-day retention on every run, success or failure.

## Human-in-the-loop guarantees

- Every `DRAFT_PR` outcome opens a **draft** PR labeled
  `ai-generated-content`, with a checklist and the full source list in the
  PR body.
- Nothing in this codebase or its workflows calls `gh pr merge` (or the
  GitHub API's merge endpoint) on an editorial PR. Merging is a human
  action, always.
- `docs/LAUNCH-TODO.md` tracks whether branch protection additionally
  requires a human review/approval before merge is even possible — that is
  an account-level GitHub setting, not something this code can enforce on
  its own.

## Local development

```bash
npm run editorial:dry-run   # fixture-driven, no network, no git — validates the pipeline
npm test                    # deterministic unit tests (scoring, schemas, risk rules)
npm run editorial:research  # live GSC + live Claude research call (requires WIF env)
npm run editorial:draft     # live draft/verify/QA/PR (requires WIF env + research artifacts)
```
