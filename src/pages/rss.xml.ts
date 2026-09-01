import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const entries = await getCollection('articles');
  return rss({
    title: 'Sublime Pantry',
    description: 'Home freeze-drying, batch by batch: machine decisions, troubleshooting, storage, and cottage-business economics.',
    site: context.site ?? 'https://www.sublimepantry.com',
    items: entries.map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      link: `/${entry.data.pillar}/${entry.id}/`,
      pubDate: new Date(`${entry.data.publishedDate}T00:00:00.000Z`),
    })),
  });
}
