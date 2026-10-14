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

function Admin() {
  const [section, setSection] = useState('drafts'); // drafts | published
  const [tab, setTab] = useState('drafts'); // drafts | methods | breakdowns | picks
  const [drafts, setDrafts] = useState([]);
  const [current, setCurrent] = useState(null); // { name, content, sha }
  const [form, setForm] = useState({});
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    return api('drafts')
      .then(d => { setDrafts(d.drafts || []); setStatus(''); })
      .catch(e => setStatus(`读取草稿失败：${e.message}`))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const open = async name => {
    setStatus('');
    try {
      // Only short ASCII names ever go into the path; encodeURIComponent is safe (no #).
      const d = await api(`drafts/${encodeURIComponent(name)}`);
      const fm = parseFrontMatter(d.content).data;
      const id = draftId(name);
      const slugGuess = id.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      setCurrent({ name, content: d.content, sha: d.sha });
      setForm({
        category: categories[0].id,
        slug: slugGuess,
        title: fm.title || d.title || '',
        desc: fm.desc || '',
        type: fm.type || '视频笔记',
        tags: Array.isArray(fm.tags) ? fm.tags.join(', ') : (fm.tags || ''),
        cover: fm.cover || coverFor(name),
      });
      setSection('drafts');
      setTab('drafts');
      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch (e) { setStatus(`打开失败：${e.message}`); }
  };

  const preview = useMemo(() => current && postFromMarkdown(current.content, 'preview'), [current]);
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
          ...form,
          tags: form.tags.split(/[,，]/).map(s => s.trim()).filter(Boolean),
          cover: form.cover || undefined,
        }),
      });
      setStatus(`已发布：${r.path}。Cloudflare 重新构建后可在 #article/${form.category}-${form.slug} 看到。`);
      setCurrent(null);
      load();
    } catch (e) { setStatus(`发布失败：${e.message}`); } finally { setBusy(false); }
  };

  const discard = async () => {
    if (!confirm(`删除草稿「${form.title || current.name}」？`)) return;
    setBusy(true);
    try {
      await api(`drafts/${encodeURIComponent(current.name)}`, { method: 'DELETE' });
      setStatus('已删除草稿');
      setCurrent(null);
      load();
    } catch (e) { setStatus(`删除失败：${e.message}`); } finally { setBusy(false); }
  };

  const closeReview = () => { setCurrent(null); setStatus(''); };

  // Published articles flattened for the "已发布" browse view
  const published = useMemo(() => categories.flatMap(c =>
    c.items.map((item, i) => ({
      ...item,
      id: `${c.id}-${item.slug || i + 1}`,
      category: c.cn,
      categoryId: c.id,
    }))
  ), []);

  const filters = [
    { id: 'drafts', cn: '草稿箱', count: drafts.length },
    ...categories.map(c => ({ id: c.id, cn: c.cn, count: c.items.length })),
  ];

  const showDrafts = tab === 'drafts';
  const filteredPublished = tab === 'drafts' ? [] : tab === 'all' ? published : published.filter(a => a.categoryId === tab);

  const goSection = s => {
    setSection(s);
    setCurrent(null);
    setTab(s === 'drafts' ? 'drafts' : 'methods');
  };

  // Review / publish panel (reading-page style)
  if (current) {
    return (
      <div className="admin-shell">
        <AdminHeader section={section} onSection={goSection} />
        <div className="reading-page admin-review">
          <header className="reading-nav container">
            <Wordmark />
            <button type="button" className="admin-text-btn" onClick={closeReview}>← 返回草稿箱</button>
          </header>
          <main className="reading-main admin-review-main">
            {status && <p className="admin-status" role="status">{status}</p>}
            <div className="reading-breadcrumb"><span>草稿箱</span><span>/</span><span>{draftId(current.name)}</span></div>
            <h1>{form.title || draftId(current.name)}</h1>
            <div className="reading-meta">
              <span>{form.type || '视频笔记'}</span>
              <span>{draftId(current.name)}</span>
            </div>

            <section className="admin-form" aria-label="发布设置">
              <h2 className="admin-form-title">发布设置</h2>
              <div className="admin-form-grid">
                <label>分类
                  <select value={form.category} onChange={set('category')}>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.cn}</option>)}
                  </select>
                </label>
                <label>链接名（slug）
                  <input value={form.slug} onChange={set('slug')} placeholder="例如 bv1mbdsb5egx" />
                </label>
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
              </div>
              <p className="admin-muted">来源：{fm.source || '（缺失）'} · UP主：{fm.author || '（缺失）'}</p>
              <div className="admin-actions">
                <button type="button" className="admin-btn primary" disabled={busy} onClick={publish}>发布到博客</button>
                <button type="button" className="admin-btn danger" disabled={busy} onClick={discard}>删除草稿</button>
                <button type="button" className="admin-btn" disabled={busy} onClick={closeReview}>取消</button>
              </div>
            </section>

            {form.cover && (
              <img className="reading-cover" src={form.cover} alt="" onError={e => { e.currentTarget.style.display = 'none'; }} />
            )}
            <p className="reading-lead">{form.desc}</p>
            <div className="reading-body admin-preview" aria-label="草稿预览">
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
                ? <>预览笔记、选分类后点「发布」，文章才会出现在博客对应分页。</>
                : <>浏览已经上线的文章（只读）。要发新内容请回草稿箱。</>}</p>
            </div>

            {status && <p className="admin-status" role="status">{status}</p>}

            <div className="filter-bar">
              <div className="tabs" role="tablist" aria-label="分类">
                {(section === 'drafts'
                  ? [{ id: 'drafts', cn: '草稿箱', count: drafts.length }]
                  : categories.map(c => ({ id: c.id, cn: c.cn, count: c.items.length }))
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
                  {section === 'drafts'
                    ? (loading ? '加载中…' : `${String(drafts.length).padStart(2, '0')} 篇待审`)
                    : `${String(filteredPublished.length).padStart(2, '0')} 篇`}
                </span>
                {section === 'drafts' && (
                  <button type="button" className="admin-text-btn" onClick={load} disabled={loading}>刷新</button>
                )}
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
                        <button key={d.name} type="button" className="project-card admin-draft-card" onClick={() => open(d.name)} aria-label={`审核：${title}`}>
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
              ) : (
                <div className="archive-list">
                  {filteredPublished.map((item, index) => (
                    <a key={item.id} href={`/#article/${item.id}`} target="_blank" rel="noopener noreferrer" className="archive-item">
                      <span className="archive-index">{String(index + 1).padStart(2, '0')}</span>
                      <div>
                        <span className="card-meta">{item.category} / {item.type}</span>
                        <h3>{item.title}</h3>
                      </div>
                      <Arrow />
                    </a>
                  ))}
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
