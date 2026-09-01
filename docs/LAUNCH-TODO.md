# Sublime Pantry — launch checklist

Living document. Update as items complete; don't delete history — mark
done items `[x]` with the date/PR that closed them.

## Phase 1 — Astro foundation

- [x] Reconstruct the site as real Astro 7 source (PR #2, merged as
      `e4633de`). All 25 original URLs, titles, canonical tags, sitemap,
      RSS, robots.txt, Netlify Forms, and the Batch Log tool verified
      byte-for-byte against the prior committed HTML.
- [x] `package.json`/`astro.config.mjs`/`tsconfig.json` (strict)/
      `netlify.toml` wired to `npm run build` → `dist`, Node 22.
- [x] CI builds the site and runs the link/JSON-LD checker against
      `dist/` instead of committed HTML.
- [x] Fix `npm ci` lockfile sync failure (regenerated `package-lock.json`).
- [x] Netlify deploy preview verified healthy on PR #2.

## Phase 2 — daily editorial automation

- [x] `site.yaml` — thresholds, weights, risk rules, brand voice/banned
      language, WIF configuration.
- [x] Prompts: `prompts/research-system.md`, `prompts/draft-system.md`,
      `prompts/verify-system.md`.
- [x] Schemas: `schemas/evidence-packet.schema.json`,
      `schemas/editorial-decision.schema.json`,
      `schemas/draft-content.schema.json`,
      `schemas/verification.schema.json`.
- [x] `scripts/editorial-controller.mjs` — deterministic orchestrator
      (research → score → draft → verify → QA → draft PR), no LLM call in
      the controller itself.
- [x] `scripts/lib/*` — Anthropic WIF client with retry/refusal/pause_turn
      handling, Search Console WIF collector, deterministic scoring,
      schema validation, content-collection writer (refuses to overwrite),
      Astro QA runner, draft-PR opener (never merges).
- [x] `tests/fixtures/editorial/*` + `tests/editorial-controller.test.mjs`
      — deterministic unit tests, no network required (`npm test`).
- [x] `.github/workflows/daily-editorial.yml` — separate `research` and
      `draft` jobs, scheduled 14:17 UTC + `workflow_dispatch`, restricted
      to `main`, WIF-only auth for both Anthropic and Google, 90-day
      artifact retention, draft-PR-only.
- [x] `.github/workflows/editorial-watchdog.yml` — scheduled 16:43 UTC,
      idempotent issue on no successful run in 36h.
- [x] Fixed the listing pages (`/guides`, `/troubleshooting`, `/compare`)
      to show any article the automation adds, not just the 10 launch
      articles — they previously used hardcoded per-slug copy that would
      have silently hidden new content.
- [x] `anthropic-wif-test.yml`'s permanent `on: push` trigger removed
      (now `workflow_dispatch` only).

## Phase 3 — validate and activate

- [x] `npm run editorial:dry-run` passes locally (fixture-driven).
- [x] `npm test` passes (14/14).
- [x] `npm run build` + link/JSON-LD checker pass with the automation
      code present (no regression to the site itself).
- [ ] Automation infrastructure PR opened, CI green, Netlify preview
      healthy, merged to `main`.
- [ ] First `Daily editorial research` workflow run triggered manually
      after merge.
- [ ] First run's outcome verified (evidence packet / decision / run log
      / final status) — `NO_ACTION` is a valid, successful result.
- [ ] If the first run produces a `DRAFT_PR`, the PR is left as a draft
      for human review — **never merged by automation**.

## Human-only follow-ups (cannot be done by an agent)

- [ ] **GitHub branch protection on `main`**: require the `CI` check and
      at least one human approval before merge, and enable "Restrict who
      can push to matching branches" if not already set. This is an
      account/repo-settings action (Settings → Branches → Branch
      protection rules) — the automation's draft-PR-only behavior is a
      code-level safeguard, not a substitute for this.
- [ ] **Confirm Anthropic WIF federation rule** (`fdrl_01WRVJBcYMmpd8a4m93xthJZ`)
      is scoped to only this repository's OIDC subject claim, not the
      whole GitHub org — a billing/security-relevant check that requires
      Anthropic Console access.
- [ ] **Confirm the Google Cloud WIF pool/provider**
      (`projects/914157631016/locations/global/workloadIdentityPools/github-actions/providers/sublime-pantry-github`)
      has an attribute condition restricting it to this repo (and ideally
      to `ref:refs/heads/main`) — a GCP IAM console action.
- [ ] **Confirm `search-console-reader@project-8035de1c-ed23-4c73-af0.iam.gserviceaccount.com`**
      has only the read-only Search Console role bound (not Owner/Editor)
      — GCP IAM console action.
- [ ] **Set a spend alert / budget** on the Anthropic organization for the
      service account used by this pipeline, if not already configured —
      Anthropic Console, billing-owner action.
- [ ] Decide on and label the `ai-generated-content` label's visibility/
      required-review policy in the repo's PR template or CODEOWNERS, if
      tighter routing than "draft PR, human merges" is wanted.
