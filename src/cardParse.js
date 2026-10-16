// Pure parsers shared by scripts/sync-cards.mjs and tests.
const FIELD = [
  ['problem', /^(解决的设计问题|解决的问题)$/],
  ['m', /^(机制\(M\)|M|M（机制）|机制)$/],
  ['d', /^(动态\(D\)|D|D（动态）|动态)$/],
  ['a', /^(美学\(A\)|A|A（美学）|美学)$/],
  ['premise', /^(前提条件|前提)$/],
  ['risk', /^(风险与代价|风险)$/],
  ['source', /^来源$/],
  ['related', /^关联$/],
  ['rawTags', /^标签$/],
];

export function parseCard(text, slug) {
  const card = { slug, title: slug.replace(/^[^-]+-/, ''), insight: false, problem: '', m: '', d: '', a: '', premise: '', risk: '', source: '', related: [], extra: [] };
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (/^#\s/.test(line)) { card.title = line.replace(/^#\s+/, ''); continue; }
    if (/用户见解/.test(line)) card.insight = true;
    if (/^\*\*来源类型/.test(line)) continue;
    const m = line.match(/^-\s*([^：:]+?)\s*[：:]\s*(.*)$/);
    const key = m && FIELD.find(([, re]) => re.test(m[1].trim()))?.[0];
    if (!key) { card.extra.push(line.replace(/^-\s*/, '')); continue; }
    if (key === 'related') card.related = splitTop(m[2]);
    else if (key !== 'rawTags') card[key] = card[key] ? `${card[key]}；${m[2]}` : m[2];
  }
  return card;
}

const split = s => s.split('、').map(x => x.trim()).filter(x => x && x !== '—');

// Reads the grouping draft: "## 组名（n）" sections with tables | 卡片 | 同时属于 | 体验 | 机制 | 品类 |.
export function parseGrouping(text) {
  const out = new Map();
  let group = null;
  for (const line of text.split('\n')) {
    const h = line.match(/^##\s+(.+?)（\d+）/);
    if (h) { group = h[1]; continue; }
    const r = line.match(/^\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|$/);
    if (!group || !r || r[1] === '卡片' || /^-+$/.test(r[1])) continue;
    const cur = out.get(r[1]) || { groups: [], tags: { 体验: split(r[3]), 机制: split(r[4]), 品类: split(r[5]) } };
    if (!cur.groups.includes(group)) cur.groups.push(group);
    out.set(r[1], cur);
  }
  return out;
}

// Split on 、，; but not inside （）/(). Each item: "name（note）".
function splitTop(text) {
  const out = []; let cur = '', depth = 0;
  for (const ch of text) {
    if ('（('.includes(ch)) depth++;
    if ('）)'.includes(ch)) depth = Math.max(0, depth - 1);
    if (!depth && '、,，;；'.includes(ch)) { if (cur.trim()) out.push(cur.trim()); cur = ''; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
