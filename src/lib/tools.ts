/** One registry for the hub, homepage, calculators, and their embed metadata. */
export interface Tool {
  slug: string;
  href: string;
  name: string;
  answers: string;
  summary: string;
  provenance: string;
  embeddable: boolean;
  homepageEmbed: boolean;
  /** A starting viewport height; scrolling remains available for expanded evidence. */
  embedHeight: number;
  dataHandling: 'browser-only-no-storage' | 'browser-only-local-storage';
  pending?: boolean;
  /** Compatibility names derived from the canonical fields, never authored twice. */
  title: string;
  label: string;
  dek: string;
  kicker: string;
}

type ToolDefinition = Omit<Tool, 'href' | 'title' | 'label' | 'dek' | 'kicker'>;
const definitions: ToolDefinition[] = [
  {
    slug: 'batch-log',
    name: 'Batch Log & Cost Tracker',
    answers: 'What did this batch actually cost me, and what changed since the last one?',
    summary: 'Record the food, load, cycle time and costs you enter, then compare runs. Records stay in this browser; export a CSV to keep a copy.',
    provenance: 'Your own batches and entered costs.',
    embeddable: false, homepageEmbed: false, embedHeight: 0,
    dataHandling: 'browser-only-local-storage',
  },
  {
    slug: 'running-cost',
    name: 'Freeze Dryer Running Cost Calculator',
    answers: 'What will a cycle cost in electricity?',
    summary: 'Multiply energy per cycle by your electricity rate. Compare the result with dated published figures and see the full arithmetic.',
    provenance: 'Published kWh, its stated conditions, and dated EIA rates.',
    embeddable: true, homepageEmbed: true, embedHeight: 1100,
    dataHandling: 'browser-only-no-storage',
  },
  {
    slug: 'absorber-calculator',
    name: 'Oxygen Absorber Calculator',
    answers: 'Which absorber size covers the air in my container?',
    summary: 'Calculate the oxygen load by container and food class, then compare the sizes publishers give, with their conditions and disagreements.',
    provenance: 'Manufacturer charts and university extension guidance, kept distinct.',
    embeddable: true, homepageEmbed: false, embedHeight: 1300,
    dataHandling: 'browser-only-no-storage',
  },
  {
    slug: 'batch-planner',
    name: 'Freeze-Drying Batch Planner',
    answers: 'How much can I dry, and what can I plan from the published figures?',
    summary: 'Check dried weight, trays or batches, and absorbers for your load. Where the research has no figure, the result says “Not published.”',
    provenance: 'Three secondary yield sources, four capacity publishers, and shared absorber data.',
    embeddable: true, homepageEmbed: false, embedHeight: 1450,
    dataHandling: 'browser-only-no-storage',
  },
  {
    slug: 'trail-meal-cost',
    name: 'Trail meal cost calculator',
    answers: 'What does my trail dinner cost per meal and per 500 calories?',
    summary: 'Compare your ingredients and packaging with three commercial pouches at dated prices. Enter measured yield to compare carried weight.',
    provenance: 'Dated ingredient and pouch prices; your measured yield.',
    embeddable: true, homepageEmbed: false, embedHeight: 1500,
    dataHandling: 'browser-only-no-storage',
  },
];

export const TOOLS: Tool[] = definitions.map((tool) => ({
  ...tool, href: `/tools/${tool.slug}`, title: tool.name, label: tool.name,
  dek: tool.summary, kicker: 'Free tool',
}));
export const SITE_ORIGIN = 'https://www.sublimepantry.com';
export function liveTools(): Tool[] { return TOOLS.filter((tool) => !tool.pending); }
export function homepageTool(): Tool | undefined { return liveTools().find((tool) => tool.homepageEmbed); }
export function toolByHref(href: string): Tool | undefined { return liveTools().find((tool) => tool.href === href); }
export function getTool(slug: string): Tool {
  const tool = liveTools().find((tool) => tool.slug === slug);
  if (!tool) throw new Error(`Unknown tool: ${slug}`);
  return tool;
}
export function toolPath(slug: string): string { return getTool(slug).href; }
export function toolUrl(tool: Tool): string { return `${SITE_ORIGIN}${tool.href}/`; }
export function embedUrl(tool: Tool): string { return `${toolUrl(tool)}?embed=1`; }
const escapeAttribute = (value: string): string => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
export function embedSnippet(tool: Tool): string {
  if (!tool.embeddable) throw new Error(`${tool.name} does not support embedding`);
  return `<iframe src="${embedUrl(tool)}" title="${escapeAttribute(tool.name)} — Sublime Pantry" width="100%" height="${tool.embedHeight}" style="border:0;max-width:100%;height:clamp(640px,85vh,${tool.embedHeight}px)" loading="lazy"></iframe>`;
}
