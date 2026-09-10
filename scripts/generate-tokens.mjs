import fs from 'node:fs';
import path from 'node:path';

/**
 * Sublime Pantry token build.
 *
 * Three tiers, per docs/design-research.md §5: tokens/global.tokens.json (raw
 * values) -> tokens/semantic.light.tokens.json (intent, the tier components
 * touch) -> tokens/semantic.dark.tokens.json (same intent names, dark values,
 * emitted only inside @media (prefers-color-scheme: dark)). This replaces the
 * single-tier src/styles/tokens.tokens.json that shipped before the
 * docs/CLAUDE-CODE-PROMPT.md rebuild (see docs/DECISIONS.md, T1.2).
 *
 * Every custom property is emitted twice: once with the new --sp- prefix
 * (the name new code should use, per ground rule 4), and once under its old
 * unprefixed name (--color-semantic-text, --font-family-display, etc.) as a
 * plain alias to the same --sp- variable. The unprefixed names are what
 * public/styles/base.css and the rest of the already-shipped site still
 * consume; keeping them as aliases means this migration does not require a
 * simultaneous, unverified rename across every component in one sitting.
 * Migrating those remaining call sites onto --sp- names directly is tracked
 * in docs/DECISIONS.md as follow-up work, not done in this pass.
 */

const globalSource = path.resolve('tokens/global.tokens.json');
const semanticLightSource = path.resolve('tokens/semantic.light.tokens.json');
const semanticDarkSource = path.resolve('tokens/semantic.dark.tokens.json');
const output = path.resolve('public/styles/tokens.css');

const globalTokens = JSON.parse(fs.readFileSync(globalSource, 'utf8'));
const semanticLightTokens = JSON.parse(fs.readFileSync(semanticLightSource, 'utf8'));
const semanticDarkTokens = JSON.parse(fs.readFileSync(semanticDarkSource, 'utf8'));

/** Flatten a DTCG token tree into a Map of dotted-name -> raw $value. */
function flatten(node, parts = [], map = new Map()) {
  if (node && typeof node === 'object' && '$value' in node) {
    map.set(parts.join('.'), node.$value);
    return map;
  }
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('$')) continue;
    flatten(value, [...parts, key], map);
  }
  return map;
}

const globalFlat = flatten(globalTokens);
const semanticLightFlat = flatten(semanticLightTokens);
const semanticDarkFlat = flatten(semanticDarkTokens);

/** Resolve a value, following one level of {alias.to.a.global.token}. */
function resolveValue(value, lookupFlat) {
  if (typeof value === 'string') {
    const alias = value.match(/^\{(.+)\}$/);
    if (alias) {
      const target = alias[1];
      if (!lookupFlat.has(target)) throw new Error(`Unresolved token alias: {${target}}`);
      return lookupFlat.get(target);
    }
    return value;
  }
  return value;
}

function cssValue(value) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map((item) => (item.includes(' ') ? `"${item}"` : item)).join(', ');
  if (value && typeof value === 'object' && 'value' in value) return `${value.value}${value.unit}`;
  throw new Error(`Unsupported token value: ${JSON.stringify(value)}`);
}

function spName(dottedName) {
  return `--sp-${dottedName.replaceAll('.', '-')}`;
}

/** The old, unprefixed naming scheme this pipeline shipped before the
 * three-tier rebuild. Explicit maps, not a mechanical rename, because the
 * new tier's grouping (surface.page, text.body, action.primary...) does not
 * line up 1:1 with the old flat names (--color-semantic-surface,
 * --color-semantic-text, --color-semantic-action...) that base.css and the
 * rest of the shipped site still reference. Grep the tree for
 * `color-(brand|semantic)-` before removing an entry here. */
const LEGACY_GLOBAL_COLOR_NAMES = {
  'color.ice': '--color-brand-ice',
  'color.ink': '--color-brand-ink',
  'color.white': '--color-brand-white',
  'color.paper': '--color-brand-paper',
  'color.rust': '--color-brand-rust',
};
const LEGACY_SEMANTIC_COLOR_NAMES = {
  'color.text.body': '--color-semantic-text',
  'color.text.muted': '--color-semantic-muted',
  'color.surface.page': '--color-semantic-surface',
  'color.surface.raised': '--color-semantic-raised',
  'color.surface.warm': '--color-semantic-warm',
  'color.surface.inset': '--color-semantic-rustSoft',
  'color.border.hairline': '--color-semantic-border',
  'color.action.primary': '--color-semantic-action',
  'color.action.primaryHover': '--color-semantic-actionHover',
  'color.status.info': '--color-semantic-info',
  'color.status.success': '--color-semantic-success',
  'color.status.danger': '--color-semantic-danger',
};
function legacyName(dottedName) {
  return LEGACY_GLOBAL_COLOR_NAMES[dottedName] ?? null;
}
function legacySemanticName(dottedName) {
  return LEGACY_SEMANTIC_COLOR_NAMES[dottedName] ?? null;
}
function legacyOtherName(dottedName) {
  if (dottedName.startsWith('font.family.')) return `--font-family-${dottedName.slice('font.family.'.length)}`;
  if (dottedName.startsWith('space.')) return `--space-${dottedName.slice('space.'.length)}`;
  if (dottedName === 'size.content') return '--size-content';
  if (dottedName === 'size.control') return '--size-control';
  if (dottedName === 'radius.control') return '--radius-control';
  if (dottedName === 'radius.panel') return '--radius-panel';
  if (dottedName === 'motion.fast') return '--motion-fast';
  if (dottedName === 'motion.normal') return '--motion-normal';
  return null;
}

function buildRootBlock({ globalFlat, semanticFlat, includeGlobal }) {
  const lines = [];
  if (includeGlobal) {
    for (const [name, rawValue] of globalFlat) {
      const value = cssValue(rawValue);
      lines.push(`  ${spName(name)}: ${value};`);
      const legacy = legacyName(name);
      if (legacy) lines.push(`  ${legacy}: var(${spName(name)});`);
      const other = legacyOtherName(name);
      if (other) lines.push(`  ${other}: var(${spName(name)});`);
    }
  }
  for (const [name, rawValue] of semanticFlat) {
    const resolved = resolveValue(rawValue, globalFlat);
    const value = cssValue(resolved);
    lines.push(`  ${spName(name)}: ${value};`);
    const legacy = legacySemanticName(name);
    if (legacy) lines.push(`  ${legacy}: var(${spName(name)});`);
  }
  return lines.join('\n');
}

const lightBlock = buildRootBlock({ globalFlat, semanticFlat: semanticLightFlat, includeGlobal: true });
const darkBlock = buildRootBlock({ globalFlat, semanticFlat: semanticDarkFlat, includeGlobal: false });

// size.measure had two legacy split names (measure / product measure) that
// predate the three-tier font.measure.* tokens; keep them working.
const measureAliasLines = [
  `  --size-measure: var(--sp-font-measure-article);`,
];

const css = `/* Generated by scripts/generate-tokens.mjs from tokens/global.tokens.json +
   tokens/semantic.light.tokens.json + tokens/semantic.dark.tokens.json.
   Do not edit by hand — edit the *.tokens.json sources and run \`npm run tokens\`. */
:root {
${lightBlock}
${measureAliasLines.join('\n')}
}

@media (prefers-color-scheme: dark) {
  :root {
${darkBlock}
  }
}

/* The offset "ghost" second copy — see BRAND.md § The ghost and
   docs/CLAUDE-CODE-PROMPT.md Appendix B. Ice on paper; rust when the element
   itself sits on an ice ground (wrap it in .sp-on-ice). Never under 24px,
   never on body text, nav, buttons, or links. */
.sp-ghost {
  position: relative;
}
.sp-ghost::after {
  content: attr(data-ghost-text);
  position: absolute;
  inset-inline-start: 0.03em;
  inset-block-start: 0.045em;
  z-index: -1;
  color: var(--sp-color-surface-ice);
  pointer-events: none;
}
.sp-on-ice.sp-ghost::after {
  color: var(--sp-color-action-primary);
}
`;

if (process.argv.includes('--check')) {
  if (!fs.existsSync(output) || fs.readFileSync(output, 'utf8') !== css) {
    console.error('public/styles/tokens.css is out of date. Run npm run tokens.');
    process.exit(1);
  }
} else {
  fs.writeFileSync(output, css);
  console.log(`Wrote ${path.relative(process.cwd(), output)}`);
}
