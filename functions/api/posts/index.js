import { github, json, titleFromNote } from '../../_lib/github.js';
import { categories } from '../../../src/data.js';
import { parseFrontMatter } from '../../../src/markdown.js';

export async function onRequestGet({ env }) {
  const gh = github(env);
  const posts = [];
  for (const cat of categories) {
    const items = await gh.list(`content/posts/${cat.id}`);
    const md = (Array.isArray(items) ? items : []).filter(i => i.type === 'file' && i.name.endsWith('.md'));
    for (const i of md) {
      const slug = i.name.replace(/\.md$/i, '');
      let title = '', desc = '', cover = '', type = '视频笔记', date = '', draft_id = '';
      try {
        const { content } = await gh.get(`content/posts/${cat.id}/${i.name}`);
        const { data } = parseFrontMatter(content);
        title = data.title || titleFromNote(content) || slug;
        desc = data.desc || '';
        cover = data.cover || '';
        type = data.type || type;
        date = data.date || '';
        draft_id = data.draft_id || '';
      } catch { title = slug; }
      posts.push({ category: cat.id, categoryCn: cat.cn, slug, name: i.name, title, desc, cover, type, date, draft_id, size: i.size });
    }
  }
  posts.sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(a.slug).localeCompare(String(b.slug)));
  return json({ posts });
}
