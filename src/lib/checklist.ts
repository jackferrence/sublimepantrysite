/**
 * The Starter Checklist, written once.
 *
 * Section 7 of the messaging audit asks the homepage hero to show "the real
 * printable checklist preview", and specifically not an invented test bench or
 * a stock photograph presented as our own batch. The hero had neither — it had
 * the brand monogram in the image slot, which is U05.
 *
 * The literal reading of "real" is the useful one: the preview renders the
 * checklist's own headings and its own first items, from here, so it cannot
 * show something the printable page does not contain. A screenshot would go
 * stale the first time an item changed and nothing would say so.
 *
 * The lead magnet is the one asset the site's primary KPI depends on, and it is
 * now written in exactly one place.
 */

export interface ChecklistSection {
  /** Printed as the step number; also the section's order. */
  step: string;
  heading: string;
  items: string[];
}

export const CHECKLIST_SECTIONS: ChecklistSection[] = [
  {
    step: '01',
    heading: 'Before the batch',
    items: [
      'Machine is level, clean, and ready',
      'Vacuum pump / oil condition checked as applicable',
      'Food is prepared in reasonably even pieces',
      'Trays are not overloaded',
      'Batch name and starting weight are recorded',
    ],
  },
  {
    step: '02',
    heading: 'When the cycle finishes',
    items: [
      'Check thickest / densest pieces, not only surface pieces',
      'Break or cut representative pieces to check the center',
      'Add dry time if any cool, soft, gummy, or damp center remains',
      'Do not package until the batch is fully dry',
    ],
  },
  {
    step: '03',
    heading: 'Package immediately',
    items: [
      'Bags, absorbers, labels, and sealer are staged before opening the machine',
      'Choose a bag size that minimizes unnecessary headspace',
      'Add the appropriately sized oxygen absorber',
      'Heat seal the Mylar bag completely',
      'Inspect the entire seal for wrinkles, food, or gaps',
    ],
  },
  {
    step: '04',
    heading: 'Label and store',
    items: [
      'Label food name',
      'Label batch / package date',
      'Add notes needed to repeat or improve the batch',
      'Store sealed packages away from heat, light, moisture, and pests',
      'Log package count and any failures',
    ],
  },
];

/** The rule the checklist exists to enforce, quoted on both surfaces. */
export const CHECKLIST_RULE =
  'Packaging cannot fix an under-dried batch. When you are uncertain, verify dryness before sealing food for storage.';
