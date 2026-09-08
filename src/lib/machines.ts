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
 * `tests/machine-specs.test.mjs`. The articles are hand-authored HTML, so the
 * test asserts agreement rather than generating the tables — change a figure
 * here and the test tells you which article still disagrees.
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
