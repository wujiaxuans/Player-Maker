import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import MagicBento from './MagicBento';
import SpotlightCard from './SpotlightCard';
import FlipCard from './FlipCard';
import { GROUPS, TAG_DIMS, filterCards, groupCounts, tagVocabulary } from './cardFilter';
import { cardsHref, cardHref, wheelTarget, bounceOffset } from './cardRoute';
import cards from '../content/cards/cards.json';
import './cards.css';

export { cards, cardHref };
const GROUP_EN = ['TRADE-OFFS', 'MASTERY', 'POWER', 'RISK', 'FAIR FAILURE', 'DISCOVERY', 'EXPRESSION', 'FANTASY', 'TOGETHER', 'METHODS'];
const EMPTY_TAGS = { 体验: [], 机制: [], 品类: [] };
const SURFACE = { '--spotlight-card-surface': '#1b232c', '--spotlight-card-border': '#afc5d316', '--spotlight-card-shadow': 'none' };

function TagLine({ card }) {
  return <div className="dc-tags">{TAG_DIMS.flatMap(dim => card.tags[dim].map(t => <span key={dim + t} data-dim={dim}>{t}</span>))}</div>;
}
function Linked({ text }) {
  return String(text).split(/(https?:\/\/[^\s；，、）)]+)/g).map((p, i) => /^https?:\/\//.test(p) ? <a key={i} className="reading-link" href={p} target="_blank" rel="noopener noreferrer">{p}</a> : p);
}

// Homepage: entry only — a bento of the 10 groups.
export function DesignCardsEntry() {
  const counts = useMemo(() => groupCounts(cards), []);
  const items = useMemo(() => GROUPS.map((g, i) => ({ id: g, label: GROUP_EN[i], title: g, description: `${counts[g]} 张卡`, colSpan: i === 0 ? 2 : 1 })), [counts]);
  return <section id="card-entry" className="work-section dc-section" aria-labelledby="cards-title"><div className="container">
    <div className="section-display" aria-hidden="true"><span>DESIGN</span><span>CARDS.</span></div><div className="section-rule" />
    <div className="work-heading"><div><h2 id="cards-title">设计卡片<span className="heading-dot">.</span></h2></div><p>按玩家体验分组的设计手段，<br />每张写清它解决什么问题、前提和代价。</p></div>
    <MagicBento className="dc-bento" items={items} columns={4} rowHeight={128} gap={12} radius={4} glowColor="#b4d4dd" intro={false} clickEffect={false}
      onItemClick={entry => { location.hash = cardsHref(entry.id); }}
      style={{ '--mb-surface': '#1b232c', '--mb-edge': '#afc5d316', '--mb-ink': '#e7edf2', '--mb-muted': '#a6b3c1', '--mb-shadow': 'none' }} />
    <div className="archive-footer"><span>共 {cards.length} 张卡片。</span><a href="#cards">浏览全部卡片 ↗</a></div>
  </div></section>;
}

function Front({ card }) {
  return <SpotlightCard className="dc-face" spotlightColor="#b4d4dd" intensity={0.12} proximity={0} flare={false} style={SURFACE}>
    <div className="dc-face-inner">
      <div className="card-meta">{card.groups.join(' / ')}{card.insight && <span className="dc-insight">用户见解</span>}</div>
      <h3>{card.title}</h3>
      <span className="dc-label">解决的设计问题</span>
      <p>{card.problem}</p>
      <TagLine card={card} />
      <span className="dc-hint">点击翻面 ↻</span>
    </div>
  </SpotlightCard>;
}
function Back({ card }) {
  const rows = [['机制 M', card.m], ['动态 D', card.d], ['美学 A', card.a], ['前提条件', card.premise], ['风险与代价', card.risk]].filter(([, v]) => v);
  return <div className="dc-face dc-back" style={{ background: '#1b232c' }}>
    <div className="dc-back-head"><h3>{card.title}</h3><span className="dc-hint">↻</span></div>
    <div className="dc-back-scroll" data-back-scroll>
      {rows.map(([k, v]) => <section key={k}><h4>{k}</h4><p><Linked text={v} /></p></section>)}
      {card.extra.length > 0 && <section><h4>补充</h4>{card.extra.map((e, i) => <p key={i}><Linked text={e} /></p>)}</section>}
      {card.source && <section><h4>来源</h4><p><Linked text={card.source} /></p></section>}
      {card.related.length > 0 && <section><h4>关联</h4><ul>{card.related.map((r, i) => <li key={i}>{r.slug ? <a className="reading-link" href={cardHref(r.slug)}>{r.name}</a> : r.name}{r.note && `（${r.note}）`}</li>)}</ul></section>}
    </div>
  </div>;
}

// Cards page: #cards, #cards/<group>, or #card/<slug> (deep link: scroll to and flip).
export function CardsPage({ group, focus }) {
  const [tags, setTags] = useState(EMPTY_TAGS);
  const [flipped, setFlipped] = useState(() => new Set(focus ? [focus] : []));
  const [hovered, setHovered] = useState(-1);
  const track = useRef(null);
  const vocab = useMemo(() => tagVocabulary(cards), []);
  const counts = useMemo(() => groupCounts(cards), []);
  const shown = filterCards(cards, { group, tags });
  const anyTag = TAG_DIMS.some(d => tags[d].length);
  const toggleTag = (dim, t) => setTags(cur => ({ ...cur, [dim]: cur[dim].includes(t) ? cur[dim].filter(x => x !== t) : [...cur[dim], t] }));
  const toggleFlip = slug => setFlipped(cur => { const n = new Set(cur); n.has(slug) ? n.delete(slug) : n.add(slug); return n; });

  useEffect(() => {
    const previous = document.title;
    document.title = `${group || '全部设计卡片'} — PLAYER / MAKER`;
    return () => { document.title = previous; };
  }, [group]);
  useEffect(() => { if (!focus) window.scrollTo({ top: 0, behavior: 'instant' }); }, [group, focus]);
  useLayoutEffect(() => {
    if (!focus) return;
    setTags(EMPTY_TAGS);
    setFlipped(cur => new Set([...cur, focus]));
    const el = document.getElementById(`card-${focus}`);
    if (el && track.current) {
      track.current.scrollLeft = el.offsetLeft - (track.current.clientWidth - el.offsetWidth) / 2;
      track.current.scrollIntoView({ behavior: 'instant', block: 'center' });
      el.focus({ preventScroll: true });
    }
  }, [focus]);
  useEffect(() => { if (track.current && !focus) track.current.scrollLeft = 0; }, [group, tags, focus]);
  useEffect(() => {
    const el = track.current;
    if (!el) return undefined;
    const onWheel = e => {
      const back = e.target.closest?.('[data-back-scroll]');
      const target = wheelTarget(e, el, back && back.closest('.flip-card[data-flipped]') ? back : null);
      if (target === 'track') { e.preventDefault(); el.scrollLeft += e.deltaY; }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);
  const onTrackKey = e => {
    if (!['ArrowRight', 'ArrowLeft'].includes(e.key) || !e.target.classList.contains('flip-card')) return;
    const next = e.key === 'ArrowRight' ? e.target.nextElementSibling : e.target.previousElementSibling;
    if (next) { e.preventDefault(); next.focus(); next.scrollIntoView({ behavior: 'instant', inline: 'center', block: 'nearest' }); }
  };

  return <div className="reading-page dc-page"><header className="reading-nav container"><a className="wordmark" href="#home">P<span>/</span>M.</a><a href="#card-entry">← 返回首页</a></header>
    <main className="container dc-page-main">
      <div className="reading-breadcrumb"><a href="#card-entry">设计卡片</a><span>/</span><span>{group || '全部'}</span></div>
      <h1 className="dc-page-title">{group || '全部设计卡片'}<span className="heading-dot">.</span></h1>
      <div className="tabs dc-group-tabs" role="tablist" aria-label="体验分组">
        {[null, ...GROUPS].map(g => <a key={g || 'all'} role="tab" href={cardsHref(g)} aria-selected={group === g}>{g || '全部'}<span>{g ? counts[g] : cards.length}</span></a>)}
      </div>
      <div className="dc-filters">
        {TAG_DIMS.map(dim => <div className="dc-filter-row" key={dim}><span className="dc-dim">{dim}</span><div>{vocab[dim].map(t =>
          <button key={t} type="button" aria-pressed={tags[dim].includes(t)} onClick={() => toggleTag(dim, t)}>{t}</button>)}</div></div>)}
      </div>
      <div className="filter-bar dc-status"><span className="dc-current">{group || '全部分组'}{anyTag && ` · ${TAG_DIMS.flatMap(d => tags[d]).join(' / ')}`}</span>
        <span className="dc-status-right">{anyTag && <button type="button" className="dc-clear" onClick={() => setTags(EMPTY_TAGS)}>清除标签</button>}<span className="article-count">{String(shown.length).padStart(2, '0')} 张卡</span></span></div>
      {shown.length ? <div className="dc-track" ref={track} onKeyDown={onTrackKey} onPointerLeave={() => setHovered(-1)} aria-label="卡片，滚轮或左右方向键浏览">
        {shown.map((card, i) => <FlipCard key={card.slug} id={`card-${card.slug}`} label={`${card.title}，${flipped.has(card.slug) ? '背面，按回车翻回正面' : '按回车查看详情'}`}
          flipped={flipped.has(card.slug)} onFlip={() => toggleFlip(card.slug)}
          scale={hovered === i ? 1.06 : 1} offset={bounceOffset(i, hovered)}
          onHover={on => setHovered(cur => on ? i : (cur === i ? -1 : cur))}
          front={<Front card={card} />} back={<Back card={card} />} />)}
      </div> : <p className="dc-empty">没有符合条件的卡片。</p>}
      <p className="dc-help">滚轮左右浏览，点击卡片翻面；翻到背面后，在卡片内滚动查看全文。</p>
    </main></div>;
}
