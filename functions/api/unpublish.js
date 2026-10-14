import { github, json, postPath, draftPath, draftNameFromPost, decodeParam, CATEGORY_RE, SLUG_RE } from '../_lib/github.js';
import { categories } from '../../src/data.js';
import { parseFrontMatter, stringifyFrontMatter } from '../../src/markdown.js';

/** Strip the auto-inserted credit line so re-publish won't duplicate it. */
export function toDraftContent(published) {
  const { data, body } = parseFrontMatter(published);
  const stripped = String(body).replace(/^\s*>\s*本文是视频学习笔记[\s\S]*?(?:\n\n|$)/, '');
  const draftId = data.draft_id || undefined;
  const fm = {
    title: data.title,
    video_title: data.video_title || data.title,
    source: data.source,
    author: data.author,
    desc: data.desc || undefined,
    cover: data.cover || undefined,
    type: data.type || undefined,
    tags: Array.isArray(data.tags) && data.tags.length ? data.tags : undefined,
    draft_id: draftId,
  };
  return stringifyFrontMatter(fm, stripped);
}

export async function onRequestPost({ env, request, data: ctx }) {
  const input = await request.json().catch(() => ({}));
  const category = decodeParam(input.category || '');
  const slug = decodeParam(input.slug || '').replace(/\.md$/i, '');
  if (!CATEGORY_RE.test(category) || !categories.some(c => c.id === category)) return json({ error: '分类无效' }, 400);
  if (!SLUG_RE.test(slug)) return json({ error: '链接名无效' }, 400);

  const gh = github(env);
  const src = postPath(category, slug);
  const { content } = await gh.get(src);
  const { data } = parseFrontMatter(content);
  if (!data.source || !data.author) return json({ error: '文章缺少 source / author，不能退回草稿' }, 400);

  let draftName;
  try {
    draftName = draftNameFromPost(content, slug);
  } catch (e) {
    return json({ error: e.message || '无法推导草稿文件名' }, 400);
  }
  const dest = draftPath(draftName);
  if (await gh.exists(dest)) return json({ error: `草稿已存在：${dest}` }, 409);

  const draftBody = toDraftContent(content);
  const sha = await gh.commit(
    [{ path: dest, content: draftBody }, { path: src, delete: true }],
    `admin: unpublish ${src} -> ${dest} (${ctx.email})`,
  );
  return json({ ok: true, draft: draftName, path: dest, commit: sha });
}
