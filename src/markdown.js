// Minimal front matter + markdown -> body blocks (same block format as src/data.js).
export function parseFrontMatter(text) {
  const src = String(text).replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const m = src.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { data: {}, body: src };
  const data = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (/^[["{]/.test(v)) { try { v = JSON.parse(v); } catch { /* keep raw */ } }
    data[kv[1]] = v;
  }
  return { data, body: src.slice(m[0].length) };
}

export function stringifyFrontMatter(data, body) {
  const lines = Object.entries(data).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
  return `---\n${lines.join('\n')}\n---\n\n${String(body).replace(/^\n+/, '')}`;
}

const clean = s => s.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1').trim();

/** List item: `**title**：desc` → { t, d }; otherwise plain string. */
function listItem(raw) {
  const m = String(raw).match(/^\*\*(.+?)\*\*[：:]\s*(.*)$/);
  if (m) return { t: clean(m[1]), d: clean(m[2]) };
  return clean(raw);
}

/** Table row `| a | b |` → ['a', 'b']; `\|` stays a literal pipe. */
const tableCells = line => line.trim().replace(/^\|/, '').replace(/(?<!\\)\|$/, '').split(/(?<!\\)\|/).map(c => clean(c.replace(/\\\|/g, '|')));
const TABLE_SEP = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/;

/** GFM table → { table: { head, align, rows } }; lines without a separator row stay paragraphs. */
function tableBlock(lines) {
  if (lines.length < 2 || !TABLE_SEP.test(lines[1])) return lines.map(clean);
  const head = tableCells(lines[0]);
  const align = tableCells(lines[1]).map(c => c.startsWith(':') && c.endsWith(':') ? 'center' : c.endsWith(':') ? 'right' : c.startsWith(':') ? 'left' : null);
  const rows = lines.slice(2).map(line => head.map((_, i) => tableCells(line)[i] ?? ''));
  return [{ table: { head, align: align.slice(0, head.length), rows } }];
}

export function markdownToBlocks(md) {
  const blocks = [];
  let para = [];
  let list = null;
  let table = [];
  const flushPara = () => { if (para.length) blocks.push(clean(para.join(''))); para = []; };
  const flushList = () => { if (list) blocks.push(list); list = null; };
  const flushTable = () => { if (table.length) blocks.push(...tableBlock(table)); table = []; };
  for (const raw of String(md).replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trimEnd();
    let m;
    if (/^\s*\|.*\|$/.test(line)) { flushPara(); flushList(); table.push(line); continue; }
    flushTable();
    if (!line.trim()) { flushPara(); flushList(); continue; }
    if (/^\s*(---|\*\*\*)\s*$/.test(line)) { flushPara(); flushList(); continue; }
    if ((m = line.match(/^(#{1,4})\s+(.*)$/))) {
      flushPara(); flushList();
      const level = m[1].length, t = clean(m[2]);
      if (level === 1) continue; // title comes from front matter
      blocks.push(level === 2 ? { h: t } : level === 3 ? { h3: t } : { h4: t });
      continue;
    }
    if ((m = line.match(/^!\[([^\]]*)\]\(([^)\s]+)\)\s*$/))) { flushPara(); flushList(); blocks.push({ img: m[2], alt: m[1], caption: m[1] || undefined }); continue; }
    if ((m = line.match(/^\s*[-*+]\s+(.*)$/))) { flushPara(); if (!list || !list.ul) { flushList(); list = { ul: [] }; } list.ul.push(listItem(m[1])); continue; }
    if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) { flushPara(); if (!list || !list.ol) { flushList(); list = { ol: [] }; } list.ol.push(listItem(m[1])); continue; }
    flushList();
    para.push(line.replace(/^>\s?/, ''));
  }
  flushTable(); flushPara(); flushList();
  return blocks;
}

export function postFromMarkdown(text, fallbackSlug) {
  const { data, body } = parseFrontMatter(text);
  const tags = Array.isArray(data.tags) ? data.tags : data.tags ? String(data.tags).split(/[,，]/).map(s => s.trim()).filter(Boolean) : [];
  return {
    slug: data.slug || fallbackSlug, title: data.title || fallbackSlug, en: data.en || '', type: data.type || '视频笔记',
    image: data.image || 'architecture', cover: data.cover || undefined, desc: data.desc || '', tags,
    date: data.date || '', updated: data.updated || '', source: data.source || '', author: data.author || '',
    order: data.order != null ? Number(data.order) || 0 : 0,
    body: markdownToBlocks(body),
  };
}
