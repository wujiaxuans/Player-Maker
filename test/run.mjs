import assert from 'node:assert/strict';
import { generateKeyPairSync, createSign } from 'node:crypto';
import { markdownToBlocks, postFromMarkdown, parseFrontMatter } from '../src/markdown.js';
import { verifyAccessJwt, authenticate } from '../functions/_lib/auth.js';
import { buildPost } from '../functions/api/publish.js';
import { draftPath } from '../functions/_lib/github.js';
import { onRequestPost } from '../functions/api/publish.js';
import { onRequest as middleware } from '../functions/api/_middleware.js';

let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('ok', name); };

await t('markdown blocks', () => {
  const b = markdownToBlocks('# T\n\n## 00:00 开场\n- a **b**\n- c\n\n1. x\n2. y\n\npara\nline\n\n### s\n#### l\n![cap](/a.png)');
  assert.deepEqual(b, [{ h: '00:00 开场' }, { ul: ['a b', 'c'] }, { ol: ['x', 'y'] }, 'paraline', { h3: 's' }, { h4: 'l' }, { img: '/a.png', alt: 'cap', caption: 'cap' }]);
});

await t('publish builds credited post', () => {
  const draft = '---\ntitle: "视频"\nsource: "https://www.bilibili.com/video/BV1"\nauthor: "某UP"\n---\n\n# 视频\n\n## 一句话\n内容';
  const out = buildPost(draft, { title: '新标题', tags: ['a'] }, '2026-10-14');
  const p = postFromMarkdown(out, 'x');
  assert.equal(p.title, '新标题'); assert.equal(p.source, 'https://www.bilibili.com/video/BV1'); assert.deepEqual(p.tags, ['a']);
  assert.match(p.body[0], /原视频：\[视频\]\(https:\/\/www\.bilibili\.com\/video\/BV1\)，UP主：某UP/);
  assert.deepEqual(p.body[1], { h: '一句话' });
  assert.throws(() => buildPost('# no meta', {}), /source/);
});

await t('draft path validation', () => {
  assert.equal(draftPath('BV1-中文.md'), 'drafts/BV1-中文.md');
  for (const bad of ['../x.md', 'a/b.md', 'x.txt', '.hidden.md', undefined]) assert.throws(() => draftPath(bad));
});

// JWT
const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'RS256' };
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const sign = (payload, kid = 'k1', key = privateKey) => { const h = b64({ alg: 'RS256', kid }), p = b64(payload); const s = createSign('RSA-SHA256').update(`${h}.${p}`).sign(key).toString('base64url'); return `${h}.${p}.${s}`; };
const fetchCerts = async url => { assert.equal(url, 'https://team.cloudflareaccess.com/cdn-cgi/access/certs'); return new Response(JSON.stringify({ keys: [jwk] })); };
const env = { ADMIN_EMAIL: 'me@example.com', ACCESS_TEAM_DOMAIN: 'team.cloudflareaccess.com', ACCESS_AUD: 'aud1' };
const good = { email: 'me@example.com', aud: ['aud1'], exp: Math.floor(Date.now() / 1000) + 600 };
const req = (token) => new Request('https://x/api/drafts', { headers: token ? { 'Cf-Access-Jwt-Assertion': token } : {} });

await t('jwt accepts valid', async () => assert.equal(await authenticate(req(sign(good)), env, fetchCerts), 'me@example.com'));
await t('jwt rejects bad cases', async () => {
  const other = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
  for (const [tok, re] of [[null, /缺少/], [sign(good, 'k1', other), /签名/], [sign({ ...good, aud: 'x' }), /aud/], [sign({ ...good, exp: 1 }), /过期/], [sign({ ...good, email: 'evil@x.com' }), /邮箱/], [sign(good, 'k9'), /密钥/]])
    await assert.rejects(authenticate(req(tok), env, fetchCerts), re);
  await assert.rejects(authenticate(req(sign(good)), { ADMIN_EMAIL: 'me@example.com' }, fetchCerts), /未配置/);
});
await t('middleware returns 401 without token', async () => {
  const res = await middleware({ request: req(null), env, data: {}, next: () => new Response('should not reach') });
  assert.equal(res.status, 401);
});

await t('publish endpoint does one atomic commit (mock GitHub)', async () => {
  const calls = []; const realFetch = globalThis.fetch;
  const draft = Buffer.from('---\ntitle: "T"\nsource: "https://b/v"\nauthor: "U"\n---\n\n# T\n\nbody').toString('base64');
  globalThis.fetch = async (url, init = {}) => {
    const m = init.method || 'GET'; const path = url.replace('https://api.github.com/repos/o/r', ''); calls.push(`${m} ${path}`);
    assert.equal(init.headers.authorization, 'Bearer tok');
    const r = d => new Response(JSON.stringify(d), { status: 200 });
    if (m === 'GET' && path.startsWith('/contents/content/')) return new Response('{"message":"Not Found"}', { status: 404 });
    if (m === 'GET' && path.startsWith('/contents/drafts/')) return r({ content: draft, sha: 's' });
    if (path.startsWith('/git/ref/')) return r({ object: { sha: 'head' } });
    if (path.startsWith('/git/commits/')) return r({ tree: { sha: 'tree0' } });
    if (path === '/git/trees') { const b = JSON.parse(init.body); assert.equal(b.tree.length, 2); assert.equal(b.tree[1].sha, null); assert.equal(b.tree[0].path, 'content/posts/methods/my-note.md'); assert.match(b.tree[0].content, /UP主：U/); return r({ sha: 'tree1' }); }
    if (path === '/git/commits') return r({ sha: 'c1' });
    if (m === 'PATCH') { assert.equal(JSON.parse(init.body).sha, 'c1'); return r({}); }
    throw new Error('unexpected ' + m + path);
  };
  try {
    const request = new Request('https://x/api/publish', { method: 'POST', body: JSON.stringify({ name: 'BV1-x.md', category: 'methods', slug: 'my-note', title: 'T', tags: [] }) });
    const res = await onRequestPost({ env: { GITHUB_TOKEN: 'tok', GITHUB_REPO: 'o/r', GITHUB_BRANCH: 'main' }, request, data: { email: 'me' } });
    assert.equal(res.status, 200, await res.clone().text());
    assert.equal(calls.filter(c => c.startsWith('PATCH')).length, 1);
    const bad = await onRequestPost({ env: { GITHUB_TOKEN: 'tok', GITHUB_REPO: 'o/r' }, request: new Request('https://x', { method: 'POST', body: JSON.stringify({ name: 'a.md', category: 'nope', slug: 'a', title: 'T' }) }), data: {} });
    assert.equal(bad.status, 400);
  } finally { globalThis.fetch = realFetch; }
});
console.log(`${n} test groups passed`);
