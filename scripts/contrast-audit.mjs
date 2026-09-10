import { readFileSync, writeFileSync } from 'node:fs';

/**
 * docs/CLAUDE-CODE-PROMPT.md T1.2/T5.6. Reads the actual generated
 * public/styles/tokens.css (not a second, hand-maintained copy of the
 * hex values — that's how the T5.6 pass ended up needing a one-time
 * manual calculation in the first place) and computes real WCAG 2.x
 * relative-luminance contrast ratios for every pairing BRAND.md/ground
 * rule 8 cares about, in both the light `:root` block and the
 * `@media (prefers-color-scheme: dark)` block. Rewrites tokens/CONTRAST.md
 * and exits non-zero if anything fails its threshold.
 *
 * Run `npm run tokens` first if you've just edited a *.tokens.json file —
 * this script reads the generated CSS, not the token sources, the same
 * way `npm run tokens:check` does for staleness.
 */

const TOKENS_CSS = new URL('../public/styles/tokens.css', import.meta.url);
const CONTRAST_MD = new URL('../tokens/CONTRAST.md', import.meta.url);

const css = readFileSync(TOKENS_CSS, 'utf8');

/** Split the generated CSS into its light (:root) and dark (@media) blocks. */
function splitBlocks(source) {
  const darkStart = source.indexOf('@media (prefers-color-scheme: dark)');
  if (darkStart === -1) throw new Error('No dark media block found in tokens.css');
  return { light: source.slice(0, darkStart), dark: source.slice(darkStart) };
}

/** Parse `--sp-color-X: #RRGGBB;` declarations out of a CSS chunk into a
 *  Map keyed by the un-prefixed dotted name a pairing list can reference. */
function parseColorVars(chunk) {
  const vars = new Map();
  for (const match of chunk.matchAll(/--sp-color-([a-zA-Z-]+):\s*(#[0-9a-fA-F]{6});/g)) {
    vars.set(match[1], match[2]);
  }
  return vars;
}

const { light: lightCss, dark: darkCss } = splitBlocks(css);
const lightVars = parseColorVars(lightCss);
const darkVars = parseColorVars(darkCss);

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
function relLum([r, g, b]) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}
function contrast(hex1, hex2) {
  const L1 = relLum(hexToRgb(hex1));
  const L2 = relLum(hexToRgb(hex2));
  const [lighter, darker] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (lighter + 0.05) / (darker + 0.05);
}

/** [label, fgVarName, bgVarName, minRatio, note] */
const PAIRINGS = [
  ['text.body on surface.page', 'text-body', 'surface-page', 7, 'AAA body text'],
  ['text.muted on surface.page', 'text-muted', 'surface-page', 7, 'AAA muted text'],
  ['text.body on surface.raised', 'text-body', 'surface-raised', 7, 'AAA body text'],
  ['text.muted on surface.raised', 'text-muted', 'surface-raised', 7, 'AAA muted text'],
  ['action.primaryText on action.primary', 'action-primaryText', 'action-primary', 4.5, 'AA, button label'],
  ['action.primary on surface.page', 'action-primary', 'surface-page', 4.5, 'AA, text-link use'],
  ['border.focus on surface.page', 'border-focus', 'surface-page', 3, 'AA, non-text UI'],
  ['status.danger on surface.page', 'status-danger', 'surface-page', 4.5, 'AA text'],
  ['status.success on surface.page', 'status-success', 'surface-page', 4.5, 'AA text'],
  ['status.info on surface.page', 'status-info', 'surface-page', 4.5, 'AA text'],
];

function auditScheme(vars) {
  const rows = [];
  let failed = false;
  for (const [label, fgKey, bgKey, min, note] of PAIRINGS) {
    const fg = vars.get(fgKey);
    const bg = vars.get(bgKey);
    if (!fg || !bg) {
      rows.push({ label, ratio: null, min, note, fg: fgKey, bg: bgKey, pass: false, missing: true });
      failed = true;
      continue;
    }
    const ratio = contrast(fg, bg);
    const pass = ratio >= min;
    if (!pass) failed = true;
    rows.push({ label, ratio, min, note, fg, bg, pass, missing: false });
  }
  return { rows, failed };
}

const lightResult = auditScheme(lightVars);
const darkResult = auditScheme(darkVars);

function renderTable(result) {
  const lines = ['| Pair | Ratio | Threshold | Result |', '|---|---|---|---|'];
  for (const row of result.rows) {
    if (row.missing) {
      lines.push(`| ${row.label} | — | ${row.min}:1 | **Missing token** (${row.fg} or ${row.bg}) |`);
      continue;
    }
    const ratioStr = row.ratio.toFixed(2) + ':1';
    lines.push(`| ${row.label} (${row.fg} / ${row.bg}) | ${row.pass ? ratioStr : `**${ratioStr}**`} | ${row.min}:1 | ${row.pass ? 'Pass' : '**Fail**'} |`);
  }
  return lines.join('\n');
}

const now = new Date().toISOString().slice(0, 10);
const md = `# Contrast audit

Generated automatically by \`scripts/contrast-audit.mjs\` (\`npm run contrast\`) from the actual \`public/styles/tokens.css\` — not a hand-maintained copy of hex values. **Do not hand-edit this file**; edit \`tokens/*.tokens.json\`, run \`npm run tokens\`, then \`npm run contrast\`.

Thresholds per BRAND.md / \`docs/CLAUDE-CODE-PROMPT.md\` ground rule 8: **AAA (7:1)** for body and muted text, **AA (4.5:1)** for other text, **AA (3:1)** for non-text UI.

Run ${now}.

## Light

${renderTable(lightResult)}

## Dark

${renderTable(darkResult)}

## Not checked by this script

- \`status.warn\` (aliased to \`action.primary\`/rust in both palettes) — same numbers as the \`action.primary\` rows above.
- \`status.indicatorPink\` / \`status.indicatorBlue\` (the \`OxygenIndicator\` diagram tokens) — these are SVG fills behind label text set in \`currentColor\`/\`text.body\`, not text printed directly on them.
- Hover/pressed state variants.
- \`border.hairline\` — decorative only, never carries meaning alone, so it isn't held to a text-contrast threshold.
`;

writeFileSync(CONTRAST_MD, md);
console.log(`Wrote ${CONTRAST_MD.pathname.split('/').slice(-2).join('/')}`);

if (lightResult.failed || darkResult.failed) {
  console.error('\nContrast audit FAILED — see tokens/CONTRAST.md for the failing pair(s).');
  process.exit(1);
}
console.log('All checked pairings pass their threshold.');
