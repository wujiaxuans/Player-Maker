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

/** ASCII-only draft filenames so `#` / Unicode never hit URL path or fragment parsing. */
export const DRAFT_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,180}\.md$/;

export function decodeDraftName(raw) {
  let n = typeof raw === 'string' ? raw : '';
  try { n = decodeURIComponent(n); } catch { /* keep raw */ }
  return n;
}

export function draftPath(name) {
  const n = decodeDraftName(name);
  if (!DRAFT_NAME_RE.test(n)) throw Object.assign(new Error('草稿名无效'), { status: 400 });
  return `drafts/${n}`;
}

/** Derive drafts/<id>.md from note text / basename (BV… or YT-…). */
export function draftFileName(text, basename = '') {
  const src = String(text || '');
  const base = String(basename || '');
  const bv = src.match(/\b(BV[0-9A-Za-z]+)\b/) || base.match(/^(BV[0-9A-Za-z]+)/);
  if (bv) return `${bv[1]}.md`;
  const ytUrl = src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([-\w]{6,})/i);
  if (ytUrl) return `YT-${ytUrl[1].replace(/^-/, '')}.md`;
  // Basename like YT--fdN68uCnA-Title.md → YT--fdN68uCnA.md (stop before -Title)
  const ytBase = base.match(/^(YT-+[A-Za-z0-9_]+)/i);
  if (ytBase) return `${ytBase[1]}.md`;
  const safe = base.replace(/\.md$/i, '').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 180);
  if (!safe || !/^[A-Za-z0-9]/.test(safe)) throw new Error('无法从笔记生成安全的草稿文件名（需要 BV 或 YouTube id）');
  return `${safe}.md`;
}

/** Human title from note body / front matter (for list UI). */
export function titleFromNote(text) {
  const src = String(text || '');
  const fence = src.match(/^---\n([\s\S]*?)\n---/);
  if (fence) {
    const line = fence[1].split('\n').find(l => /^title:\s*/.test(l));
    if (line) {
      let v = line.replace(/^title:\s*/, '').trim();
      try { v = JSON.parse(v); } catch { /* keep raw */ }
      if (v) return String(v).replace(/^["']|["']$/g, '');
    }
  }
  const h1 = src.match(/^#\s+(.+)$/m);
  if (h1) return h1[1].trim();
  const labeled = src.match(/^标题\s*[：:]\s*(.+)$/m);
  if (labeled) return labeled[1].trim();
  return '';
}

/** ASCII category + slug for content/posts/<category>/<slug>.md */
export const CATEGORY_RE = /^[a-z][a-z0-9-]{0,40}$/;
export const SLUG_RE = /^[a-z0-9-]{1,80}$/;

export function decodeParam(raw) {
  let n = typeof raw === 'string' ? raw : '';
  try { n = decodeURIComponent(n); } catch { /* keep raw */ }
  return n;
}

export function postPath(category, slug) {
  const c = decodeParam(category);
  const s = decodeParam(slug).replace(/\.md$/i, '');
  if (!CATEGORY_RE.test(c)) throw Object.assign(new Error('分类无效'), { status: 400 });
  if (!SLUG_RE.test(s)) throw Object.assign(new Error('链接名无效'), { status: 400 });
  return `content/posts/${c}/${s}.md`;
}

/** Prefer front-matter draft_id, else BV/YT from source or slug. */
export function draftNameFromPost(content, slug = '') {
  const src = String(content || '');
  const fence = src.match(/^---\n([\s\S]*?)\n---/);
  if (fence) {
    const line = fence[1].split('\n').find(l => /^draft_id:\s*/.test(l));
    if (line) {
      let v = line.replace(/^draft_id:\s*/, '').trim();
      try { v = JSON.parse(v); } catch { /* keep */ }
      v = String(v || '').replace(/\.md$/i, '');
      if (v && DRAFT_NAME_RE.test(`${v}.md`)) return `${v}.md`;
    }
  }
  return draftFileName(src, String(slug || '').replace(/\.md$/i, ''));
}
