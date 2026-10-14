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

function draftLabel(name) {
  const base = String(name).replace(/\.md$/i, '');
  const m = base.match(/^(BV[\w]+|YT-[\w-]+?)-(.+)$/i);
  if (m) return { id: m[1], title: m[2] };
  return { id: '', title: base };
}

function formatSize(n) {
  if (n == null) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function Admin() {
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
      const d = await api(`drafts/${encodeURIComponent(name)}`);
      const fm = parseFrontMatter(d.content).data;
      const idGuess = name.replace(/\.md$/, '').match(/^(BV\w+|YT-[\w-]+?)(?=-|$)/i)?.[0]?.toLowerCase() || '';
      setCurrent({ name, content: d.content, sha: d.sha });
      setForm({
        category: categories[0].id,
        slug: idGuess,
        title: fm.title || draftLabel(name).title || '',
        desc: fm.desc || '',
        type: fm.type || '视频笔记',
        tags: (fm.tags || []).join?.(', ') || (Array.isArray(fm.tags) ? fm.tags.join(', ') : ''),
      });
    } catch (e) { setStatus(`打开失败：${e.message}`); }
  };

  const preview = useMemo(() => current && postFromMarkdown(current.content, 'preview'), [current]);
  const fm = useMemo(() => current ? parseFrontMatter(current.content).data : {}, [current]);
  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));

  const publish = async () => {
    if (!form.slug || !/^[a-z0-9-]+$/.test(form.slug)) return setStatus('链接名只能用小写字母、数字和 -');
    if (!confirm(`发布到「${categories.find(c => c.id === form.category).cn}」？`)) return;
    setBusy(true);
    try {
      const r = await api('publish', { method: 'POST', body: JSON.stringify({ name: current.name, ...form, tags: form.tags.split(/[,，]/).map(s => s.trim()).filter(Boolean) }) });
      setStatus(`已发布：${r.path}。Cloudflare 重新构建后可在 #article/${form.category}-${form.slug} 看到。`);
      setCurrent(null); load();
    } catch (e) { setStatus(`发布失败：${e.message}`); } finally { setBusy(false); }
  };

  const discard = async () => {
    if (!confirm(`删除草稿「${current.name}」？`)) return;
    setBusy(true);
    try { await api(`drafts/${encodeURIComponent(current.name)}`, { method: 'DELETE' }); setStatus('已删除草稿'); setCurrent(null); load(); }
    catch (e) { setStatus(`删除失败：${e.message}`); } finally { setBusy(false); }
  };

  return (
    <div className="admin">
      <aside className="admin-list" aria-label="草稿箱">
        <header className="admin-list-head">
          <div>
            <p className="admin-kicker">博客后台</p>
            <h1>草稿箱</h1>
            <p className="admin-muted admin-count">
              {loading ? '加载中…' : drafts.length === 0 ? '暂无待审草稿' : `共 ${drafts.length} 篇待审`}
            </p>
          </div>
          <button type="button" className="admin-refresh" onClick={load} disabled={loading}>刷新</button>
        </header>

        {!loading && drafts.length === 0 && (
          <div className="admin-empty">
            <p className="admin-empty-title">草稿箱是空的</p>
            <p className="admin-muted">每天整理好的视频笔记会出现在这里。你预览、选分类后点「发布」，文章才会上到博客对应分页。</p>
          </div>
        )}

        <ul className="admin-draft-list">
          {drafts.map(d => {
            const { id, title } = draftLabel(d.name);
            const active = current?.name === d.name;
            return (
              <li key={d.name}>
                <button type="button" className={active ? 'active' : ''} onClick={() => open(d.name)}>
                  <span className="admin-draft-title">{title || d.name}</span>
                  <span className="admin-draft-meta">
                    {id && <span className="admin-draft-id">{id}</span>}
                    {d.size != null && <span>{formatSize(d.size)}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <main className="admin-main">
        {status && <p className="admin-status" role="status">{status}</p>}
        {!current ? (
          <div className="admin-placeholder">
            <h2>审核区</h2>
            <p className="admin-muted">从左侧草稿箱点开一篇，即可预览全文、填写发布信息，然后发布或删除。</p>
          </div>
        ) : (
          <>
            <section className="admin-form" aria-label="发布设置">
              <h2>发布设置</h2>
              <label>分类
                <select value={form.category} onChange={set('category')}>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.cn}</option>)}
                </select>
              </label>
              <label>链接名（slug）
                <input value={form.slug} onChange={set('slug')} placeholder="例如 bv1mbdsb5egx" />
              </label>
              <label>标题
                <input value={form.title} onChange={set('title')} />
              </label>
              <label>摘要
                <input value={form.desc} onChange={set('desc')} />
              </label>
              <label>类型
                <input value={form.type} onChange={set('type')} />
              </label>
              <label>标签（逗号分隔）
                <input value={form.tags} onChange={set('tags')} />
              </label>
              <p className="admin-muted">来源：{fm.source || '（缺失）'} · UP主：{fm.author || '（缺失）'}</p>
              <div className="admin-actions">
                <button type="button" disabled={busy} onClick={publish}>发布到博客</button>
                <button type="button" disabled={busy} className="danger" onClick={discard}>删除草稿</button>
              </div>
            </section>
            <article className="reading-body admin-preview" aria-label="草稿预览">
              <h2 className="admin-preview-label">预览</h2>
              <h1>{form.title}</h1>
              {preview.body.map((b, i) => <BodyBlock key={i} block={b} />)}
            </article>
          </>
        )}
      </main>
    </div>
  );
}

createRoot(document.getElementById('admin-root')).render(<React.StrictMode><Admin /></React.StrictMode>);
