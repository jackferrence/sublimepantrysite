import { getCollection, type CollectionEntry } from 'astro:content';

export type Issue = CollectionEntry<'issues'>;

/** Newest first. */
export async function allIssues(): Promise<Issue[]> {
  return (await getCollection('issues')).sort((a, b) => b.data.date.localeCompare(a.data.date));
}

export const issueHref = (issue: Issue): string => `/newsletter/${issue.data.date}`;

/** "October 5, 2026", from a YYYY-MM-DD string, without a timezone shift. */
export function longDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/** What an issue is allowed to call itself. Never "sent" without a sentDate. */
export function issueLabel(issue: Issue): string {
  return issue.data.sentDate ? `Sent ${longDate(issue.data.sentDate)}` : 'Sample issue, not yet sent';
}
