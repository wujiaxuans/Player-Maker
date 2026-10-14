import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { categories } from './data';
import { postFromMarkdown, parseFrontMatter } from './markdown';
import { BodyBlock } from './reading';
import './styles.css';
import './admin.css';

async function api(path, options = {}) {
  const res = await fetch(`/api/${path}`, { credentials: 'same-origin', headers: { 'content-type': 'application/json' }, ...options });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

function draftId(name) {
  return String(name || '').replace(/\.md$/i, '');
}

function coverFor(name) {
  const id = draftId(name);
  return id ? `/media/covers/${id}.png` : '';
}

function Arrow({ down = false }) {
  return <svg className="arrow" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={down ? 'M12 4v16m-6-6 6 6 6-6' : 'M5 19 19 5M5 5h14v14'} stroke="currentColor" strokeWidth="1.4" /></svg>;
}

function Wordmark() {
  return <a className="wordmark" href="/" aria-label="PLAYER / MAKER，返回博客">P<span>/</span>M.</a>;
}

function AdminHeader({ section, onSection }) {
  return (
    <header className="header container admin-header">
      <div className="brand">
        <Wordmark />
        <span className="brand-caption">后台审核<small>DRAFT REVIEW</small></span>
      </div>
      <nav className="nav" aria-label="后台导航">
        <a href="/" target="_blank" rel="noopener noreferrer">博客 ↗</a>
        <button type="button" className={section === 'drafts' ? 'admin-nav-current' : ''} aria-current={section === 'drafts' ? 'page' : undefined} onClick={() => onSection('drafts')}>草稿箱</button>
        <button type="button" className={section === 'published' ? 'admin-nav-current' : ''} aria-current={section === 'published' ? 'page' : undefined} onClick={() => onSection('published')}>已发布</button>
      </nav>
    </header>
  );
}

function sectionFromHash() {
  const h = (typeof location !== 'undefined' ? location.hash : '').replace(/^#/, '');
  return h === 'published' ? 'published' : 'drafts';
}

function Admin() {
  const [section, setSection] = useState(sectionFromHash); // drafts | published
  const [tab, setTab] = useState(() => (sectionFromHash() === 'published' ? 'all' : 'drafts')); // drafts | methods | breakdowns | picks | all
  const [drafts, setDrafts] = useState([]);
  const [posts, setPosts] = useState([]);
  const [current, setCurrent] = useState(null); // { kind, name|category+slug, content, sha }
  const [form, setForm] = useState({});
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadDrafts = () => api('drafts')
    .then(d => { setDrafts(d.drafts || []); })
    .catch(e => { setStatus(`读取草稿失败：${e.message}`); throw e; });

  const loadPosts = () => api('posts')
    .then(d => { setPosts(d.posts || []); })
    .catch(e => { setStatus(`读取已发布失败：${e.message}`); throw e; });

  const loadAll = async () => {
    setLoading(true);
    setStatus('');
    try {
      await Promise.all([loadDrafts(), loadPosts()]);
    } catch { /* status set */ }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    const onHash = () => {
      const next = sectionFromHash();
      setSection(next);
      setCurrent(null);
      setTab(next === 'drafts' ? 'drafts' : 'all');
      setStatus('');
    };
    window.addEventListener('hashchange', onHash);
    // Normalize empty hash to #drafts so refresh stays consistent
    if (!location.hash || (location.hash !== '#drafts' && location.hash !== '#published')) {
      history.replaceState(null, '', `#${sectionFromHash()}`);
    }
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const openDraft = async name => {
    setStatus('');
    try {
      const d = await api(`drafts/${encodeURIComponent(name)}`);
      const fm = parseFrontMatter(d.content).data;
      const id = draftId(name);
      const slugGuess = id.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      setCurrent({ kind: 'draft', name, content: d.content, sha: d.sha });
      setForm({
        category: categories[0].id,
        slug: slugGuess,
        title: fm.title || d.title || '',
        desc: fm.desc || '',
        type: fm.type || '视频笔记',
        tags: Array.isArray(fm.tags) ? fm.tags.join(', ') : (fm.tags || ''),
        cover: fm.cover || coverFor(name),
        body: '',
      });
      setSection('drafts');
      setTab('drafts');
      if (location.hash !== '#drafts') location.hash = 'drafts';
      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch (e) { setStatus(`打开失败：${e.message}`); }
  };

  const openPost = async (category, slug) => {
    setStatus('');
    try {
      const d = await api(`posts/${encodeURIComponent(category)}/${encodeURIComponent(slug)}`);
      const parsed = parseFrontMatter(d.content);
      const fm = parsed.data;
      setCurrent({ kind: 'published', category, slug, content: d.content, sha: d.sha, path: d.path });
      setForm({
        category,
        slug,
        title: fm.title || slug,
        desc: fm.desc || '',
        type: fm.type || '视频笔记',
        tags: Array.isArray(fm.tags) ? fm.tags.join(', ') : (fm.tags || ''),
        cover: fm.cover || '',
        body: parsed.body,
      });
      setSection('published');
      setTab(category);
      if (location.hash !== '#published') location.hash = 'published';
      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch (e) { setStatus(`打开失败：${e.message}`); }
  };

  const previewContent = useMemo(() => {
    if (!current) return null;
    if (current.kind === 'draft') return current.content;
    // Rebuild preview from form fields + body for live edit
    const tags = form.tags ? form.tags.split(/[,，]/).map(s => s.trim()).filter(Boolean) : [];
    const fm = parseFrontMatter(current.content).data;
    const head = [
      '---',
      `title: ${JSON.stringify(form.title || '')}`,
      `type: ${JSON.stringify(form.type || '')}`,
      `desc: ${JSON.stringify(form.desc || '')}`,
      `tags: ${JSON.stringify(tags)}`,
      fm.cover || form.cover ? `cover: ${JSON.stringify(form.cover || fm.cover || '')}` : '',
      '---',
      '',
      form.body || '',
    ].filter(Boolean).join('\n');
    return head;
  }, [current, form]);

  const preview = useMemo(() => previewContent && postFromMarkdown(previewContent, 'preview'), [previewContent]);
  const fm = useMemo(() => current ? parseFrontMatter(current.content).data : {}, [current]);
  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));

  const publish = async () => {
    if (!form.slug || !/^[a-z0-9-]+$/.test(form.slug)) return setStatus('链接名只能用小写字母、数字和 -');
    if (!confirm(`发布到「${categories.find(c => c.id === form.category)?.cn}」？`)) return;
    setBusy(true);
    try {
      const r = await api('publish', {
        method: 'POST',
        body: JSON.stringify({
          name: current.name,
          draft_id: draftId(current.name),
          ...form,
          tags: form.tags.split(/[,，]/).map(s => s.trim()).filter(Boolean),
          cover: form.cover || undefined,
        }),
      });
      setStatus(`已发布：${r.path}。已出现在「已发布」列表（博客重新构建后读者可见）。`);
      setCurrent(null);
      setSection('published');
      setTab(form.category);
      if (location.hash !== '#published') location.hash = 'published';
      await loadAll();
    } catch (e) { setStatus(`发布失败：${e.message}`); } finally { setBusy(false); }
  };

  const discard = async () => {
    if (!confirm(`删除草稿「${form.title || current.name}」？`)) return;
    setBusy(true);
    try {
      await api(`drafts/${encodeURIComponent(current.name)}`, { method: 'DELETE' });
      setStatus('已删除草稿');
      setCurrent(null);
      await loadDrafts();
    } catch (e) { setStatus(`删除失败：${e.message}`); } finally { setBusy(false); }
  };

  const savePost = async () => {
    if (!form.title?.trim()) return setStatus('标题不能为空');
    setBusy(true);
    try {
      const r = await api(`posts/${encodeURIComponent(current.category)}/${encodeURIComponent(current.slug)}`, {
        method: 'PUT',
        body: JSON.stringify({
          category: form.category,
          title: form.title,
          desc: form.desc,
          type: form.type,
          tags: form.tags.split(/[,，]/).map(s => s.trim()).filter(Boolean),
          cover: form.cover || undefined,
          body: form.body,
        }),
      });
      setStatus(`已保存：${r.path}`);
      setCurrent(null);
      setTab(r.category || form.category);
      await loadPosts();
    } catch (e) { setStatus(`保存失败：${e.message}`); } finally { setBusy(false); }
  };

  const unpublish = async () => {
    if (!confirm(`把「${form.title || current.slug}」退回草稿箱？博客上这篇会在下次构建后消失。`)) return;
    setBusy(true);
    try {
      const r = await api('unpublish', {
        method: 'POST',
        body: JSON.stringify({ category: current.category, slug: current.slug }),
      });
      setStatus(`已退回草稿箱：${r.draft}`);
      setCurrent(null);
      setSection('drafts');
      setTab('drafts');
      if (location.hash !== '#drafts') location.hash = 'drafts';
      await loadAll();
    } catch (e) { setStatus(`退回失败：${e.message}`); } finally { setBusy(false); }
  };

  const closeReview = () => { setCurrent(null); setStatus(''); };

  const filteredPublished = tab === 'all' || tab === 'drafts'
    ? posts
    : posts.filter(p => p.category === tab);

  const goSection = s => {
    const next = s === 'published' ? 'published' : 'drafts';
    setSection(next);
    setCurrent(null);
    setTab(next === 'drafts' ? 'drafts' : 'all');
    setStatus('');
    if (location.hash !== `#${next}`) location.hash = next;
  };

  if (current) {
    const isDraft = current.kind === 'draft';
    return (
      <div className="admin-shell">
        <AdminHeader section={section} onSection={goSection} />
        <div className="reading-page admin-review">
          <header className="reading-nav container">
            <Wordmark />
            <button type="button" className="admin-text-btn" onClick={closeReview}>
              ← 返回{isDraft ? '草稿箱' : '已发布'}
            </button>
          </header>
          <main className="reading-main admin-review-main">
            {status && <p className="admin-status" role="status">{status}</p>}
            <div className="reading-breadcrumb">
              <span>{isDraft ? '草稿箱' : '已发布'}</span>
              <span>/</span>
              <span>{isDraft ? draftId(current.name) : `${current.category}/${current.slug}`}</span>
            </div>
            <h1>{form.title || (isDraft ? draftId(current.name) : current.slug)}</h1>
            <div className="reading-meta">
              <span>{form.type || '视频笔记'}</span>
              <span>{isDraft ? draftId(current.name) : current.slug}</span>
            </div>

            <section className="admin-form" aria-label={isDraft ? '发布设置' : '编辑文章'}>
              <h2 className="admin-form-title">{isDraft ? '发布设置' : '编辑已发布文章'}</h2>
              <div className="admin-form-grid">
                <label>分类
                  <select value={form.category} onChange={set('category')}>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.cn}</option>)}
                  </select>
                </label>
                {isDraft ? (
                  <label>链接名（slug）
                    <input value={form.slug} onChange={set('slug')} placeholder="例如 bv1mbdsb5egx" />
                  </label>
                ) : (
                  <label>链接名（slug）
                    <input value={form.slug} disabled title="已发布后链接名不可改" />
                  </label>
                )}
                <label className="admin-form-span2">标题
                  <input value={form.title} onChange={set('title')} />
                </label>
                <label className="admin-form-span2">摘要
                  <input value={form.desc} onChange={set('desc')} />
                </label>
                <label>类型
                  <input value={form.type} onChange={set('type')} />
                </label>
                <label>标签（逗号分隔）
                  <input value={form.tags} onChange={set('tags')} />
                </label>
                <label className="admin-form-span2">封面路径
                  <input value={form.cover} onChange={set('cover')} placeholder="/media/covers/….png" />
                </label>
                {!isDraft && (
                  <label className="admin-form-span2">正文（Markdown）
                    <textarea className="admin-textarea" rows={16} value={form.body} onChange={set('body')} />
                  </label>
                )}
              </div>
              <p className="admin-muted">来源：{fm.source || '（缺失）'} · UP主：{fm.author || '（缺失）'}</p>
              <div className="admin-actions">
                {isDraft ? (
                  <>
                    <button type="button" className="admin-btn primary" disabled={busy} onClick={publish}>发布到博客</button>
                    <button type="button" className="admin-btn danger" disabled={busy} onClick={discard}>删除草稿</button>
                  </>
                ) : (
                  <>
                    <button type="button" className="admin-btn primary" disabled={busy} onClick={savePost}>保存修改</button>
                    <button type="button" className="admin-btn" disabled={busy} onClick={unpublish}>退回草稿箱</button>
                  </>
                )}
                <button type="button" className="admin-btn" disabled={busy} onClick={closeReview}>取消</button>
              </div>
            </section>

            {form.cover && (
              <img className="reading-cover" src={form.cover} alt="" onError={e => { e.currentTarget.style.display = 'none'; }} />
            )}
            <p className="reading-lead">{form.desc}</p>
            <div className="reading-body admin-preview" aria-label="预览">
              {preview?.body?.map((b, i) => <BodyBlock key={i} block={b} />)}
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <a className="skip-link" href="#admin-panel">跳至内容</a>
      <AdminHeader section={section} onSection={goSection} />
      <main>
        <section className="work-section archive-view admin-work" aria-labelledby="admin-title">
          <div className="container">
            <div className="section-display" aria-hidden="true"><span>DRAFT.</span><span>REVIEW</span></div>
            <div className="section-rule" />
            <div className="work-heading">
              <div>
                <h2 id="admin-title">{section === 'drafts' ? '草稿箱' : '已发布文章'}<span className="heading-dot">.</span></h2>
              </div>
              <p>{section === 'drafts'
                ? <>预览笔记、选分类后点「发布」，文章会出现在「已发布」并进入博客对应分页。</>
                : <>管理博客全部已发布文章：改内容 / 分类，或退回草稿箱。列表实时读仓库，不等构建。</>}</p>
            </div>

            {status && <p className="admin-status" role="status">{status}</p>}

            <div className="filter-bar">
              <div className="tabs" role="tablist" aria-label="分类">
                {(section === 'drafts'
                  ? [{ id: 'drafts', cn: '草稿箱', count: drafts.length }]
                  : [
                      { id: 'all', cn: '全部', count: posts.length },
                      ...categories.map(c => ({ id: c.id, cn: c.cn, count: posts.filter(p => p.category === c.id).length })),
                    ]
                ).map((c, i, arr) => (
                  <button
                    key={c.id}
                    id={`tab-${c.id}`}
                    role="tab"
                    aria-selected={tab === c.id}
                    aria-controls="admin-panel"
                    tabIndex={tab === c.id ? 0 : -1}
                    onClick={() => setTab(c.id)}
                    onKeyDown={e => {
                      const next = { ArrowRight: (i + 1) % arr.length, ArrowLeft: (i + arr.length - 1) % arr.length, Home: 0, End: arr.length - 1 }[e.key];
                      if (next !== undefined) { e.preventDefault(); setTab(arr[next].id); document.getElementById(`tab-${arr[next].id}`)?.focus(); }
                    }}
                  >{c.cn}<span>{c.count}</span></button>
                ))}
              </div>
              <div className="admin-bar-actions">
                <span className="article-count">
                  {loading
                    ? '加载中…'
                    : section === 'drafts'
                      ? `${String(drafts.length).padStart(2, '0')} 篇待审`
                      : `${String(filteredPublished.length).padStart(2, '0')} 篇`}
                </span>
                <button type="button" className="admin-text-btn" onClick={loadAll} disabled={loading}>刷新</button>
              </div>
            </div>

            <div role="tabpanel" id="admin-panel" aria-labelledby={`tab-${tab}`} tabIndex={0}>
              {section === 'drafts' ? (
                loading ? (
                  <p className="admin-muted admin-pad">加载草稿中…</p>
                ) : drafts.length === 0 ? (
                  <div className="admin-empty-card">
                    <p className="admin-empty-title">草稿箱是空的</p>
                    <p className="admin-muted">每天整理好的视频笔记会出现在这里。</p>
                  </div>
                ) : (
                  <div className="card-grid admin-draft-grid">
                    {drafts.map(d => {
                      const title = d.title || draftId(d.name);
                      const cover = coverFor(d.name);
                      return (
                        <button key={d.name} type="button" className="project-card admin-draft-card" onClick={() => openDraft(d.name)} aria-label={`审核：${title}`}>
                          <div className="card-image">
                            <div className="card-image-reveal">
                              <img src={cover} alt="" loading="lazy" onError={e => { e.currentTarget.style.opacity = '0.15'; }} />
                            </div>
                            <div className="image-curtain" aria-hidden="true" />
                            <span className="image-type">待审</span>
                            <Arrow />
                          </div>
                          <div className="card-body">
                            <div className="card-meta">{draftId(d.name)}</div>
                            <h3>{title}</h3>
                            <p>点开预览全文，选择分类后发布到博客。</p>
                            <div className="card-footer"><span>视频笔记</span><span>审核 ↗</span></div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )
              ) : loading ? (
                <p className="admin-muted admin-pad">加载已发布文章…</p>
              ) : filteredPublished.length === 0 ? (
                <div className="admin-empty-card">
                  <p className="admin-empty-title">还没有已发布文章</p>
                  <p className="admin-muted">博客上的全部文章都会出现在这里，可编辑或退回草稿箱。</p>
                </div>
              ) : (
                <div className="card-grid admin-draft-grid">
                  {filteredPublished.map(p => {
                    const cover = p.cover || '';
                    const catCn = categories.find(c => c.id === p.category)?.cn || p.categoryCn || p.category;
                    return (
                      <button
                        key={`${p.category}/${p.slug}`}
                        type="button"
                        className="project-card admin-draft-card"
                        onClick={() => openPost(p.category, p.slug)}
                        aria-label={`编辑：${p.title}`}
                      >
                        <div className="card-image">
                          <div className="card-image-reveal">
                            {cover
                              ? <img src={cover} alt="" loading="lazy" onError={e => { e.currentTarget.style.opacity = '0.15'; }} />
                              : <div style={{ width: '100%', height: '100%', background: '#1a222c' }} />}
                          </div>
                          <div className="image-curtain" aria-hidden="true" />
                          <span className="image-type">{catCn}</span>
                          <Arrow />
                        </div>
                        <div className="card-body">
                          <div className="card-meta">{p.category}/{p.slug}</div>
                          <h3>{p.title}</h3>
                          <p>{p.desc || '点开可改内容、分类，或退回草稿箱。'}</p>
                          <div className="card-footer"><span>{p.type || '视频笔记'}</span><span>编辑 ↗</span></div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="archive-footer">
              <span>发布前请确认来源链接与 UP 主署名。</span>
              <a href="/" target="_blank" rel="noopener noreferrer">打开博客 <Arrow /></a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

createRoot(document.getElementById('admin-root')).render(<React.StrictMode><Admin /></React.StrictMode>);
