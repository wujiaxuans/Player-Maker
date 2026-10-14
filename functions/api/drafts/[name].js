import { github, json, draftPath } from '../../_lib/github.js';

export async function onRequestGet({ env, params }) {
  const path = draftPath(params.name);
  return json({ name: params.name, ...(await github(env).get(path)) });
}

export async function onRequestDelete({ env, params, data }) {
  const path = draftPath(params.name);
  const gh = github(env);
  const { sha } = await gh.get(path);
  await gh.remove(path, sha, `admin: discard draft ${params.name} (${data.email})`);
  return json({ ok: true });
}
