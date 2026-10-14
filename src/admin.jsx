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

function Admin() {
  const [drafts, setDrafts] = useState([]);
  const [current, setCurrent] = useState(null); // { name, content, sha }
  const [form, setForm] = useState({});
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api('drafts').then(d => setDrafts(d.drafts)).catch(e => setStatus(`读取草稿失败：${e.message}`));
  useEffect(() => { load(); }, []);

  const open = async name => {
    setStatus('');
    try {
      const d = await api(`drafts/${encodeURIComponent(name)}`);
      const fm = parseFrontMatter(d.content).data;
      setCurrent({ name, content: d.content, sha: d.sha });
      setForm({ category: categories[0].id, slug: name.replace(/\.md$/, '').match(/^(BV\w+|YT-[\w-]+?)(?=-|$)/)?.[0]?.toLowerCase() || '', title: fm.title || '', desc: fm.desc || '', type: '视频笔记', tags: (fm.tags || []).join?.(', ') || '' });
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

  return <div className="admin">
    <aside className="admin-list">
      <h1>待审草稿</h1>
      <button onClick={load}>刷新</button>
      {drafts.length === 0 && <p className="admin-muted">没有草稿</p>}
      <ul>{drafts.map(d => <li key={d.name}><button className={current?.name === d.name ? 'active' : ''} onClick={() => open(d.name)}>{d.name}</button></li>)}</ul>
    </aside>
    <main className="admin-main">
      {status && <p className="admin-status">{status}</p>}
      {!current ? <p className="admin-muted">从左侧选择一篇草稿。</p> : <>
        <section className="admin-form">
          <label>分类<select value={form.category} onChange={set('category')}>{categories.map(c => <option key={c.id} value={c.id}>{c.cn}</option>)}</select></label>
          <label>链接名（slug）<input value={form.slug} onChange={set('slug')} placeholder="例如 bv1mbdsb5egx" /></label>
          <label>标题<input value={form.title} onChange={set('title')} /></label>
          <label>摘要<input value={form.desc} onChange={set('desc')} /></label>
          <label>类型<input value={form.type} onChange={set('type')} /></label>
          <label>标签（逗号分隔）<input value={form.tags} onChange={set('tags')} /></label>
          <p className="admin-muted">来源：{fm.source || '（缺失）'} · UP主：{fm.author || '（缺失）'}</p>
          <div className="admin-actions"><button disabled={busy} onClick={publish}>发布</button><button disabled={busy} className="danger" onClick={discard}>删除草稿</button></div>
        </section>
        <article className="reading-body admin-preview"><h1>{form.title}</h1>{preview.body.map((b, i) => <BodyBlock key={i} block={b} />)}</article>
      </>}
    </main>
  </div>;
}

createRoot(document.getElementById('admin-root')).render(<React.StrictMode><Admin /></React.StrictMode>);
