import assert from 'node:assert/strict';
import { generateKeyPairSync, createSign } from 'node:crypto';
import { comparePosts, sortPosts } from '../src/sort.js';
import { markdownToBlocks, postFromMarkdown, parseFrontMatter } from '../src/markdown.js';
import { verifyAccessJwt, authenticate } from '../functions/_lib/auth.js';
import { buildPost } from '../functions/api/publish.js';
import { draftPath, draftFileName, titleFromNote, DRAFT_NAME_RE, postPath, draftNameFromPost, CATEGORY_RE, SLUG_RE } from '../functions/_lib/github.js';
import { onRequestPost } from '../functions/api/publish.js';
import { onRequest as middleware } from '../functions/api/_middleware.js';
import { onRequestGet as listPosts } from '../functions/api/posts/index.js';
import { onRequestGet as getPost, onRequestPut as putPost } from '../functions/api/posts/[category]/[slug].js';
import { onRequestPost as unpublish, toDraftContent } from '../functions/api/unpublish.js';

import { paginate, pageCount, PAGE_SIZE } from '../src/paginate.js';
import { filterCards, groupCounts, tagVocabulary, GROUPS } from '../src/cardFilter.js';
import { parseCard, parseGrouping } from '../src/cardParse.js';
import { parseCardsRoute, cardsHref, cardHref, wheelTarget, bounceOffset } from '../src/cardRoute.js';
import { readFileSync } from 'node:fs';
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('ok', name); };

await t('markdown blocks', () => {
  const b = markdownToBlocks('# T\n\n## 00:00 开场\n- a **b**\n- c\n\n1. x\n2. y\n\npara\nline\n\n### s\n#### l\n![cap](/a.png)');
  assert.deepEqual(b, [{ h: '00:00 开场' }, { ul: ['a b', 'c'] }, { ol: ['x', 'y'] }, 'paraline', { h3: 's' }, { h4: 'l' }, { img: '/a.png', alt: 'cap', caption: 'cap' }]);
  const titled = markdownToBlocks('1. **设计师想做什么**：先写目的。\n2. plain');
  assert.deepEqual(titled, [{ ol: [{ t: '设计师想做什么', d: '先写目的。' }, 'plain'] }]);
});

await t('posts sort newest first with tie-breakers', () => {
  const posts = [
    { title: 'b', date: '2026-10-14', order: 10 },
    { title: 'a', date: '2026-10-14', order: 1 },
    { title: 'new', date: '2026-10-15', order: 2 },
    { title: 'upd', date: '2026-10-14', updated: '2026-10-16' },
    { title: 'old', date: '2026-01-01', order: 1 },
  ];
  assert.deepEqual(sortPosts(posts).map(p => p.title), ['new', 'upd', 'a', 'b', 'old']);
  assert.equal(comparePosts({ title: 'x', date: '2026-10-14' }, { title: 'y', date: '2026-10-14' }) < 0, true);
  assert.equal(postFromMarkdown('---\ndate: "2026-10-14"\nupdated: "2026-10-15"\n---\nx', 's').updated, '2026-10-15');
});

await t('publish builds credited post with draft_id', () => {
  const draft = '---\ntitle: "视频"\nsource: "https://www.bilibili.com/video/BV1"\nauthor: "某UP"\n---\n\n# 视频\n\n## 一句话\n内容';
  const out = buildPost(draft, { title: '新标题', tags: ['a'], cover: '/media/covers/BV1.png', name: 'BV1mbDSB5EGx.md' }, '2026-10-14');
  const p = postFromMarkdown(out, 'x');
  assert.equal(p.title, '新标题'); assert.equal(p.source, 'https://www.bilibili.com/video/BV1'); assert.deepEqual(p.tags, ['a']);
  assert.equal(p.cover, '/media/covers/BV1.png');
  assert.match(p.body[0], /原视频：\[视频\]\(https:\/\/www\.bilibili\.com\/video\/BV1\)，UP主：某UP/);
  assert.deepEqual(p.body[1], { h: '一句话' });
  assert.equal(parseFrontMatter(out).data.draft_id, 'BV1mbDSB5EGx');
  assert.throws(() => buildPost('# no meta', {}), /source/);
});

await t('draft path only allows safe ASCII names', () => {
  assert.equal(draftPath('BV1mbDSB5EGx.md'), 'drafts/BV1mbDSB5EGx.md');
  assert.equal(draftPath('YT--fdN68uCnA.md'), 'drafts/YT--fdN68uCnA.md');
  assert.equal(draftPath(encodeURIComponent('BV18EL369EoC.md')), 'drafts/BV18EL369EoC.md');
  assert.ok(DRAFT_NAME_RE.test('BV1.md'));
  for (const bad of [
    '../x.md', 'a/b.md', 'x.txt', '.hidden.md', undefined,
    'BV1-中文.md', '提灯#40.md', 'game【提灯#40】.md',
    'a'.repeat(200) + '.md',
  ]) assert.throws(() => draftPath(bad), /草稿名无效|Cannot/);
});

await t('postPath only allows ASCII category + slug', () => {
  assert.equal(postPath('methods', 'bv1mbdsb5egx'), 'content/posts/methods/bv1mbdsb5egx.md');
  assert.equal(postPath('breakdowns', 'my-note.md'), 'content/posts/breakdowns/my-note.md');
  for (const [c, s] of [['Methods', 'a'], ['methods', 'A'], ['../x', 'a'], ['methods', 'a/b'], ['方法', 'a'], ['methods', '中文'], ['methods', ''], ['', 'a']])
    assert.throws(() => postPath(c, s), /分类无效|链接名无效/);
  assert.ok(CATEGORY_RE.test('methods') && SLUG_RE.test('bv1-note'));
});

await t('draftFileName derives BV/YT short ids', () => {
  assert.equal(draftFileName('source: https://www.bilibili.com/video/BV1mbDSB5EGx\n', 'long-中文.md'), 'BV1mbDSB5EGx.md');
  assert.equal(draftFileName('https://www.youtube.com/watch?v=--fdN68uCnA', 'note.md'), 'YT--fdN68uCnA.md');
  assert.equal(draftFileName('', 'YT--fdN68uCnA-MonsterTrain2.md'), 'YT--fdN68uCnA.md');
  assert.equal(draftFileName('', 'BV18EL369EoC-撤离玩法.md'), 'BV18EL369EoC.md');
});

await t('draftNameFromPost prefers draft_id then source', () => {
  assert.equal(draftNameFromPost('---\ndraft_id: "BV1mbDSB5EGx"\nsource: "https://b/v"\n---\n', 'x'), 'BV1mbDSB5EGx.md');
  assert.equal(draftNameFromPost('---\nsource: "https://www.bilibili.com/video/BV18EL369EoC"\n---\n', 'bv18'), 'BV18EL369EoC.md');
});

await t('toDraftContent strips credit for re-publish', () => {
  const pub = '---\ntitle: "T"\nsource: "https://b/v"\nauthor: "U"\ndraft_id: "BV1"\n---\n\n> 本文是视频学习笔记。原视频：[T](https://b/v)，UP主：U。版权归原作者所有。\n\n## 一句话\n正文';
  const d = toDraftContent(pub);
  assert.doesNotMatch(d, /本文是视频学习笔记/);
  assert.match(d, /## 一句话/);
  assert.equal(parseFrontMatter(d).data.draft_id, 'BV1');
});

await t('titleFromNote reads heading / front matter', () => {
  assert.equal(titleFromNote('---\ntitle: "你好"\n---\n\n# 别的'), '你好');
  assert.equal(titleFromNote('# 撤离玩法设计迭代观察【游戏提灯#40】\n\n正文'), '撤离玩法设计迭代观察【游戏提灯#40】');
});

await t('API paths never contain raw #', () => {
  for (const name of ['BV1mbDSB5EGx.md', 'BV18EL369EoC.md', 'BV1yK411A7pN.md', 'YT--fdN68uCnA.md']) {
    assert.ok(DRAFT_NAME_RE.test(name), name);
    const path = `/api/drafts/${encodeURIComponent(name)}`;
    assert.ok(!path.includes('#'), path);
    assert.equal(draftPath(name), `drafts/${name}`);
  }
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

function mockGithub(handlers) {
  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const m = init.method || 'GET';
    const path = String(url).replace('https://api.github.com/repos/o/r', '');
    calls.push(`${m} ${path}`);
    assert.equal(init.headers.authorization, 'Bearer tok');
    return handlers(m, path, init, calls);
  };
  return {
    calls,
    restore: () => { globalThis.fetch = realFetch; },
  };
}

const r = d => new Response(JSON.stringify(d), { status: 200 });
const notFound = () => new Response('{"message":"Not Found"}', { status: 404 });

await t('publish endpoint does one atomic commit (mock GitHub)', async () => {
  const draft = Buffer.from('---\ntitle: "T"\nsource: "https://b/v"\nauthor: "U"\n---\n\n# T\n\nbody').toString('base64');
  const mock = mockGithub((m, path, init) => {
    if (m === 'GET' && path.startsWith('/contents/content/')) return notFound();
    if (m === 'GET' && path.startsWith('/contents/drafts/')) return r({ content: draft, sha: 's' });
    if (path.startsWith('/git/ref/')) return r({ object: { sha: 'head' } });
    if (path.startsWith('/git/commits/')) return r({ tree: { sha: 'tree0' } });
    if (path === '/git/trees') {
      const b = JSON.parse(init.body);
      assert.equal(b.tree.length, 2);
      assert.equal(b.tree[1].sha, null);
      assert.equal(b.tree[0].path, 'content/posts/methods/my-note.md');
      assert.match(b.tree[0].content, /UP主：U/);
      assert.match(b.tree[0].content, /draft_id/);
      return r({ sha: 'tree1' });
    }
    if (path === '/git/commits') return r({ sha: 'c1' });
    if (m === 'PATCH') { assert.equal(JSON.parse(init.body).sha, 'c1'); return r({}); }
    throw new Error('unexpected ' + m + path);
  });
  try {
    const request = new Request('https://x/api/publish', { method: 'POST', body: JSON.stringify({ name: 'BV1mbDSB5EGx.md', category: 'methods', slug: 'my-note', title: 'T', tags: [], cover: '/media/covers/BV1mbDSB5EGx.png' }) });
    const res = await onRequestPost({ env: { GITHUB_TOKEN: 'tok', GITHUB_REPO: 'o/r', GITHUB_BRANCH: 'main' }, request, data: { email: 'me' } });
    assert.equal(res.status, 200, await res.clone().text());
    assert.equal(mock.calls.filter(c => c.startsWith('PATCH')).length, 1);
    const bad = await onRequestPost({ env: { GITHUB_TOKEN: 'tok', GITHUB_REPO: 'o/r' }, request: new Request('https://x', { method: 'POST', body: JSON.stringify({ name: 'a.md', category: 'nope', slug: 'a', title: 'T' }) }), data: {} });
    assert.equal(bad.status, 400);
  } finally { mock.restore(); }
});

await t('list posts from GitHub (mock)', async () => {
  const post = Buffer.from('---\ntitle: "全栈指南"\ndesc: "摘要"\ncover: "/c.png"\ndate: "2026-10-14"\n---\n\nbody').toString('base64');
  const mock = mockGithub((m, path) => {
    if (m === 'GET' && path.includes('/contents/content/posts/methods/bv1.md')) return r({ content: post, sha: 's' });
    if (m === 'GET' && /\/contents\/content\/posts\/methods\?/.test(path)) return r([{ type: 'file', name: 'bv1.md', size: 10 }]);
    if (m === 'GET' && path.includes('/contents/content/posts/breakdowns')) return r([]);
    if (m === 'GET' && path.includes('/contents/content/posts/picks')) return r([]);
    throw new Error('unexpected ' + m + path);
  });
  try {
    const res = await listPosts({ env: { GITHUB_TOKEN: 'tok', GITHUB_REPO: 'o/r', GITHUB_BRANCH: 'main' } });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.posts.length, 1);
    assert.equal(data.posts[0].title, '全栈指南');
    assert.equal(data.posts[0].category, 'methods');
    assert.equal(data.posts[0].slug, 'bv1');
    assert.equal(data.posts[0].cover, '/c.png');
  } finally { mock.restore(); }
});

await t('get/put post path safety + one-commit move', async () => {
  const pub = Buffer.from('---\ntitle: "旧"\nsource: "https://b/v"\nauthor: "U"\ndate: "2026-10-14"\ndraft_id: "BV1"\n---\n\n> 本文是视频学习笔记。原视频：[旧](https://b/v)，UP主：U。版权归原作者所有。\n\n## 段\n正文').toString('base64');
  // bad path
  const bad = await getPost({ env: { GITHUB_TOKEN: 'tok', GITHUB_REPO: 'o/r' }, params: { category: '../x', slug: 'a' } }).catch(e => e);
  // getPost throws via assertCategory - middleware would catch; call throws
  await assert.rejects(async () => getPost({ env: { GITHUB_TOKEN: 'tok', GITHUB_REPO: 'o/r' }, params: { category: 'nope', slug: 'a' } }), /分类无效/);
  await assert.rejects(async () => getPost({ env: { GITHUB_TOKEN: 'tok', GITHUB_REPO: 'o/r' }, params: { category: 'methods', slug: 'BAD' } }), /链接名无效/);

  const mock = mockGithub((m, path, init) => {
    if (m === 'GET' && path.includes('/contents/content/posts/methods/old.md')) return r({ content: pub, sha: 's' });
    if (m === 'GET' && path.includes('/contents/content/posts/breakdowns/old.md')) return notFound();
    if (path.startsWith('/git/ref/')) return r({ object: { sha: 'head' } });
    if (path.startsWith('/git/commits/')) return r({ tree: { sha: 'tree0' } });
    if (path === '/git/trees') {
      const b = JSON.parse(init.body);
      assert.equal(b.tree.length, 2);
      assert.equal(b.tree[0].path, 'content/posts/breakdowns/old.md');
      assert.match(b.tree[0].content, /新标题/);
      assert.match(b.tree[0].content, /本文是视频学习笔记/); // credit kept
      assert.equal(b.tree[1].path, 'content/posts/methods/old.md');
      assert.equal(b.tree[1].sha, null);
      return r({ sha: 'tree1' });
    }
    if (path === '/git/commits') return r({ sha: 'c2' });
    if (m === 'PATCH') return r({});
    throw new Error('unexpected ' + m + path);
  });
  try {
    const res = await putPost({
      env: { GITHUB_TOKEN: 'tok', GITHUB_REPO: 'o/r', GITHUB_BRANCH: 'main' },
      params: { category: 'methods', slug: 'old' },
      request: new Request('https://x', { method: 'PUT', body: JSON.stringify({ category: 'breakdowns', title: '新标题', desc: 'd', type: '视频笔记', tags: ['t'], body: '> 本文是视频学习笔记。原视频：[旧](https://b/v)，UP主：U。版权归原作者所有。\n\n## 段\n改了' }) }),
      data: { email: 'me' },
    });
    assert.equal(res.status, 200, await res.clone().text());
    const data = await res.json();
    assert.equal(data.path, 'content/posts/breakdowns/old.md');
    assert.equal(mock.calls.filter(c => c.startsWith('PATCH')).length, 1);
  } finally { mock.restore(); }
});

await t('unpublish one-commit move back to drafts', async () => {
  const pub = Buffer.from('---\ntitle: "T"\nsource: "https://www.bilibili.com/video/BV1mbDSB5EGx"\nauthor: "U"\ndraft_id: "BV1mbDSB5EGx"\n---\n\n> 本文是视频学习笔记。原视频：[T](https://www.bilibili.com/video/BV1mbDSB5EGx)，UP主：U。版权归原作者所有。\n\n## 一句话\n内容').toString('base64');
  const mock = mockGithub((m, path, init) => {
    if (m === 'GET' && path.includes('/contents/content/posts/methods/bv1mbdsb5egx.md')) return r({ content: pub, sha: 's' });
    if (m === 'GET' && path.includes('/contents/drafts/BV1mbDSB5EGx.md')) return notFound();
    if (path.startsWith('/git/ref/')) return r({ object: { sha: 'head' } });
    if (path.startsWith('/git/commits/')) return r({ tree: { sha: 'tree0' } });
    if (path === '/git/trees') {
      const b = JSON.parse(init.body);
      assert.equal(b.tree.length, 2);
      assert.equal(b.tree[0].path, 'drafts/BV1mbDSB5EGx.md');
      assert.doesNotMatch(b.tree[0].content, /本文是视频学习笔记/);
      assert.match(b.tree[0].content, /## 一句话/);
      assert.equal(b.tree[1].path, 'content/posts/methods/bv1mbdsb5egx.md');
      assert.equal(b.tree[1].sha, null);
      return r({ sha: 'tree1' });
    }
    if (path === '/git/commits') return r({ sha: 'c3' });
    if (m === 'PATCH') return r({});
    throw new Error('unexpected ' + m + path);
  });
  try {
    const res = await unpublish({
      env: { GITHUB_TOKEN: 'tok', GITHUB_REPO: 'o/r', GITHUB_BRANCH: 'main' },
      request: new Request('https://x', { method: 'POST', body: JSON.stringify({ category: 'methods', slug: 'bv1mbdsb5egx' }) }),
      data: { email: 'me' },
    });
    assert.equal(res.status, 200, await res.clone().text());
    const data = await res.json();
    assert.equal(data.draft, 'BV1mbDSB5EGx.md');
    assert.equal(mock.calls.filter(c => c.startsWith('PATCH')).length, 1);

    const badCat = await unpublish({
      env: { GITHUB_TOKEN: 'tok', GITHUB_REPO: 'o/r' },
      request: new Request('https://x', { method: 'POST', body: JSON.stringify({ category: 'NOPE', slug: 'a' }) }),
      data: { email: 'me' },
    });
    assert.equal(badCat.status, 400);
  } finally { mock.restore(); }
});

await t('pagination: 6 per page, clamps out-of-range pages', () => {
  const items = Array.from({ length: 14 }, (_, i) => i + 1);
  assert.equal(PAGE_SIZE, 6);
  assert.equal(pageCount(14), 3); assert.equal(pageCount(0), 1); assert.equal(pageCount(6), 1);
  assert.deepEqual(paginate(items, 1).items, [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(paginate(items, 3).items, [13, 14]);
  assert.equal(paginate(items, 9).page, 3); assert.equal(paginate(items, 0).page, 1);
  assert.deepEqual(paginate([], 1), { page: 1, pages: 1, items: [] });
  const sorted = sortPosts([{ title: 'a', date: '2026-01-01' }, { title: 'b', date: '2026-02-01' }]);
  assert.equal(paginate(sorted, 1).items[0].title, 'b');
});

await t('card filtering by group and tag dimensions', () => {
  const cards = [
    { slug: 'a', groups: ['取舍与策略'], tags: { 体验: ['取舍'], 机制: ['经济'], 品类: ['DBG'] } },
    { slug: 'b', groups: ['取舍与策略', '风险与刺激'], tags: { 体验: ['紧张'], 机制: ['经济', '撤离'], 品类: ['搜打撤'] } },
    { slug: 'c', groups: ['设计方法与工具'], tags: { 体验: [], 机制: ['平衡'], 品类: ['DBG'] } },
  ];
  const ids = o => filterCards(cards, o).map(c => c.slug);
  assert.deepEqual(ids({}), ['a', 'b', 'c']);
  assert.deepEqual(ids({ group: '风险与刺激' }), ['b']);
  assert.deepEqual(ids({ tags: { 机制: ['经济'] } }), ['a', 'b']);
  assert.deepEqual(ids({ tags: { 体验: ['取舍', '紧张'] } }), ['a', 'b'], 'OR within a dimension');
  assert.deepEqual(ids({ tags: { 机制: ['经济'], 品类: ['DBG'] } }), ['a'], 'AND across dimensions');
  assert.deepEqual(ids({ group: '取舍与策略', tags: { 品类: ['DBG'] } }), ['a']);
  const counts = groupCounts(cards);
  assert.equal(counts['取舍与策略'], 2); assert.equal(counts['设计方法与工具'], 1); assert.equal(Object.keys(counts).length, GROUPS.length);
  assert.deepEqual(tagVocabulary(cards).机制, ['经济', '撤离', '平衡']);
});

await t('card parsing and synced card data', () => {
  const c = parseCard('# 标题\n**来源类型：用户见解**\n- 解决的问题：P\n- M：m\n- 前提：x\n- 关联：A-甲（备注，含逗号）、B-乙\n- 其他：y', 'X-标题');
  assert.equal(c.title, '标题'); assert.equal(c.insight, true); assert.equal(c.problem, 'P'); assert.equal(c.m, 'm'); assert.equal(c.premise, 'x');
  assert.deepEqual(c.related, ['A-甲（备注，含逗号）', 'B-乙']); assert.deepEqual(c.extra, ['其他：y']);
  const g = parseGrouping('## 取舍与策略（1）\n| 卡片 | 同时属于 | 体验 | 机制 | 品类 |\n|---|---|---|---|---|\n| X-a | 风险与刺激 | 取舍、紧张 | 经济 | DBG |\n## 风险与刺激（1）\n| X-a | 取舍与策略 | 取舍、紧张 | 经济 | DBG |\n');
  assert.deepEqual(g.get('X-a'), { groups: ['取舍与策略', '风险与刺激'], tags: { 体验: ['取舍', '紧张'], 机制: ['经济'], 品类: ['DBG'] } });
  const data = JSON.parse(readFileSync(new URL('../content/cards/cards.json', import.meta.url)));
  assert.ok(data.length > 0);
  for (const card of data) {
    assert.ok(card.groups.length >= 1 && card.groups.length <= 2, card.slug);
    assert.ok(card.groups.every(x => GROUPS.includes(x)), card.slug);
    assert.ok(card.problem, card.slug);
  }
});

await t('cards page routes', () => {
  assert.deepEqual(parseCardsRoute('#cards'), { group: null, focus: null });
  assert.deepEqual(parseCardsRoute(cardsHref('风险与刺激')), { group: '风险与刺激', focus: null });
  assert.deepEqual(parseCardsRoute('#cards/%E4%B9%B1'), { group: null, focus: null }, 'unknown group falls back to all');
  assert.deepEqual(parseCardsRoute(cardHref('DBG-强效果必须带条件')), { group: null, focus: 'DBG-强效果必须带条件' });
  assert.equal(parseCardsRoute('#work'), null); assert.equal(parseCardsRoute('#card-entry'), null); assert.equal(parseCardsRoute(''), null);
  assert.equal(cardsHref(null), '#cards');
});

await t('wheel goes to card back first, then track, then page', () => {
  const track = { scrollLeft: 100, scrollWidth: 2000, clientWidth: 1000 };
  const inner = { scrollTop: 50, scrollHeight: 800, clientHeight: 400 };
  assert.equal(wheelTarget({ deltaX: 0, deltaY: 40 }, track, null), 'track');
  assert.equal(wheelTarget({ deltaX: 0, deltaY: 40 }, track, inner), 'inner');
  assert.equal(wheelTarget({ deltaX: 0, deltaY: 40 }, track, { ...inner, scrollTop: 400 }), 'track', 'back at bottom hands off to track');
  assert.equal(wheelTarget({ deltaX: 0, deltaY: -40 }, track, { ...inner, scrollTop: 0 }), 'track');
  assert.equal(wheelTarget({ deltaX: 0, deltaY: -40 }, { ...track, scrollLeft: 0 }, null), 'page', 'track at start lets page scroll');
  assert.equal(wheelTarget({ deltaX: 0, deltaY: 40 }, { ...track, scrollLeft: 1000 }, null), 'page');
  assert.equal(wheelTarget({ deltaX: 0, deltaY: 40 }, { scrollLeft: 0, scrollWidth: 900, clientWidth: 1000 }, null), 'page');
  assert.equal(wheelTarget({ deltaX: 50, deltaY: 10 }, track, null), 'page', 'native horizontal wheel untouched');
});

await t('bounce offset pushes neighbours away from hovered card', () => {
  assert.deepEqual([0, 1, 2, 3].map(i => bounceOffset(i, 1, 20)), [-20, 0, 20, 20]);
  assert.deepEqual([0, 1].map(i => bounceOffset(i, -1)), [0, 0]);
});

console.log(`${n} test groups passed`);
