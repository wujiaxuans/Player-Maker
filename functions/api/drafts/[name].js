import { github, json, draftPath, decodeDraftName } from '../../_lib/github.js';

export async function onRequestGet({ env, params, request }) {
  const url = new URL(request.url);
  const name = url.searchParams.get('name') || params.name;
  const path = draftPath(name);
  const file = await github(env).get(path);
  return json({ name: decodeDraftName(name), ...file });
}

export async function onRequestDelete({ env, params, request, data }) {
  const url = new URL(request.url);
  const name = url.searchParams.get('name') || params.name;
  const path = draftPath(name);
  const gh = github(env);
  const { sha } = await gh.get(path);
  await gh.remove(path, sha, `admin: discard draft ${decodeDraftName(name)} (${data.email})`);
  return json({ ok: true });
}
