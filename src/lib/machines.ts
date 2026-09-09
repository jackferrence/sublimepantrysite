/**
 * The machine spec record — one place, by exact model and bundle.
 *
 * Two articles publish figures for the same machines: the buying guide
 * (`which-freeze-dryer`) and the spec comparison (`home-freeze-dryers`). They
 * drifted apart, and the drift was not cosmetic — the comparison claimed a
 * three-year Harvest Right warranty against the challengers' one, when the
 * sourced figure is one year full plus sealed-system-only coverage in years two
 * and three, which is the same shape of coverage the challengers publish. It
 * also carried a ~900 W average draw for Stay Fresh, who publish no wattage at
 * all.
 *
 * A spec belongs to a model AND a bundle: "Stay Fresh 5-shelf" is a different
 * price with a Premier pump than with the commercial pump, and quoting one
 * against a rival's other is how a comparison lies without stating a falsehood.
 *
 * This file is the record both articles are checked against by
 * `tests/machine-specs.test.mjs`, and, since Phase 4, the thing the comparison
 * table is built from: `/compare/home-freeze-dryers` declares
 * `<div data-machine-comparison></div>` and `machineComparisonTable()` renders
 * the rows. A figure quoted in prose can drift from the record; a figure the
 * record renders cannot.
 *
 * The buying guide's ten-model table stays hand-authored, because seven of its
 * models are not in this record. Those three that are get checked column by
 * column against it — see MACHINE_CONFLICTS for the one that does not agree.
 *
 * Every figure below is the one cited in the buying guide's spec table, which
 * carries the source numbers and the access date. When you re-check prices,
 * update `checked` and the affected fields together.
 */

export interface MachineSpec {
  /** Manufacturer and exact model, as the manufacturer writes it. */
  model: string;
  /** The bundle the price and pump belong to. Never quote a price without it. */
  bundle: string;
  /** List price as published on `checked`. */
  price: string;
  /** Rated load per batch, as published. */
  load: string;
  /** Electrical draw and circuit. "not published" is a finding, not a gap. */
  power: string;
  /** Pump type and whether oil-free is available, with its cost. */
  pump: string;
  /** Warranty as published, including what years 2-3 actually cover. */
  warranty: string;
  /** Tray count and, where published, tray dimensions or total area. */
  trays: string;
  /** The rest of the manufacturer's lineup, for placing this model in it. */
  range: string;
  /** ISO date the figures above were last verified against the source. */
  checked: string;
}

export const MACHINES: MachineSpec[] = [
  {
    model: 'Harvest Right Medium',
    bundle: 'Home Pro bundle, Premier oil pump included',
    price: '$2,395',
    load: '10–15 lb fresh',
    power: '~1,500 W; dedicated 15 A, NEMA 5-15',
    pump: 'Premier oil included; oil-free +$1,495',
    warranty: '1 yr full, yrs 2–3 sealed system only',
    trays: '5',
    range: 'Small → XL ($1,695–$4,995)',
    checked: '2026-09-05',
  },
  {
    model: 'Blue Alpine Medium Select',
    bundle: 'Medium Select, oil rotary vane pump',
    price: '$2,995',
    load: 'up to 15 lb',
    power: '1,560 W peak / 1,080 W avg; 120 V 15 A',
    pump: 'oil rotary vane; no oil-free option',
    warranty: '1 yr full + 3 yr refrigeration',
    trays: '5 (9.25″ × 13″)',
    range: 'Medium, Large, custom',
    checked: '2026-09-05',
  },
  {
    model: 'Stay Fresh 5-Shelf',
    bundle: 'Premier pump bundle',
    price: '$2,699 (reg. $3,299)',
    load: '12–18 lb',
    power: 'watts not published; 120 V, 15 A rated',
    pump: '7 CFM oil; no oil-free option',
    warranty: '1 yr full + limited yrs 2–3 refrigeration',
    trays: 'tray set spanning 640 in² of area',
    range: '5-shelf, 7-shelf, Mega',
    checked: '2026-09-05',
  },
];

/**
 * Figures that were published and are wrong. The test asserts none of these
 * comes back, in any article, in any field. Removing an entry is a decision to
 * allow the claim again — do that only with a source.
 */
export const RETRACTED_MACHINE_CLAIMS: { claim: string; why: string }[] = [
  { claim: '~900 W', why: 'Stay Fresh publishes no wattage for any home unit.' },
  { claim: '900 W average', why: 'Same: an invented average draw.' },
  {
    claim: '3-year limited',
    why: "Harvest Right publishes 1 yr full with yrs 2-3 sealed-system only, not a flat 3-year limited warranty.",
  },
  {
    claim: 'oil-free Premier',
    why: 'The Premier is an oil pump; oil-free is a $1,495 upgrade. (Corrected 2026-09-06.)',
  },
];

/**
 * Figures two of our own pages publish differently for the same model.
 *
 * Not a retraction: nothing here has been shown to be wrong. It is a
 * disagreement we found and have not resolved, and the honest thing to do with
 * one of those is to name it rather than quietly pick the figure that appears
 * in more places.
 *
 * Found while reconciling the tables for Phase 4. `tests/machine-specs.test.mjs`
 * used to assert that each recorded value appeared in *at least one* article,
 * which is what let this live: the comparison page matched the record, so the
 * guide's different figure was never compared to anything. The test now checks
 * every model in every article, column by column, and this list is the only
 * thing keeping the suite green while the question is open.
 *
 * Resolving one means reading the manufacturer's current documentation for the
 * exact model, correcting whichever page is wrong, logging it in /corrections,
 * and deleting the entry. It does not mean editing this list to match a page.
 */
export interface MachineConflict {
  model: string;
  field: keyof Pick<MachineSpec, 'price' | 'load' | 'power' | 'pump' | 'warranty' | 'trays' | 'range'>;
  /** What each page currently says, keyed by article id. */
  published: Record<string, string>;
  why: string;
}

export const MACHINE_CONFLICTS: MachineConflict[] = [
  {
    model: 'Harvest Right Medium',
    field: 'power',
    published: {
      'home-freeze-dryers': '~1,500 W; dedicated 15 A, NEMA 5-15',
      'which-freeze-dryer': '990–1,210 W avg; dedicated 15 A',
    },
    why:
      'The buying guide gives the Small and the Medium the same 990-1,210 W average and gives ~1,500 W to the Large; ' +
      'the comparison page gives ~1,500 W to the Medium. Both cite source [2]. One of the two is quoting the wrong ' +
      "row of Harvest Right's specifications, and which one cannot be settled from anything published here. " +
      'Unresolved as of 2026-09-09; both figures are left exactly as published until the source is read.',
  },
];

/**
 * The comparison table, rendered from the record.
 *
 * Returns the `.table-scroll` wrapper `polishTables` expects, so the generated
 * table picks up the row headers, the focusable region, the scroll cue and the
 * stacked cards for free — the same treatment the authored tables get.
 */
export function machineComparisonTable(): string {
  const rows: [string, (m: MachineSpec) => string][] = [
    ['List price', (m) => m.price],
    ['Trays', (m) => m.trays],
    ['Rated batch load', (m) => m.load],
    ['Power and circuit', (m) => m.power],
    ['Pump', (m) => m.pump],
    ['Warranty', (m) => m.warranty],
    ['Range of sizes', (m) => m.range],
  ];

  const checked = [...new Set(MACHINES.map((m) => m.checked))].sort().at(-1) ?? '';
  const head = MACHINES.map(
    (m) => `<th><span class="machine-name">${m.model}</span><br /><span class="meta">${m.bundle}</span></th>`,
  ).join('');
  const body = rows
    .map(
      ([label, value]) =>
        `<tr><td>${label}</td>${MACHINES.map((m) => `<td>${value(m)}</td>`).join('')}</tr>`,
    )
    .join('\n');

  return `<div class="table-scroll">
<table>
<caption>Headline specifications by exact model and bundle, as published by each manufacturer and checked ${checked}. Quoting a price without its bundle is how a comparison misleads without stating a falsehood, so the bundle is named in every column. This table is generated from the shared machine record, which is also what our <a href="/guides/which-freeze-dryer">buying guide</a> is checked against.</caption>
<thead>
<tr><th></th>${head}</tr>
</thead>
<tbody>
${body}
</tbody>
</table>
</div>`;
}
