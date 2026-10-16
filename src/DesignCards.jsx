import { useEffect, useMemo, useRef, useState } from 'react';
import MagicBento from './MagicBento';
import SpotlightCard from './SpotlightCard';
import { GROUPS, TAG_DIMS, filterCards, groupCounts, tagVocabulary } from './cardFilter';
import cards from '../content/cards/cards.json';
import './cards.css';

export { cards };
const GROUP_EN = ['TRADE-OFFS', 'MASTERY', 'POWER', 'RISK', 'FAIR FAILURE', 'DISCOVERY', 'EXPRESSION', 'FANTASY', 'TOGETHER', 'METHODS'];
export const cardHref = slug => `#card/${encodeURIComponent(slug)}`;

function TagLine({ card }) {
  return <div className="dc-tags">{TAG_DIMS.flatMap(dim => card.tags[dim].map(t => <span key={dim + t} data-dim={dim}>{t}</span>))}</div>;
}

export function DesignCards({ onOpen }) {
  const [group, setGroup] = useState(null);
  const [tags, setTags] = useState({ 体验: [], 机制: [], 品类: [] });
  const counts = useMemo(() => groupCounts(cards), []);
  const vocab = useMemo(() => tagVocabulary(cards), []);
  const shown = filterCards(cards, { group, tags });
  const gridTop = useRef(null);
  const items = useMemo(() => GROUPS.map((g, i) => ({
    id: g,
    label: GROUP_EN[i],
    title: g,
    description: `${counts[g]} 张卡`,
    colSpan: i === 0 ? 2 : 1,
    rowSpan: 1,
  })), [counts]);
  const toggleTag = (dim, t) => setTags(cur => ({ ...cur, [dim]: cur[dim].includes(t) ? cur[dim].filter(x => x !== t) : [...cur[dim], t] }));
  const anyTag = TAG_DIMS.some(d => tags[d].length);
  return <section id="cards" className="work-section dc-section" aria-labelledby="cards-title"><div className="container">
    <div className="section-display" aria-hidden="true"><span>DESIGN</span><span>CARDS.</span></div><div className="section-rule" />
    <div className="work-heading"><div><h2 id="cards-title">设计卡片<span className="heading-dot">.</span></h2></div><p>按玩家体验分组的设计手段，<br />每张写清它解决什么问题、前提和代价。</p></div>
    <MagicBento className="dc-bento" items={items} columns={4} rowHeight={128} gap={12} radius={4} glowColor="#b4d4dd" intro={false} clickEffect={false}
      onItemClick={entry => { setGroup(cur => cur === entry.id ? null : entry.id); requestAnimationFrame(() => gridTop.current?.scrollIntoView({ behavior: 'instant', block: 'start' })); }}
      style={{ '--mb-surface': '#1b232c', '--mb-edge': '#afc5d316', '--mb-ink': '#e7edf2', '--mb-muted': '#a6b3c1', '--mb-shadow': 'none' }} />
    <style>{group ? `.dc-bento .magic-bento__cell:nth-child(${GROUPS.indexOf(group) + 1}) .magic-bento__card{outline:1px solid var(--accent);outline-offset:-1px}` : ''}</style>
    <div className="dc-filters" ref={gridTop}>
      {TAG_DIMS.map(dim => <div className="dc-filter-row" key={dim}><span className="dc-dim">{dim}</span><div>{vocab[dim].map(t =>
        <button key={t} type="button" aria-pressed={tags[dim].includes(t)} onClick={() => toggleTag(dim, t)}>{t}</button>)}</div></div>)}
    </div>
    <div className="filter-bar dc-status"><span className="dc-current">{group || '全部分组'}{anyTag && ` · ${TAG_DIMS.flatMap(d => tags[d]).join(' / ')}`}</span>
      <span className="dc-status-right">{(group || anyTag) && <button type="button" className="dc-clear" onClick={() => { setGroup(null); setTags({ 体验: [], 机制: [], 品类: [] }); }}>清除筛选</button>}<span className="article-count">{String(shown.length).padStart(2, '0')} 张卡</span></span></div>
    {shown.length ? <div className="dc-grid">{shown.map(card =>
      <SpotlightCard key={card.slug} className="dc-card" spotlightColor="#b4d4dd" intensity={0.12} proximity={0} flare={false} style={{ '--spotlight-card-surface': '#1b232c', '--spotlight-card-border': '#afc5d316', '--spotlight-card-shadow': 'none' }}>
        <a href={cardHref(card.slug)} onClick={onOpen} className="dc-card-link">
          <div className="card-meta">{card.groups.join(' / ')}{card.insight && <span className="dc-insight">用户见解</span>}</div>
          <h3>{card.title}</h3>
          <p>{card.problem}</p>
          <TagLine card={card} />
        </a>
      </SpotlightCard>)}</div> : <p className="dc-empty">没有符合条件的卡片。</p>}
    <div className="archive-footer"><span>共 {cards.length} 张卡片。</span><a href="#work">回到文章 ↑</a></div>
  </div></section>;
}

function Linked({ text }) {
  return String(text).split(/(https?:\/\/[^\s；，、）)]+)/g).map((p, i) => /^https?:\/\//.test(p) ? <a key={i} className="reading-link" href={p} target="_blank" rel="noopener noreferrer">{p}</a> : p);
}

export function CardPage({ slug, returnHref = '#cards' }) {
  const card = cards.find(c => c.slug === slug);
  const title = useRef(null);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    title.current?.focus({ preventScroll: true });
    const previous = document.title;
    document.title = `${card?.title || '卡片未找到'} — PLAYER / MAKER`;
    return () => { document.title = previous; };
  }, [card]);
  const rows = card && [['解决的设计问题', card.problem], ['机制 M', card.m], ['动态 D', card.d], ['美学 A', card.a], ['前提条件', card.premise], ['风险与代价', card.risk]].filter(([, v]) => v);
  return <div className="reading-page"><header className="reading-nav container"><a className="wordmark" href="#home">P<span>/</span>M.</a><a href={returnHref}>← 返回设计卡片</a></header>
    <main className="reading-main"><div className="reading-breadcrumb"><a href={returnHref}>设计卡片</a><span>/</span><span>{card?.groups.join(' / ') || '卡片'}</span></div>
      <h1 tabIndex={-1} ref={title}>{card?.title || '没有找到这张卡片'}</h1>
      {card ? <>
        <div className="reading-meta">{card.insight && <span className="dc-insight">用户见解</span>}<span>{card.groups.join(' / ')}</span><span>{card.slug}</span></div>
        <TagLine card={card} />
        <div className="reading-body dc-detail">
          {rows.map(([k, v]) => <section key={k}><h4 className="reading-label">{k}</h4><p><Linked text={v} /></p></section>)}
          {card.extra.length > 0 && <section><h4 className="reading-label">补充</h4><ul className="reading-list">{card.extra.map((e, i) => <li key={i}><Linked text={e} /></li>)}</ul></section>}
          {card.source && <section><h4 className="reading-label">来源</h4><p><Linked text={card.source} /></p></section>}
          {card.related.length > 0 && <section><h4 className="reading-label">关联</h4><ul className="reading-list">{card.related.map((r, i) => <li key={i}>{r.slug ? <a className="reading-link" href={cardHref(r.slug)}>{r.name}</a> : r.name}{r.note && `（${r.note}）`}</li>)}</ul></section>}
        </div>
      </> : <p>链接可能已变更，你可以返回设计卡片查看其他卡片。</p>}
      <div className="reading-footer"><a href={returnHref}>← 返回设计卡片</a><a href="#work">文章 ↗</a></div></main></div>;
}
