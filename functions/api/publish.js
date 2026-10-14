import { github, json, draftPath } from '../_lib/github.js';
import { parseFrontMatter, stringifyFrontMatter } from '../../src/markdown.js';
import { categories } from '../../src/data.js';

export function buildPost(draft, input, today = new Date().toISOString().slice(0, 10)) {
  const { data, body } = parseFrontMatter(draft);
  if (!data.source || !data.author) throw Object.assign(new Error('草稿缺少 source / author（原视频链接和UP主），不能发布'), { status: 400 });
  const credit = `> 本文是视频学习笔记。原视频：[${data.video_title || data.title || data.source}](${data.source})，UP主：${data.author}。版权归原作者所有。`;
  const fm = {
    title: input.title || data.title, en: input.en || '', type: input.type || '视频笔记', desc: input.desc || data.desc || '',
    tags: Array.isArray(input.tags) ? input.tags.slice(0, 10).map(String) : [], date: today,
    source: data.source, author: data.author, image: 'architecture',
    cover: input.cover || data.cover || undefined,
  };
  return stringifyFrontMatter(fm, `${credit}\n\n${body.replace(/^\s*#\s+.*\n/, '')}`);
}

export async function onRequestPost({ env, request, data: ctx }) {
  const input = await request.json().catch(() => ({}));
  const src = draftPath(input.name);
  if (!categories.some(c => c.id === input.category)) return json({ error: '分类无效' }, 400);
  if (!/^[a-z0-9-]{1,80}$/.test(input.slug || '')) return json({ error: 'slug 只能用小写字母、数字和 -' }, 400);
  if (!input.title) return json({ error: '标题不能为空' }, 400);
  const gh = github(env);
  const dest = `content/posts/${input.category}/${input.slug}.md`;
  if (await gh.exists(dest)) return json({ error: `已存在同名文章：${dest}` }, 409);
  const { content } = await gh.get(src);
  const sha = await gh.commit([{ path: dest, content: buildPost(content, input) }, { path: src, delete: true }], `admin: publish ${input.name} -> ${dest} (${ctx.email})`);
  return json({ ok: true, path: dest, commit: sha });
}
