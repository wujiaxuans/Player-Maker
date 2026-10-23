import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import SpotlightCard from './SpotlightCard';
import BounceCards from './BounceCards';
import CardArtwork from './CardArtwork.jsx';
import { useSectionMotion } from './motion';
import { GROUPS, TAG_DIMS, GROUP_DESC, ALL_DESC, filterCards, groupCounts, tagVocabulary, tagCounts, splitSource } from './cardFilter';
import { cardsHref, cardHref } from './cardRoute';
import cards from '../content/cards/cards.json';
import './cards.css';
const Stack = lazy(() => import('./Stack'));
import { beijingDate, dailyCards, recentCards } from './cardDiscovery';

export { cards, cardHref };
const GROUP_EN = ['TRADE-OFFS', 'MASTERY', 'POWER', 'RISK', 'FAIR FAILURE', 'DISCOVERY', 'EXPRESSION', 'FANTASY', 'TOGETHER', 'METHODS'];
const GROUP_COLORS = ['#e6bd68', '#85c7ed', '#9ed47a', '#ed9c70', '#7ed1c7', '#6ed2ac', '#b99ae9', '#d89fcf', '#eea0ae', '#bbcba1'];
const cardTheme = (card, group) => ({ '--category-color': GROUP_COLORS[Math.max(0, GROUPS.indexOf(group || card.groups[0]))] });
const EMPTY_TAGS = { 体验: [], 机制: [], 品类: [] };
const METHODS = '设计方法与工具';
const pad = n => String(n).padStart(2, '0');

const SYMBOLS = [
  'M24 42V24M24 24L10 10M24 24L38 10M10 20V10H20M28 10H38V20',
  'M8 38L20 12L28 28L34 18L42 38Z',
  'M8 40V30H18V22H28V14H38V6',
  'M26 4L10 27H23L20 44L38 20H25Z',
  'M24 5L40 12V24Q38 36 24 43Q10 36 8 24V12ZM16 24L22 30L33 18',
  'M24 4V12M24 36V44M4 24H12M36 24H44M24 15L33 24L24 33L15 24Z',
  'M8 38L18 10L28 31L40 14M8 38H40',
  'M24 4L29 19L44 24L29 29L24 44L19 29L4 24L19 19Z',
  'M24 16C8 0 0 32 20 32H28C48 32 40 0 24 16ZM24 16V40',
  'M8 8H20V20H8ZM28 8H40V20H28ZM8 28H20V40H8ZM28 34H40M34 28V40'
];
function GroupSymbol({ index }) {
  return <svg className="dc-symbol" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={SYMBOLS[index]} /></svg>;
}


function useDiscoveryDate() {
  const [date, setDate] = useState(beijingDate);
  useEffect(() => {
    const update = () => setDate(beijingDate());
    const timer = setInterval(update, 30000);
    document.addEventListener('visibilitychange', update);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', update); };
  }, []);
  return date;
}
function DiscoveryDetail({ card, onClose }) {
  const dialog = useRef(null);
  useEffect(() => { const previous = document.body.style.overflow; document.body.style.overflow = 'hidden'; dialog.current.showModal(); return () => { document.body.style.overflow = previous; }; }, []);
  return <dialog ref={dialog} className="discovery-dialog dc-bounce-content" aria-label={card.title} onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <Back card={card} index={cards.findIndex(c => c.slug === card.slug)} total={cards.length} onUnflip={onClose} />
  </dialog>;
}
function DailyStack({ date, home = false }) {
  const picks = useMemo(() => dailyCards(cards, date), [date]);
  const [top, setTop] = useState(0);
  const [next, setNext] = useState(0);
  const [detail, setDetail] = useState(null);
  const controls = <div className="daily-controls"><span className="num" aria-live="polite">{pad(top + 1)} <i>/ {pad(picks.length)}</i></span><button type="button" onClick={() => setNext(n => n + 1)}>下一张 <span>→</span></button></div>;
  return <div className={`daily-feature${home ? ' daily-feature-home' : ''}`}>
    {home ? <header className="daily-home-heading"><h3>今日推荐</h3><time>{date.replaceAll('-', '.')}</time></header> : <div className="daily-copy"><span className="discovery-eyebrow">DAILY DRAW / {date.replaceAll('-', '.')}</span><h3>今天，<br />从这三张开始</h3><p>换一个角度，看看熟悉的设计问题。<br />每天三张，留一点新的思路。</p>{!home && controls}<small>拖动卡片换一张 · 每日零点更新</small></div>}

    <div className="daily-stack-wrap"><Suspense fallback={<div className="daily-stack-loading">正在整理今日卡片…</div>}><Stack key={date} nextSignal={next} layout="fan" visible={3} spread={.85} depth={.25} tilt={12} speed={.75} radius={14} sendToBackOnClick={false} autoplay={false} onChange={setTop}
      cards={picks.map(card => <div className="daily-card" key={card.slug} style={cardTheme(card)}><div className="daily-card-category"><span className="dc-category-dot" />{card.groups[0]}<span>DAILY PICK</span></div><h4>{card.title}</h4><p>{card.problem}</p><CardArtwork slug={card.slug} /><div className="daily-card-bottom"><span>{card.tags.品类.join(' · ')}</span><button type="button" onClick={() => setDetail(card)}>查看详情 ↗</button></div></div>)} /></Suspense></div>
    {home && <div className="daily-stack-controls"><span className="daily-drag-hint">拖动探索 · 每天三张</span>{controls}</div>}
    {detail && <DiscoveryDetail card={detail} onClose={() => setDetail(null)} />}
  </div>;
}
function RecentList({ date }) {
  const latest = recentCards(cards, date);
  const [detail, setDetail] = useState(null);
  return <aside className="recent-feature"><div className="recent-heading"><h3>近三天新增<small>{pad(latest.length)}</small></h3></div>
    {latest.length ? <div className="recent-list">{latest.slice(0,4).map(card => <button key={card.slug} onClick={() => setDetail(card)}><time>{card.addedAt.slice(5).replace('-', '.')}</time><span>{card.title}<small>{card.groups[0]}</small></span><b>↗</b></button>)}</div> : <div className="recent-empty"><span aria-hidden="true">＋</span><h4>新的想法，正在路上。</h4><p>最近三天暂无新增卡片。<br />先从今天的推荐里，找一点灵感。</p></div>}
    <a className="recent-all" href="#cards/recent">查看最近新增 <span>↗</span></a>
    {detail && <DiscoveryDetail card={detail} onClose={() => setDetail(null)} />}
  </aside>;
}

// Homepage entry: a 4×3 bento of the 10 groups (MagicBento-style edge light, kept lightweight).
export function DesignCardsEntry() {
  const root = useRef(null);
  useSectionMotion(root, 'cards-entry');
  const date = useDiscoveryDate();
  const counts = useMemo(() => groupCounts(cards), []);
  const onMove = e => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`); e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`); };
  return <section ref={root} id="card-entry" className="work-section dc-section" aria-labelledby="cards-title"><div className="container">
    <div className="section-display" aria-hidden="true"><span>DESIGN</span><span>CARDS.</span></div><div className="section-rule" />
    <div className="work-heading dc-heading"><h2 id="cards-title" className="visually-hidden">设计卡片</h2><p>9 种玩家体验 + 1 组设计方法，共 {cards.length} 张。每张写清：解决什么问题、怎么做、前提和代价。</p></div>
    <div className="dc-discovery"><DailyStack key={date} date={date} home /><RecentList date={date} /></div>
    <div className="dc-bento-label"><span>按体验探索</span></div>
    <div className="dc-bento">{GROUPS.map((g, i) => {
      const wide = i === 0 || i === 9;
      const samples = cards.filter(c => c.groups.includes(g)).slice(0, wide ? 2 : 1);
      return <a key={g} href={cardsHref(g)} onPointerMove={onMove} className={`dc-tile${wide ? ' wide' : ''}${g === METHODS ? ' method' : ''}`} aria-label={`${g}，${counts[g]} 张卡`}>
        <div className="dc-tile-top"><span><span className="idx num">{pad(i + 1)}</span>{GROUP_EN[i]}</span><span className="go" aria-hidden="true">↗</span></div>
        <GroupSymbol index={i} /><h3>{g}{g === METHODS && <span className="dc-toolbox">工具箱</span>}</h3>
        <div className={wide ? 'samples' : ''}>{samples.map(c => <p key={c.slug} className="sample">{c.title}</p>)}</div>
        <div className="dc-tile-foot"><span className="num">{counts[g]} 张</span></div>
      </a>;
    })}</div>
    <div className="dc-home-foot"><span>选择一种体验，展开这组设计卡片。</span><a className="hero-link" href="#cards">浏览全部 {cards.length} 张卡片 →</a></div>
  </div></section>;
}

function Front({ card, group }) {
  const category = group || card.groups[0];
  return <SpotlightCard className="dc-face" spotlightColor="#ffffff" intensity={0.06} spotlightSize={320} proximity={0} flare={false}
    style={{ '--spotlight-card-surface': 'transparent', '--spotlight-card-border': 'transparent', '--spotlight-card-shadow': 'none' }}>
    <CardArtwork slug={card.slug} />
    <div className="dc-face-inner">
      <div className="dc-category"><span className="dc-category-dot" />{category}<span className="dc-category-en">{GROUP_EN[GROUPS.indexOf(category)]}</span></div>
      <h3>{card.title}</h3>
      <p className="prob">{card.problem}</p>
      <div className="dc-front-bottom">
        <div className="dc-front-tags">{card.tags.体验.slice(0, 3).map(t => <span key={t}>{t}</span>)}</div>
        <div className="dc-front-action"><span className="genre">{card.tags.品类.join(' · ')}</span><span className="flip">查看详情 <span aria-hidden="true">↗</span></span></div>
      </div>
    </div>
  </SpotlightCard>;
}

function Back({ card, index, total, onUnflip }) {
  const sec = (key, letter, label, text, cls = '') => text && <div key={key} className={`bsec ${cls}`}><h4><i>{letter}</i>{label}</h4><p>{text}</p></div>;
  const src = splitSource(card.source);
  return <div className="dc-back">
    <div className="bhead"><div><div className="dc-meta"><span className="num">{pad(index + 1)} / {total}</span><span>{card.tags.品类.join(' · ')}</span>{card.insight && <span className="ins">◆ 用户见解</span>}</div><h3>{card.title}</h3></div>
      <button type="button" className="unflip" onClick={onUnflip}>收起详情 <span>Esc</span></button></div>
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
    <div className="opts">{opts.map(({ tag, n }) => <button key={tag} type="button" className="opt" aria-pressed={selected.includes(tag)} disabled={!n && !selected.includes(tag)} onMouseDown={e => e.preventDefault()} onClick={() => onToggle(tag)}>{tag}<b className="num">{n}</b></button>)}</div>
    <div className="pop-foot"><span>已选 {selected.length} · 显示 <strong>{shownCount}</strong> 张</span><span><button type="button" className="dc-clear" onClick={onClearDim}>清除本维度</button><button type="button" className="done" onClick={onClose}>完成</button></span></div>
  </div>;
}

// Cards page: #cards, #cards/<group>, or #card/<slug> (deep link: centre and flip that card).
export function CardsPage({ group, focus, view }) {
  const date = useDiscoveryDate();
  const recent = useMemo(() => recentCards(cards, date), [date]);
  const source = view === 'recent' ? recent : cards;
  const [tags, setTags] = useState(EMPTY_TAGS);
  const [flipped, setFlipped] = useState(focus || null);
  const [openDim, setOpenDim] = useState(null);
  const track = useRef(null);
  const [position, setPosition] = useState(0);
  const vocab = useMemo(() => tagVocabulary(cards), []);
  const counts = useMemo(() => groupCounts(cards), []);
  const pool = useMemo(() => filterCards(source, { group }), [source, group]);
  const shown = useMemo(() => filterCards(source, { group, tags }), [source, group, tags]);
  const total = shown.length;
  // Keep two preview cards at either end; short decks share one centered position.
  const minPosition = total >= 5 ? 2 : Math.max(0, (total - 1) / 2);
  const maxPosition = total >= 5 ? total - 3 : minPosition;
  const deckPosition = Math.max(minPosition, Math.min(maxPosition, position));
  const index = Math.round(deckPosition);
  const readingIndex = flipped ? shown.findIndex(card => card.slug === flipped) : -1;
  const start = Math.max(0, index - 4);
  const visible = shown.slice(start, index + 5);
  const spacing = 260;
  const atStart = deckPosition <= minPosition, atEnd = deckPosition >= maxPosition;
  const anyTag = TAG_DIMS.some(d => tags[d].length);
  const select = i => {
    const next = shown[Math.max(0, Math.min(total - 1, i))];
    if (next) { setPosition(Math.max(minPosition, Math.min(maxPosition, i))); setFlipped(null); }
  };
  const keepScroll = fn => {
    const y = window.scrollY;
    fn();
    requestAnimationFrame(() => {
      window.scrollTo({ top: y, left: 0, behavior: 'instant' });
      requestAnimationFrame(() => window.scrollTo({ top: y, left: 0, behavior: 'instant' }));
    });
  };
  const toggleTag = (dim, t) => {
    keepScroll(() => {
      setTags(cur => ({ ...cur, [dim]: cur[dim].includes(t) ? cur[dim].filter(x => x !== t) : [...cur[dim], t] }));
      setPosition(0); setFlipped(null);
    });
  };
  const toggleDim = dim => keepScroll(() => setOpenDim(cur => cur === dim ? null : dim));
  useEffect(() => {
    const previous = document.title;
    document.title = `${view === 'today' ? '今日推荐' : view === 'recent' ? '最近新增' : group || '全部设计卡片'} — PLAYER / MAKER`;
    setFlipped(focus || null);
    setPosition(Math.max(0, filterCards(cards, { group }).findIndex(c => c.slug === focus)));
    setTags(EMPTY_TAGS); setOpenDim(null);
    window.scrollTo({ top: 0, behavior: 'instant' });
    return () => { document.title = previous; };
  }, [group, focus]);
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onWheel = e => {
      // Reading and filter interactions retain their native vertical scroll.
      if (flipped || openDim || e.ctrlKey || e.target.closest('[data-back-scroll]')) return;
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (!delta || (delta < 0 && atStart) || (delta > 0 && atEnd)) return;
      e.preventDefault();
      const pixels = delta * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientWidth : 1);
      setPosition(Math.max(minPosition, Math.min(maxPosition, deckPosition + pixels / spacing)));

    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [index, shown, flipped, openDim, atStart, atEnd, spacing, total, minPosition, maxPosition, deckPosition]);
  const onKey = e => {
    if (e.key === 'Escape') { setFlipped(null); return; }
    if (e.target.closest('a,button,input')) return;
    const next = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: minPosition, End: maxPosition }[e.key];
    if (next !== undefined) { e.preventDefault(); select(next); track.current?.focus(); }
  };
  return <div className="reading-page dc-page"><header className="reading-nav container"><a className="wordmark" href="#home">P<span>/</span>M.</a><span className="dc-nav-caption">DESIGN LIBRARY / 设计卡片</span><a href="#card-entry">← 返回首页</a></header>
    <main className="container dc-page-main">
      <aside className="dc-sidebar" aria-label="卡片分类与筛选">
        <div className="dc-sidebar-heading"><h2>设计卡片</h2><p>从一种体验，找到一个设计切口。</p></div>
        <nav className="dc-discovery-nav" aria-label="发现卡片"><span>为你发现</span><a href="#cards/today" aria-current={view === 'today' ? 'page' : undefined}>今日推荐 <sup>03</sup></a><a href="#cards/recent" aria-current={view === 'recent' ? 'page' : undefined}>最近新增 <sup>{recent.length}</sup></a></nav>
        <nav className="dc-gtabs" aria-label="体验分组">
          {[null, ...GROUPS].map((g, i) => <a key={g || 'all'} href={cardsHref(g)} aria-current={!view && (group || null) === g ? 'page' : undefined} style={{ '--category-color': g ? GROUP_COLORS[i - 1] : '#d5f36b' }}><span className="dc-category-dot" /><span>{g || '全部卡片'}</span><sup className="num">{g ? counts[g] : cards.length}</sup></a>)}
        </nav>
        {view !== 'today' && <div className="dc-sidebar-filters"><div className="dc-filter-heading"><span>进一步筛选</span>{anyTag && <button type="button" className="dc-clear" onClick={() => keepScroll(() => { setTags(EMPTY_TAGS); setPosition(0); setFlipped(null); })}>清除全部</button>}</div>
          {TAG_DIMS.map(dim => <div className="dc-filter-section" key={dim}>
            <button type="button" className="dc-fbtn" aria-expanded={openDim === dim} onClick={() => toggleDim(dim)}><span>{dim}</span>{tags[dim].length > 0 && <span className="n num">{tags[dim].length}</span>}<span className="car" aria-hidden="true">{openDim === dim ? '−' : '+'}</span></button>
            {openDim === dim && <FilterPop dim={dim} left={0} pool={pool} vocab={vocab[dim]} selected={tags[dim]} onToggle={t => toggleTag(dim, t)} onClearDim={() => keepScroll(() => { setTags(cur => ({ ...cur, [dim]: [] })); setPosition(0); setFlipped(null); })} onClose={() => setOpenDim(null)} shownCount={total} />}
          </div>)}
          {anyTag && <div className="dc-selected-tags">{TAG_DIMS.flatMap(dim => tags[dim].map(t => <span key={dim + t} className="chip">{t}<button type="button" className="x" aria-label={`移除 ${t}`} onClick={() => toggleTag(dim, t)}>×</button></span>))}</div>}
        </div>}
      </aside>
      {view === 'today' ? <section className="dc-workspace dc-today-workspace" aria-label="今日推荐"><div className="dc-phead"><h1 className="dc-page-title">今日推荐</h1></div><DailyStack key={date} date={date} /></section> : <section className="dc-workspace" aria-label="卡片浏览">
        <div className="dc-toolbar"><div className="dc-phead"><h1 className="dc-page-title">{view === 'recent' ? '最近三天新增' : group || '全部设计卡片'}</h1><p>{view === 'recent' ? '今天与前两天加入的卡片，按新增日期排列。' : group ? GROUP_DESC[group] : ALL_DESC(cards.length)}</p></div>
          <div className="tr"><span className="count"><strong className="num">{total}</strong> 张卡片</span><span className="vsep" />
          <button type="button" className="arrow" aria-label="向左浏览" disabled={atStart || !total} onClick={() => select(index - 1)}>←</button>
          <button type="button" className="arrow" aria-label="向右浏览" disabled={atEnd || !total} onClick={() => select(index + 1)}>→</button></div>
        </div>
      <div className={`dc-stage dc-deck-stage${flipped ? ' reading' : ''}`}>
        {total ? <div className="dc-deck" ref={track} tabIndex={0} onKeyDown={onKey} aria-label="设计卡片列表，左右方向键切换">
          <BounceCards
            images={visible.map(card => ({ ...card, alt: card.title, style: cardTheme(card, group) }))}
            transformStyles={visible.map((card, i) => `rotate(${[7, -4, 3, -7, 2][(start + i) % 5]}deg) translate(${(start + i - deckPosition) * spacing}px)`)}
            containerWidth={1160} containerHeight={flipped ? 720 : 580} cardSize={400} spread={85} rotation={10} arc={0}
            pushDistance={80} hoverScale={1.06} bounciness={0.25} animationDelay={0.1} animationStagger={0.06}
            borderWidth={1} borderColor="#708b9c" radius={20} shadow
            expandedIndex={flipped ? visible.findIndex(c => c.slug === flipped) : -1}
            onCardClick={i => { const next = start + i; setFlipped(shown[next].slug); }}
            renderCard={(card, i) => {
              const n = start + i;
              return <div className={`dc-bounce-content${flipped === card.slug ? ' showing-back' : ''}`}>
                <div className="dc-bounce-front" inert={flipped === card.slug ? '' : undefined} aria-hidden={flipped === card.slug}>
                  <Front card={card} index={n} total={total} group={group} />
                </div>
                {flipped === card.slug && <Back card={card} index={n} total={total} onUnflip={() => setFlipped(null)} />}
              </div>;
            }} />
        </div> : <p className="dc-empty">{view === 'recent' && !recent.length ? '最近三天暂无新增卡片。' : '没有符合条件的卡片。'}{anyTag ? <button type="button" className="dc-clear" onClick={() => setTags(EMPTY_TAGS)}>清除筛选</button> : <a href="#cards/today">看看今日推荐 ↗</a>}</p>}
      </div>
      {total > 0 && <><div className="dc-slider-row">
        <span className="dc-slider-label">拖动浏览</span>
        <input className="dc-position-slider" type="range" aria-label="卡片浏览位置"
          min={minPosition} max={maxPosition} step="0.01" value={deckPosition}
          disabled={maxPosition <= minPosition || !total}
          aria-valuetext={total ? `第 ${index + 1} 张，共 ${total} 张` : '没有卡片'}
          style={{ '--slider-progress': `${maxPosition > minPosition ? (deckPosition - minPosition) / (maxPosition - minPosition) * 100 : 0}%` }}
          onPointerDown={e => { e.currentTarget.dataset.pointerFocus = "true"; }}
          onBlur={e => { delete e.currentTarget.dataset.pointerFocus; }}
          onChange={e => { setPosition(Number(e.target.value)); setFlipped(null); }}
          onKeyDown={e => {
            delete e.currentTarget.dataset.pointerFocus;
            const next = { ArrowRight: index + 1, ArrowUp: index + 1, ArrowLeft: index - 1, ArrowDown: index - 1, Home: minPosition, End: maxPosition, PageUp: index + 5, PageDown: index - 5 }[e.key];
            if (next !== undefined) { e.preventDefault(); select(next); }
          }} />
      </div>
      <div className="dc-prog"><span className="pos num" aria-live="polite">{total ? `${pad((readingIndex >= 0 ? readingIndex : index) + 1)} / ${total}` : '00 / 00'}</span>
        <span className="dc-deck-caption">DESIGN FIELDNOTES</span>
        <span className="keys">滚轮 / <kbd>←</kbd><kbd>→</kbd> 切换 · 悬停展开 · 点击阅读 · <kbd>Esc</kbd> 收起</span></div></>}
      </section>}
    </main></div>;
}
