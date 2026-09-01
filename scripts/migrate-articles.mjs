#!/usr/bin/env node
// One-time migration: extract article content from the legacy committed
// HTML build output into src/content/articles/*.json (strict content
// collection source). Run once during the Astro reconstruction, then
// this script can be deleted — it is not part of ongoing site operation.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

const FILES = [
  { file: 'guides/complete-batch-workflow.html', pillar: 'guides', slug: 'complete-batch-workflow' },
  { file: 'guides/which-freeze-dryer.html', pillar: 'guides', slug: 'which-freeze-dryer' },
  { file: 'guides/cottage-economics.html', pillar: 'guides', slug: 'cottage-economics' },
  { file: 'troubleshooting/batch-not-dry.html', pillar: 'troubleshooting', slug: 'batch-not-dry' },
  { file: 'troubleshooting/chewy-candy.html', pillar: 'troubleshooting', slug: 'chewy-candy' },
  { file: 'troubleshooting/vacuum-error.html', pillar: 'troubleshooting', slug: 'vacuum-error' },
  { file: 'troubleshooting/rehydration-problems.html', pillar: 'troubleshooting', slug: 'rehydration-problems' },
  { file: 'troubleshooting/storage-failure.html', pillar: 'troubleshooting', slug: 'storage-failure' },
  { file: 'compare/home-freeze-dryers.html', pillar: 'compare', slug: 'home-freeze-dryers' },
  { file: 'compare/storage-containers.html', pillar: 'compare', slug: 'storage-containers' },
];

function extractBalancedDiv(html, openTag) {
  const start = html.indexOf(openTag);
  if (start === -1) throw new Error(`open tag not found: ${openTag}`);
  let i = start + openTag.length;
  let depth = 1;
  const divRe = /<div\b|<\/div>/g;
  divRe.lastIndex = i;
  let m;
  while ((m = divRe.exec(html))) {
    if (m[0] === '<\/div>') {
      depth--;
      if (depth === 0) {
        return html.slice(i, m.index);
      }
    } else {
      depth++;
    }
  }
  throw new Error('unbalanced div');
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

for (const { file, pillar, slug } of FILES) {
  const html = readFileSync(ROOT + file, 'utf8');

  const title = decodeEntities(html.match(/<title>(.*?)\s*\|\s*Sublime Pantry<\/title>/)[1]);
  const description = decodeEntities(html.match(/<meta name="description" content="(.*?)">/)[1]);

  const headerBlock = html.match(/<header class="article-header">([\s\S]*?)<\/header>/)[1];
  const kicker = decodeEntities(headerBlock.match(/<span class="kicker">(.*?)<\/span>/)[1]);
  const publishedDate = headerBlock.match(/<time datetime="(\d{4}-\d{2}-\d{2})/)[1];

  const disclosureMatch = html.match(/<p class="disclosure-line">(.*?)<\/p>/);
  const disclosure = disclosureMatch ? decodeEntities(disclosureMatch[1]) : 'Sublime Pantry has no affiliate relationships as of publication. No link in this article earns us money.';

  const riskClass = /<div class="notice" role="note">\s*<strong>Food safety note:/.test(html) ? 'elevated' : 'standard';

  // Sources
  const sourcesSection = html.match(/<section class="sources"[^>]*>([\s\S]*?)<\/section>/);
  const sources = [];
  if (sourcesSection) {
    const liRe = /<li><a href="([^"]+)"[^>]*>(.*?)<\/a>\s*(?:&mdash;|—|-)\s*([^<]*?)\s*<span class="tier-tag">(\w+)<\/span>\s*(?:&middot;|·)\s*accessed (\d{4}-\d{2}-\d{2})<\/li>/g;
    let m;
    while ((m = liRe.exec(sourcesSection[1]))) {
      sources.push({
        url: m[1],
        title: decodeEntities(m[2]),
        publisher: decodeEntities(m[3].trim()),
        tier: m[4],
        accessDate: m[5],
      });
    }
  }

  // HowTo / FAQ JSON-LD
  let howTo, faq;
  const ldRe = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let lm;
  while ((lm = ldRe.exec(html))) {
    let data;
    try { data = JSON.parse(lm[1]); } catch { continue; }
    if (data['@type'] === 'HowTo' && Array.isArray(data.step)) {
      howTo = data.step.map((s) => ({ name: s.name, text: s.text }));
    }
    if (data['@type'] === 'FAQPage' && Array.isArray(data.mainEntity)) {
      faq = data.mainEntity.map((q) => ({ question: q.name, answer: q.acceptedAnswer.text }));
    }
  }

  // Comparison criteria (compare pillar): first-column row labels of the first table
  let comparisonCriteria;
  if (pillar === 'compare') {
    const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/);
    comparisonCriteria = [];
    if (tableMatch) {
      const rowRe = /<tr><td>([^<]+)<\/td>/g;
      let rm;
      while ((rm = rowRe.exec(tableMatch[1]))) {
        comparisonCriteria.push({ label: decodeEntities(rm[1]) });
      }
    }
  }

  const bodyHtml = extractBalancedDiv(html, '<div class="article-body">');

  const record = {
    title,
    description,
    kicker,
    pillar,
    riskClass,
    publishedDate,
    author: 'Jack Ferrence',
    disclosure,
    sources,
    ...(comparisonCriteria ? { comparisonCriteria } : {}),
    ...(faq ? { faq } : {}),
    ...(howTo ? { howTo } : {}),
    bodyHtml,
  };

  const outPath = `${ROOT}src/content/articles/${slug}.json`;
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(record, null, 2) + '\n');
  console.log(`wrote ${slug}.json (${sources.length} sources${comparisonCriteria ? `, ${comparisonCriteria.length} criteria` : ''})`);
}
