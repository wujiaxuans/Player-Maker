import { github, json, draftPath, titleFromNote, decodeDraftName } from '../../_lib/github.js';

export async function onRequestGet({ env, request }) {
  const url = new URL(request.url);
  const q = url.searchParams.get('name');
  // Backup: GET /api/drafts?name=BV….md (avoids fragile path segments)
  if (q) {
    const path = draftPath(q);
    const file = await github(env).get(path);
    return json({ name: decodeDraftName(q), ...file });
  }
  const gh = github(env);
  const items = await gh.list('drafts');
  const md = items.filter(i => i.type === 'file' && i.name.endsWith('.md'));
  const drafts = await Promise.all(md.map(async i => {
    let title = '';
    try {
      const { content } = await gh.get(`drafts/${i.name}`);
      title = titleFromNote(content);
    } catch { /* list still works without titles */ }
    return { name: i.name, size: i.size, title: title || i.name.replace(/\.md$/i, '') };
  }));
  return json({ drafts });
}
