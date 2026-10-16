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
