// Tiny GitHub REST client for the Contents + Git Data APIs.
export function github(env, fetchImpl = fetch) {
  const repo = env.GITHUB_REPO, branch = env.GITHUB_BRANCH || 'main';
  if (!env.GITHUB_TOKEN || !repo) throw new Error('服务器未配置 GITHUB_TOKEN / GITHUB_REPO');
  const call = async (method, path, body) => {
    const res = await fetchImpl(`https://api.github.com/repos/${repo}${path}`, {
      method,
      headers: { authorization: `Bearer ${env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json', 'user-agent': 'player-maker-admin', 'x-github-api-version': '2022-11-28', ...(body ? { 'content-type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = res.status === 204 ? {} : await res.json().catch(() => ({}));
    if (!res.ok) { const e = new Error(`GitHub ${res.status}: ${data.message || ''}`); e.status = res.status; throw e; }
    return data;
  };
  const enc = p => p.split('/').map(encodeURIComponent).join('/');
  return {
    branch,
    list: dir => call('GET', `/contents/${enc(dir)}?ref=${encodeURIComponent(branch)}`).catch(e => { if (e.status === 404) return []; throw e; }),
    get: async path => {
      const d = await call('GET', `/contents/${enc(path)}?ref=${encodeURIComponent(branch)}`);
      const bytes = Uint8Array.from(atob(d.content.replace(/\n/g, '')), c => c.charCodeAt(0));
      return { content: new TextDecoder().decode(bytes), sha: d.sha };
    },
    exists: path => call('GET', `/contents/${enc(path)}?ref=${encodeURIComponent(branch)}`).then(() => true, e => { if (e.status === 404) return false; throw e; }),
    remove: (path, sha, message) => call('DELETE', `/contents/${enc(path)}`, { message, sha, branch }),
    // Atomic multi-file commit: changes = [{ path, content }] or [{ path, delete: true }]
    commit: async (changes, message) => {
      const ref = await call('GET', `/git/ref/heads/${encodeURIComponent(branch)}`);
      const parent = await call('GET', `/git/commits/${ref.object.sha}`);
      const tree = await call('POST', '/git/trees', { base_tree: parent.tree.sha, tree: changes.map(c => c.delete ? { path: c.path, mode: '100644', type: 'blob', sha: null } : { path: c.path, mode: '100644', type: 'blob', content: c.content }) });
      const commit = await call('POST', '/git/commits', { message, tree: tree.sha, parents: [ref.object.sha] });
      await call('PATCH', `/git/refs/heads/${encodeURIComponent(branch)}`, { sha: commit.sha });
      return commit.sha;
    },
  };
}

export const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

export function draftPath(name) {
  if (typeof name !== 'string' || !name.endsWith('.md') || name.includes('/') || name.includes('\\') || name.startsWith('.') || name.length > 200) throw Object.assign(new Error('草稿名无效'), { status: 400 });
  return `drafts/${name}`;
}
