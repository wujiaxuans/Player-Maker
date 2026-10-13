import { useEffect, useRef, useState } from 'react';
import { useOpening, useSectionMotion } from './motion';

function Arrow({ down = false }) {
  return <svg className="arrow" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={down ? 'M12 4v16m-6-6 6 6 6-6' : 'M5 19 19 5M5 5h14v14'} stroke="currentColor" strokeWidth="1.4" /></svg>;
}
function Wordmark() {
  return <a className="wordmark" href="#home" aria-label="PLAYER / MAKER，返回首页">P<span>/</span>M.</a>;
}
export function Header({ archiveView, onSelect }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const close = event => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);
  return <header className="header container">
    <div className="brand"><Wordmark /><span className="brand-caption">关于游戏，关于设计。<small>A PERSONAL JOURNAL</small></span></div>
    <nav id="main-nav" className={`nav ${open ? 'open' : ''}`} aria-label="主导航">
      <a href="#work" aria-current={!archiveView ? 'page' : undefined} onClick={() => setOpen(false)}>文章</a>
      <a href="#archive" aria-current={archiveView ? 'page' : undefined} onClick={() => { onSelect('all'); setOpen(false); }}>归档</a>
      <a href="#contact" onClick={() => setOpen(false)}>联系 <Arrow /></a>
    </nav>
    <button className="menu-toggle" aria-label={open ? '关闭导航' : '打开导航'} aria-expanded={open} aria-controls="main-nav" onClick={() => setOpen(!open)}>{open ? '关闭 −' : '菜单 +'}</button>
  </header>;
}
export function Hero({ openingActive }) {
  const root = useRef(null);
  useOpening(root, openingActive);
  return <section ref={root} id="home" className="hero" aria-labelledby="hero-title">
    <div className="opening" aria-hidden="true"><div className="opening-panel" /><div className="opening-panel" /><div className="opening-mark"><div className="opening-label"><span>PLAYER /</span><span>MAKER</span></div><div className="opening-rule" /></div></div><div className="hero-media" aria-hidden="true"><img className="hero-poster" src="/media/hero-mist-v1.png" alt="" fetchPriority="high" /></div>
    <div className="hero-shade" aria-hidden="true" />
    <div className="hero-content container"><span className="hero-kicker">PLAY. THINK. MAKE.</span><h1 id="hero-title" aria-label="PLAYER. MAKER."><span className="hero-word-mask" aria-hidden="true"><span className="hero-word">PLAYER.</span></span><span className="hero-word-mask" aria-hidden="true"><span className="hero-word">MAKER.</span></span></h1><p className="hero-description">让想象，成为可游玩的世界。</p></div>
    <div className="hero-margin-note" aria-hidden="true">游戏 · 设计 · 灵感</div>
  </section>;
}
function ArticleCard({ item, onRead }) {
  return <a className="project-card" href={`#article/${item.id}`} onClick={onRead} aria-label={`阅读：${item.title}`}>
    <div className="card-image"><div className="card-image-reveal"><img src={`/media/${item.image}.jpg`} alt="" loading="lazy" /></div><div className="image-curtain" aria-hidden="true" /><span className="image-type">{item.category}</span><Arrow /></div>
    <div className="card-body"><div className="card-meta">{item.tags.join(' / ')}</div><h3>{item.title}</h3><p>{item.desc}</p><div className="card-footer"><span>{item.type}</span><span>阅读笔记 ↗</span></div></div>
  </a>;
}
export function Archive({ categories, articles, active, onSelect, archiveView, onRead }) {
  const root = useRef(null);
  useSectionMotion(root, archiveView, active);
  const filters = [{ id: 'all', cn: '全部' }, ...categories];
  const filtered = active === 'all' ? articles : articles.filter(item => item.categoryId === active);
  const shown = archiveView ? filtered : filtered.slice(0, 6);
  function navigateTab(event, index) {
    const next = { ArrowRight: (index + 1) % filters.length, ArrowLeft: (index + filters.length - 1) % filters.length, Home: 0, End: filters.length - 1 }[event.key];
    if (next !== undefined) { event.preventDefault(); onSelect(filters[next].id); document.getElementById(`tab-${filters[next].id}`).focus(); }
  }
  return <section ref={root} id={archiveView ? 'archive' : 'work'} className={`work-section ${archiveView ? 'archive-view' : ''}`} aria-labelledby="work-title"><div className="container">
    <div className="section-display" aria-hidden="true"><span>{archiveView ? 'ARCHIVE.' : 'BEHIND'}</span><span>{archiveView ? 'INDEX' : 'THE PLAY.'}</span></div><div className="section-rule" /><div className="work-heading"><div><span className="section-overline">{archiveView ? 'THE ARCHIVE' : 'NOTES & IDEAS'}</span><h2 id="work-title">{archiveView ? '文章归档' : '思考与记录'}<span className="heading-dot">.</span></h2></div><p>记录设计方法，拆解游玩体验，<br />也收集那些值得带走的灵感。</p></div>
    <div className="filter-bar"><div className="tabs" role="tablist" aria-label="文章分类">{filters.map((c, i) => <button key={c.id} id={`tab-${c.id}`} role="tab" aria-selected={active === c.id} aria-controls="article-panel" tabIndex={active === c.id ? 0 : -1} onKeyDown={e => navigateTab(e, i)} onClick={() => onSelect(c.id)}>{c.cn}<span>{c.id === 'all' ? articles.length : c.items.length}</span></button>)}</div><span className="article-count">{String(filtered.length).padStart(2, '0')} 篇笔记</span></div>
    <div role="tabpanel" id="article-panel" aria-labelledby={`tab-${active}`} tabIndex={0}>
      {archiveView ? <div className="archive-list">{shown.map((item, index) => <a key={item.id} href={`#article/${item.id}`} onClick={onRead} className="archive-item"><span className="archive-index">{String(index + 1).padStart(2, '0')}</span><div><span className="card-meta">{item.category} / {item.type}</span><h3>{item.title}</h3></div><Arrow /></a>)}</div> : <div className="card-grid">{shown.map(item => <ArticleCard key={item.id} item={item} onRead={onRead} />)}</div>}
    </div>
    <div className="archive-footer"><span>好设计，从一个好问题开始。</span><a href={archiveView ? '#work' : '#archive'} onClick={() => onSelect('all')}>{archiveView ? '返回文章首页' : `查看全部 ${articles.length} 篇文章`} <Arrow /></a></div>
  </div></section>;
}
export function Contact() {
  const root = useRef(null);
  useSectionMotion(root, 'footer');
  return <footer ref={root} id="contact" className="site-footer"><div className="container">
    <div className="section-display footer-display" aria-hidden="true"><span>LET&#8217;S TALK.</span></div><div className="section-rule" /><div className="footer-main"><div className="footer-intro"><Wordmark /><p>一个想法，一次合作，<br />或只是聊聊我们热爱的游戏。</p></div><div className="footer-links"><div><span>邮箱</span>wjx731008@163.com</div><div><span>微信</span>1870777941</div></div></div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} PLAYER / MAKER</span><span className="footer-signoff">保持好奇，继续游玩。</span><a href="#home">回到顶部 ↑</a></div>
  </div></footer>;
}





