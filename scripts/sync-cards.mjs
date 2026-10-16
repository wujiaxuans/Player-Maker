// Sync design cards from the MDA library into content/cards/cards.json.
// Usage: node scripts/sync-cards.mjs [libraryDir]  (default: ../game-design-library)
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beijingDate } from '../src/cardDiscovery.js';
import { parseCard, parseGrouping } from '../src/cardParse.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const lib = process.argv[2] || join(root, '..', 'game-design-library');
const grouping = parseGrouping(readFileSync(join(lib, '体验分组草案.md'), 'utf8'));
const files = readdirSync(join(lib, 'cards')).filter(f => f.endsWith('.md')).sort((a, b) => a.localeCompare(b, 'zh'));
const existing = new Map(JSON.parse(readFileSync(join(root, 'content', 'cards', 'cards.json'), 'utf8')).map(c => [c.slug, c]));
const missing = [];
const cards = files.map(f => {
  const slug = f.replace(/\.md$/, '');
  const card = parseCard(readFileSync(join(lib, 'cards', f), 'utf8'), slug);
  const g = grouping.get(slug);
  if (!g) missing.push(slug);
  return { ...card, addedAt: existing.has(slug) ? (existing.get(slug).addedAt || null) : beijingDate(), groups: g?.groups || [], tags: g?.tags || { 体验: [], 机制: [], 品类: [] } };
});
const names = new Set(cards.map(c => c.slug));
for (const c of cards) c.related = c.related.map(text => {
  const name = text.replace(/[（(].*$/, '').trim();
  const note = text.slice(name.length).replace(/^[（(]|[）)]$/g, '').trim();
  return { name, note, slug: names.has(name) ? name : null };
});
writeFileSync(join(root, 'content', 'cards', 'cards.json'), JSON.stringify(cards, null, 1) + '\n');
console.log(`synced ${cards.length} cards` + (missing.length ? `; not in grouping: ${missing.join(', ')}` : ''));
if (missing.length) process.exitCode = 1;
