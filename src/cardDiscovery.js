const DAY = 86400000;
export function beijingDate(now = new Date()) {
  return new Date(now.getTime() + 8 * 3600000).toISOString().slice(0, 10);
}
const hash = text => { let h = 2166136261; for (const c of text) h = Math.imul(h ^ c.codePointAt(0), 16777619) >>> 0; return h; };
export function dailyCards(cards, date = beijingDate()) {
  // Stable rotation, interleaving categories; no refresh-time randomness.
  const buckets = new Map();
  for (const card of [...cards].sort((a,b) => hash(a.slug)-hash(b.slug) || a.slug.localeCompare(b.slug))) {
    const key = card.groups[0] || '';
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(card);
  }
  const queues = [...buckets.entries()].sort(([a],[b]) => a.localeCompare(b)).map(([,v]) => v);
  const ordered = [];
  while (queues.some(q => q.length)) for (const q of queues) if (q.length) ordered.push(q.shift());
  if (!ordered.length) return [];
  const start = Math.floor(Date.parse(date + 'T00:00:00Z') / DAY) * 3;
  return Array.from({length: Math.min(3, ordered.length)}, (_,i) => ordered[(start+i)%ordered.length]);
}
export function recentCards(cards, date = beijingDate()) {
  const today = Date.parse(date + 'T00:00:00Z');
  return cards.filter(card => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(card.addedAt || '')) return false;
    const age = today - Date.parse(card.addedAt + 'T00:00:00Z');
    return age >= 0 && age < 3 * DAY;
  }).sort((a,b) => b.addedAt.localeCompare(a.addedAt) || a.slug.localeCompare(b.slug));
}
