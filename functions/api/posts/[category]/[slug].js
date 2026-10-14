import { github, json, postPath, decodeParam, SLUG_RE, CATEGORY_RE } from '../../../_lib/github.js';
import { categories } from '../../../../src/data.js';
import { parseFrontMatter, stringifyFrontMatter } from '../../../../src/markdown.js';

function assertCategory(id) {
  const c = decodeParam(id);
  if (!CATEGORY_RE.test(c) || !categories.some(x => x.id === c)) {
    throw Object.assign(new Error('分类无效'), { status: 400 });
  }
  return c;
}

function assertSlug(s) {
  const slug = decodeParam(s).replace(/\.md$/i, '');
  if (!SLUG_RE.test(slug)) throw Object.assign(new Error('链接名无效'), { status: 400 });
  return slug;
}

export async function onRequestGet({ env, params }) {
  const category = assertCategory(params.category);
  const slug = assertSlug(params.slug);
  const path = postPath(category, slug);
  const file = await github(env).get(path);
  const { data } = parseFrontMatter(file.content);
  return json({ category, slug, path, ...file, meta: data });
}

export async function onRequestPut({ env, params, request, data: ctx }) {
  const category = assertCategory(params.category);
  const slug = assertSlug(params.slug);
  const input = await request.json().catch(() => ({}));
  const newCategory = input.category ? assertCategory(input.category) : category;
  if (!categories.some(c => c.id === newCategory)) return json({ error: '分类无效' }, 400);

  const gh = github(env);
  const srcPath = postPath(category, slug);
  const { content: old } = await gh.get(srcPath);
  const { data: existing, body: oldBody } = parseFrontMatter(old);

  const title = (input.title != null ? String(input.title) : existing.title || '').trim();
  if (!title) return json({ error: '标题不能为空' }, 400);

  const tags = Array.isArray(input.tags)
    ? input.tags.slice(0, 10).map(String)
    : typeof input.tags === 'string'
      ? input.tags.split(/[,，]/).map(s => s.trim()).filter(Boolean).slice(0, 10)
      : (Array.isArray(existing.tags) ? existing.tags : []);

  // Body: prefer explicit markdown body (after front matter). Keep credit unless user edited it away.
  let body = input.body != null ? String(input.body) : oldBody;
  // Strip accidental leading front matter if client sent full file
  if (body.startsWith('---\n')) {
    const parsed = parseFrontMatter(body);
    body = parsed.body;
  }

  const fm = {
    title,
    en: input.en != null ? String(input.en) : (existing.en || ''),
    type: input.type != null ? String(input.type) : (existing.type || '视频笔记'),
    desc: input.desc != null ? String(input.desc) : (existing.desc || ''),
    tags,
    date: existing.date || new Date().toISOString().slice(0, 10),
    source: existing.source,
    author: existing.author,
    image: existing.image || 'architecture',
    cover: input.cover != null ? (input.cover || undefined) : existing.cover,
    draft_id: existing.draft_id || undefined,
  };
  // Never drop source/author on edit
  if (!fm.source || !fm.author) return json({ error: '文章缺少 source / author，不能保存' }, 400);

  const next = stringifyFrontMatter(fm, body);
  const destPath = postPath(newCategory, slug);

  if (destPath === srcPath) {
    const sha = await gh.commit([{ path: destPath, content: next }], `admin: update ${destPath} (${ctx.email})`);
    return json({ ok: true, path: destPath, category: newCategory, slug, commit: sha });
  }

  if (await gh.exists(destPath)) return json({ error: `目标已存在：${destPath}` }, 409);
  const sha = await gh.commit(
    [{ path: destPath, content: next }, { path: srcPath, delete: true }],
    `admin: move ${srcPath} -> ${destPath} (${ctx.email})`,
  );
  return json({ ok: true, path: destPath, category: newCategory, slug, commit: sha });
}
