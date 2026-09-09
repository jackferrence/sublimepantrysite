/**
 * The tools, written once.
 *
 * `/tools` renders from this list rather than from hand-written cards, so a new
 * calculator appears on the hub by being added here and nowhere else. The nav
 * links the hub, not any individual tool, for the same reason: the header
 * should not need editing every time the toolbox grows.
 *
 * Only the Batch Log exists today. The other calculators are a separate
 * workstream and are not in this repo — the interface is here so they land
 * without a refactor, not as a claim that they are coming.
 *
 * `answers` is the question the tool settles, in the reader's words. It is not
 * a description of the tool: "what did this batch actually cost me?" tells you
 * whether to open it, "a cost tracker" does not.
 */

export interface Tool {
  /** Route. Tools live under /tools/ so the hub and the nav stay one prefix. */
  href: string;
  name: string;
  /** The question a reader arrives with, phrased as they would ask it. */
  answers: string;
  /** One line on what it does with that question. */
  summary: string;
  /**
   * Render this tool inline on the homepage. Nothing renders there until a tool
   * opts in, and nothing has: the homepage slot exists so that adding a tool is
   * the whole change, and an empty slot is empty rather than a placeholder.
   */
  homepageEmbed?: boolean;
  /**
   * `pending` keeps a designed-but-unbuilt tool out of the hub, the same way
   * nav.ts keeps an unbuilt route out of the nav. A pending tool is not
   * rendered and is not advertised.
   */
  pending?: boolean;
}

export const TOOLS: Tool[] = [
  {
    href: '/tools/batch-log',
    name: 'Batch Log & Cost Tracker',
    answers: 'What did this batch actually cost me, and what changed since the last one?',
    summary:
      'Record the food, load, cycle time and the costs you enter, then compare runs. Records stay in this browser; export a CSV to keep a copy.',
  },
];

/** The tools that exist. Everything rendered anywhere comes through here. */
export function liveTools(): Tool[] {
  return TOOLS.filter((tool) => !tool.pending);
}

/** The tool the homepage embeds, if any tool has asked to be embedded. */
export function homepageTool(): Tool | undefined {
  return liveTools().find((tool) => tool.homepageEmbed);
}
