export const GROUPS = ['取舍与策略', '挑战与精通', '成长与力量', '风险与刺激', '公平与可接受的失败', '发现与新鲜感', '表达与自由', '幻想与主题', '社交与协作', '设计方法与工具'];
export const TAG_DIMS = ['体验', '机制', '品类'];

export function groupCounts(cards) {
  return Object.fromEntries(GROUPS.map(g => [g, cards.filter(c => c.groups.includes(g)).length]));
}

// Tags available per dimension, ordered by frequency then name.
export function tagVocabulary(cards) {
  return Object.fromEntries(TAG_DIMS.map(dim => {
    const count = new Map();
    for (const c of cards) for (const t of c.tags[dim] || []) count.set(t, (count.get(t) || 0) + 1);
    return [dim, [...count].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh')).map(([t]) => t)];
  }));
}

// group: one group or null. tags: { 体验: [...], ... }. Within a dimension tags are OR; across dimensions AND.
export function filterCards(cards, { group = null, tags = {} } = {}) {
  return cards.filter(c => (!group || c.groups.includes(group)) &&
    TAG_DIMS.every(dim => !(tags[dim] || []).length || tags[dim].some(t => (c.tags[dim] || []).includes(t))));
}

// One plain line per group, describing what its cards cover.
export const GROUP_DESC = {
  取舍与策略: '让选项带上代价，玩家需要权衡和提前规划',
  挑战与精通: '难度怎么定，玩家的技术和理解怎么随练习提高',
  成长与力量: '构筑和数值变强的过程，以及变强之后的爽感',
  风险与刺激: '押上资产换收益，让一局里一直有紧张感',
  公平与可接受的失败: '输了能归因到自己，落后时还有机会追回',
  发现与新鲜感: '每局不一样，持续出现没见过的组合和内容',
  表达与自由: '允许玩家用自己的打法和节奏去玩',
  幻想与主题: '规则和题材对上，让玩家相信这个世界',
  社交与协作: '多人之间有共同目标，需要沟通和配合',
  设计方法与工具: '设计师这一侧的方法：平衡数据、循环分析、范围和卡池规划',
};
export const ALL_DESC = total => `${total} 张，按玩家体验分组`;

// Tag counts for one dimension within a card set (e.g. the current group), sorted by count then name.
export function tagCounts(cards, dim, vocab) {
  const count = new Map(vocab.map(t => [t, 0]));
  for (const c of cards) for (const t of c.tags[dim] || []) count.set(t, (count.get(t) || 0) + 1);
  return [...count].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh')).map(([tag, n]) => ({ tag, n }));
}

// "teemo.dev《X》 https://a.b/c" → { text: 'teemo.dev《X》', links: [{ href, host }] }
export function splitSource(source) {
  const links = [];
  const text = String(source || '').replace(/https?:\/\/[^\s；，、）)]+/g, href => {
    let host = href; try { host = new URL(href).hostname.replace(/^www\./, ''); } catch {}
    links.push({ href, host }); return '';
  }).replace(/\s*[；;]\s*(?=[；;]|$)/g, '').replace(/\s{2,}/g, ' ').replace(/[\s；;，,]+$/, '').trim();
  return { text, links };
}

// Visible card range for a track: cards of width `step` (card + gap).
export function visibleRange({ scrollLeft, clientWidth }, total, step = 296, fade = 128) {
  if (!total) return [0, 0];
  const first = Math.min(total, Math.floor(scrollLeft / step) + 1);
  const last = Math.max(first, Math.min(total, Math.floor((scrollLeft + clientWidth - fade) / step)));
  return [first, last];
}
