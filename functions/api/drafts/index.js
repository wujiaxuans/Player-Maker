import { github, json } from '../../_lib/github.js';

export async function onRequestGet({ env }) {
  const items = await github(env).list('drafts');
  return json({ drafts: items.filter(i => i.type === 'file' && i.name.endsWith('.md')).map(i => ({ name: i.name, size: i.size })) });
}
