import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import SpotlightCard from './SpotlightCard';
import FlipCard from './FlipCard';
import { GROUPS, TAG_DIMS, GROUP_DESC, ALL_DESC, filterCards, groupCounts, tagVocabulary, tagCounts, splitSource, visibleRange } from './cardFilter';
import { cardsHref, cardHref, wheelTarget, bounceOffset } from './cardRoute';
import cards from '../content/cards/cards.json';
import './cards.css';

export { cards, cardHref };
const GROUP_EN = ['TRADE-OFFS', 'MASTERY', 'POWER', 'RISK', 'FAIR FAILURE', 'DISCOVERY', 'EXPRESSION', 'FANTASY', 'TOGETHER', 'METHODS'];
const EMPTY_TAGS = { 体验: [], 机制: [], 品类: [] };
const METHODS = '设计方法与工具';
const STEP = 296; // card 280 + gap 16
const pad = n => String(n).padStart(2, '0');

// Homepage entry: a 4×3 bento of the 10 groups (MagicBento-style edge light, kept lightweight).
export function DesignCardsEntry() {
  const counts = useMemo(() => groupCounts(cards), []);
  const max = Math.max(...Object.values(counts));
  const onMove = e => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`); e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`); };
  return <section id="card-entry" className="work-section dc-section" aria-labelledby="cards-title"><div className="container">
    <div className="section-display" aria-hidden="true"><span>DESIGN</span><span>CARDS.</span></div><div className="section-rule" />
    <div className="work-heading dc-heading"><div><h2 id="cards-title">设计卡片<span className="heading-dot">.</span></h2></div><p>9 种玩家体验 + 1 组设计方法，共 {cards.length} 张。<br />每张写清：解决什么问题、怎么做、前提和代价。</p></div>
    <div className="dc-bento">{GROUPS.map((g, i) => {
      const wide = i === 0 || i === 9;
      const samples = cards.filter(c => c.groups.includes(g)).slice(0, wide ? 2 : 1);
      return <a key={g} href={cardsHref(g)} onPointerMove={onMove} className={`dc-tile${wide ? ' wide' : ''}${g === METHODS ? ' method' : ''}`} aria-label={`${g}，${counts[g]} 张卡`}>
        <div className="dc-tile-top"><span><span className="idx num">{pad(i + 1)}</span>{GROUP_EN[i]}</span><span className="go" aria-hidden="true">↗</span></div>
        <h3>{g}{g === METHODS && <span className="dc-toolbox">工具箱</span>}</h3>
        <div className={wide ? 'samples' : ''}>{samples.map(c => <p key={c.slug} className="sample">{c.title}</p>)}</div>
        <div className="dc-tile-foot"><span className="num">{counts[g]} 张</span><span className="meter"><i style={{ width: `${Math.round(counts[g] / max * 100)}%` }} /></span></div>
      </a>;
    })}</div>
    <div className="dc-home-foot"><span>悬停查看样例，点击进入该组卡片。</span><a className="hero-link" href="#cards">浏览全部 {cards.length} 张卡片 →</a></div>
  </div></section>;
}

function Front({ card, index, total, group }) {
  const cross = group ? card.groups.filter(g => g !== group) : [];
  return <SpotlightCard className="dc-face" spotlightColor="#b4d4dd" intensity={0.11} spotlightSize={320} proximity={0} flare={false}
    style={{ '--spotlight-card-surface': 'transparent', '--spotlight-card-border': 'transparent', '--spotlight-card-shadow': 'none' }}>
    <div className="dc-face-inner">
      <div className="dc-meta"><span><span className="idx num">{pad(index + 1)}</span><span className="num"> / {total}</span>{cross.map(g => <span key={g} className="cross">+ {g}</span>)}</span>
        <span>{card.insight && <span className="ins">◆ 用户见解</span>}<span className="genre">{card.tags.品类.join(' · ')}</span></span></div>
      <h3>{card.title}</h3>
      <span className="lbl">问题</span><p className="prob">{card.problem}</p>
      {card.m && <><span className="lbl">做法</span><p className="how">{card.m}</p></>}
      <div className="dc-foot"><span><span className="exp">{card.tags.体验.join(' · ')}</span><span className="mech">{card.tags.机制.slice(0, 3).join(' / ')}</span></span><span className="flip">↻ 详情</span></div>
    </div>
  </SpotlightCard>;
}

function Back({ card, index, total, onUnflip }) {
  const sec = (key, letter, label, text, cls = '') => text && <div key={key} className={`bsec ${cls}`}><h4><i>{letter}</i>{label}</h4><p>{text}</p></div>;
  const src = splitSource(card.source);
  return <div className="dc-back">
    <div className="bhead"><div><div className="dc-meta"><span className="num">{pad(index + 1)} / {total}</span><span>{card.tags.品类.join(' · ')}</span>{card.insight && <span className="ins">◆ 用户见解</span>}</div><h3>{card.title}</h3></div>
      <button type="button" className="unflip" onClick={onUnflip} tabIndex={-1}>↻ 翻回 <span>Esc</span></button></div>
    <div className="bgrid" data-back-scroll>
      {card.m && <div className="full">{sec('m', 'M', '机制', card.m)}</div>}
      {sec('d', 'D', '动态', card.d)}{sec('a', 'A', '美学', card.a)}
      {sec('p', '前', '前提条件', card.premise)}{sec('r', '险', '风险与代价', card.risk, 'cost')}
      {card.extra.length > 0 && <div className="full"><div className="bsec"><h4><i>+</i>补充</h4>{card.extra.map((e, i) => <p key={i}>{e}</p>)}</div></div>}
    </div>
    <dl className="bfoot">
      {card.source && <><dt>来源</dt><dd title={card.source}>{src.text} {src.links.map(l => <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer">{l.host} ↗</a>)}</dd></>}
      {card.related.length > 0 && <><dt>关联</dt><dd>{card.related.slice(0, 3).map((r, i) => r.slug ? <a key={i} className="rel" href={cardHref(r.slug)}>→ {r.name}</a> : <span key={i} className="rel off">{r.name}</span>)}</dd></>}
    </dl>
  </div>;
}

function FilterPop({ dim, pool, vocab, selected, onToggle, onClearDim, onClose, shownCount, left }) {
  const ref = useRef(null);
  useEffect(() => {
    const onDown = e => { if (!ref.current?.contains(e.target) && !e.target.closest('.dc-fbtn')) onClose(); };
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('pointerdown', onDown); document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [onClose]);
  const opts = tagCounts(pool, dim, vocab);
  return <div ref={ref} className="dc-pop" role="dialog" aria-label={`${dim}筛选`} style={{ left }}>
    <h5><span>{dim} · 同维度内为“或”，跨维度为“且”</span><span>数字 = 当前分组内张数</span></h5>
    <div className="opts">{opts.map(({ tag, n }) => <button key={tag} type="button" className="opt" aria-pressed={selected.includes(tag)} disabled={!n && !selected.includes(tag)} onClick={() => onToggle(tag)}>{tag}<b className="num">{n}</b></button>)}</div>
    <div className="pop-foot"><span>已选 {selected.length} · 显示 <strong>{shownCount}</strong> 张</span><span><button type="button" className="dc-clear" onClick={onClearDim}>清除本维度</button><button type="button" className="done" onClick={onClose}>完成</button></span></div>
  </div>;
}

// Cards page: #cards, #cards/<group>, or #card/<slug> (deep link: centre and flip that card).
export function CardsPage({ group, focus }) {
  const [tags, setTags] = useState(EMPTY_TAGS);
  const [flipped, setFlipped] = useState(() => new Set(focus ? [focus] : []));
  const [hovered, setHovered] = useState(-1);
  const [openDim, setOpenDim] = useState(null);
  const [popLeft, setPopLeft] = useState(0);
  const [scroll, setScroll] = useState({ scrollLeft: 0, clientWidth: 1, scrollWidth: 1 });
  const [pulse, setPulse] = useState(null);
  const track = useRef(null);
  const hoverTimer = useRef(0);
  const lastFlipped = useRef(focus);
  const vocab = useMemo(() => tagVocabulary(cards), []);
  const counts = useMemo(() => groupCounts(cards), []);
  const pool = useMemo(() => filterCards(cards, { group }), [group]);
  const shown = filterCards(cards, { group, tags });
  const total = shown.length;

  const measure = useCallback(() => { const el = track.current; if (el) setScroll({ scrollLeft: el.scrollLeft, clientWidth: el.clientWidth, scrollWidth: el.scrollWidth }); }, []);
  const toggleTag = (dim, t) => setTags(cur => ({ ...cur, [dim]: cur[dim].includes(t) ? cur[dim].filter(x => x !== t) : [...cur[dim], t] }));
  const centre = (slug, behavior = 'smooth') => {
    const el = document.getElementById(`card-${slug}`), tr = track.current;
    if (!el || !tr) return;
    const wide = Math.min(600, tr.clientWidth);
    tr.scrollTo({ left: Math.max(0, el.offsetLeft - 24 - Math.max(0, (tr.clientWidth - 140 - wide) / 2)), behavior });
  };
  const toggleFlip = slug => setFlipped(cur => {
    const n = new Set(cur);
    if (n.has(slug)) n.delete(slug); else { n.add(slug); lastFlipped.current = slug; setTimeout(() => centre(slug), 60); }
    return n;
  });
  const onHover = i => on => {
    clearTimeout(hoverTimer.current);
    if (on) hoverTimer.current = setTimeout(() => setHovered(i), 60);
    else setHovered(cur => (cur === i ? -1 : cur));
  };

  useEffect(() => {
    const previous = document.title;
    document.title = `${group || '全部设计卡片'} — PLAYER / MAKER`;
    window.scrollTo({ top: 0, behavior: 'instant' });
    return () => { document.title = previous; };
  }, [group]);
  useLayoutEffect(() => {
    if (!focus) return;
    setTags(EMPTY_TAGS);
    setFlipped(cur => new Set([...cur, focus]));
    lastFlipped.current = focus;
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'instant' });
      centre(focus, 'instant');
      document.getElementById(`card-${focus}`)?.focus({ preventScroll: true });
      setPulse(focus); setTimeout(() => setPulse(null), 1200);
    });
  }, [focus]);
  useEffect(() => { if (track.current && !focus) track.current.scrollLeft = 0; measure(); }, [group, tags, focus, measure]);
  useEffect(() => {
    const el = track.current;
    if (!el) return undefined;
    const onWheel = e => {
      const back = e.target.closest?.('[data-back-scroll]');
      const target = wheelTarget(e, el, back && back.closest('.flip-card[data-flipped]') ? back : null);
      if (target === 'track') { e.preventDefault(); el.scrollBy({ left: e.deltaY }); }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => { el.removeEventListener('wheel', onWheel); el.removeEventListener('scroll', measure); window.removeEventListener('resize', measure); };
  }, [measure, total > 0]);
  useEffect(() => {
    const onKey = e => {
      if (e.key !== 'Escape' || openDim) return;
      const slug = document.activeElement?.id?.startsWith('card-') ? document.activeElement.id.slice(5) : lastFlipped.current;
      if (slug && flipped.has(slug)) { e.preventDefault(); setFlipped(cur => { const n = new Set(cur); n.delete(slug); return n; }); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flipped, openDim]);

  const onTrackKey = e => {
    if (!e.target.classList.contains('flip-card')) return;
    const list = [...track.current.querySelectorAll('.flip-card')];
    const at = list.indexOf(e.target);
    const next = { ArrowRight: list[at + 1], ArrowLeft: list[at - 1], Home: list[0], End: list.at(-1) }[e.key];
    if (next) { e.preventDefault(); next.focus({ preventScroll: true }); next.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' }); }
  };
  const page = dir => track.current?.scrollBy({ left: dir * 3 * STEP, behavior: 'smooth' });
  const max = scroll.scrollWidth - scroll.clientWidth;
  const atStart = scroll.scrollLeft <= 1, atEnd = scroll.scrollLeft >= max - 1;
  const [first, last] = visibleRange(scroll, total);
  const anyTag = TAG_DIMS.some(d => tags[d].length);
  const openPop = (dim, e) => {
    if (openDim === dim) return setOpenDim(null);
    const bar = e.currentTarget.closest('.dc-toolbar').getBoundingClientRect();
    setPopLeft(e.currentTarget.getBoundingClientRect().left - bar.left); setOpenDim(dim);
  };
  const onBarClick = e => {
    if (!max) return;
    const r = e.currentTarget.getBoundingClientRect();
    track.current.scrollTo({ left: ((e.clientX - r.left) / r.width) * scroll.scrollWidth - scroll.clientWidth / 2, behavior: 'smooth' });
  };

  return <div className="reading-page dc-page"><header className="reading-nav container"><a className="wordmark" href="#home">P<span>/</span>M.</a><a href="#card-entry">← 返回首页</a></header>
    <main className="container dc-page-main">
      <div className="dc-phead"><div className="reading-breadcrumb"><a href="#card-entry">设计卡片</a><span>/</span><span>{group || '全部'}</span></div>
        <h1 className="dc-page-title">{group || '全部设计卡片'}<span className="heading-dot">.</span><small>{group ? GROUP_DESC[group] : ALL_DESC(cards.length)}</small></h1></div>
      <nav className="dc-gtabs" aria-label="体验分组">
        {[null, ...GROUPS].map(g => <a key={g || 'all'} href={cardsHref(g)} aria-current={group === g ? 'page' : undefined} className={g === METHODS ? 'method' : undefined}>{g || '全部'}<sup className="num">{g ? counts[g] : cards.length}</sup></a>)}
      </nav>
      <div className="dc-toolbar">
        <div className="tl"><span className="dc-flabel">筛选</span>
          {TAG_DIMS.map(dim => <button key={dim} type="button" className="dc-fbtn" aria-expanded={openDim === dim} aria-haspopup="dialog" onClick={e => openPop(dim, e)}>
            <span>{dim}</span>{tags[dim].length > 0 && <span className="n num">{tags[dim].length}</span>}<span className="car" aria-hidden="true">▾</span></button>)}
          {anyTag && <><span className="vsep" />{TAG_DIMS.flatMap(dim => tags[dim].map(t => <span key={dim + t} className="chip"><b>{dim}</b>{t}<button type="button" className="x" aria-label={`移除 ${t}`} onClick={() => toggleTag(dim, t)}>×</button></span>))}
            <button type="button" className="dc-clear" onClick={() => setTags(EMPTY_TAGS)}>清除</button></>}
        </div>
        <div className="tr"><span className="count"><strong className="num">{total}</strong> 张</span><span className="vsep" />
          <button type="button" className="arrow" aria-label="向左浏览" disabled={atStart} onClick={() => page(-1)}>←</button>
          <button type="button" className="arrow" aria-label="向右浏览" disabled={atEnd} onClick={() => page(1)}>→</button></div>
        {openDim && <FilterPop dim={openDim} left={popLeft} pool={pool} vocab={vocab[openDim]} selected={tags[openDim]} onToggle={t => toggleTag(openDim, t)}
          onClearDim={() => setTags(cur => ({ ...cur, [openDim]: [] }))} onClose={() => setOpenDim(null)} shownCount={total} />}
      </div>
      <div className={`dc-stage${atStart ? '' : ' scrolled'}${atEnd ? ' at-end' : ''}`}>
        {openDim && <div className="dc-scrim" aria-hidden="true" />}
        {total ? <div className={`dc-track${hovered >= 0 ? ' hovering' : ''}`} ref={track} onKeyDown={onTrackKey} onPointerLeave={() => { clearTimeout(hoverTimer.current); setHovered(-1); }} aria-label="设计卡片列表">
          {shown.map((card, i) => {
            const isFlipped = flipped.has(card.slug);
            const hov = hovered === i && !isFlipped;
            const off = hovered >= 0 && !hov ? bounceOffset(i, hovered) : 0;
            return <FlipCard key={card.slug} id={`card-${card.slug}`} label={`${card.title}，${isFlipped ? '背面，按 Esc 翻回' : '按回车查看详情'}`}
              className={`${hov ? 'hov' : ''}${pulse === card.slug ? ' pulse' : ''}`}
              style={{ transform: hov ? 'translateY(-6px) scale(1.04)' : off ? `translateX(${off}px)` : undefined }}
              flipped={isFlipped} onFlip={() => toggleFlip(card.slug)} onHover={onHover(i)}
              front={<Front card={card} index={i} total={total} group={group} />}
              back={<Back card={card} index={i} total={total} onUnflip={() => toggleFlip(card.slug)} />} />;
          })}
        </div> : <p className="dc-empty">没有符合条件的卡片。<button type="button" className="dc-clear" onClick={() => setTags(EMPTY_TAGS)}>清除筛选</button></p>}
      </div>
      <div className="dc-prog"><span className="pos num">{total ? `${pad(first)}–${pad(last)} / ${total}` : '00 / 00'}</span>
        <span className="bar" onClick={onBarClick} aria-hidden="true"><i style={{ left: `${(scroll.scrollLeft / scroll.scrollWidth) * 100}%`, width: `${Math.min(100, (scroll.clientWidth / scroll.scrollWidth) * 100)}%` }} /></span>
        <span className="keys">滚轮 / <kbd>←</kbd><kbd>→</kbd> 浏览 · 点击翻面 · <kbd>Esc</kbd> 翻回</span></div>
    </main></div>;
}
