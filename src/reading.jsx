import { useEffect, useRef } from 'react';
import ArticleCover from './ArticleCover.jsx';

function Inline({ text }) {
  const parts = String(text).split(/(\[[^\]]+\]\([^)\s]+\))/g);
  return parts.map((part, i) => {
    const m = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    return m ? <a key={i} className="reading-link" href={m[2]} {...(m[2].startsWith('#') ? {} : { target: '_blank', rel: 'noopener noreferrer' })}>{m[1]}</a> : part;
  });
}

function ListItem({ item }) {
  if (typeof item === 'string') return <li><Inline text={item} /></li>;
  return <li><strong>{item.t}</strong>：<Inline text={item.d} /></li>;
}

export function BodyBlock({ block }) {
  if (typeof block === 'string') return <p><Inline text={block} /></p>;
  if (block.ol || block.ul) { const Tag = block.ol ? 'ol' : 'ul'; return <Tag className="reading-list">{(block.ol || block.ul).map((item, i) => <ListItem key={i} item={item} />)}</Tag>; }
  if (block.h3) return <h3 className="reading-subhead3">{block.h3}</h3>;
  if (block.h4) return <h4 className="reading-label">{block.h4}</h4>;
  if (block.h) return <h2 className="reading-subhead">{block.h}</h2>;
  if (block.table) { const { head, align, rows } = block.table; return <div className="reading-table" tabIndex={0}><table><thead><tr>{head.map((cell, i) => <th key={i} style={{ textAlign: align[i] || undefined }}><Inline text={cell} /></th>)}</tr></thead><tbody>{rows.map((row, r) => <tr key={r}>{row.map((cell, i) => <td key={i} style={{ textAlign: align[i] || undefined }}><Inline text={cell} /></td>)}</tr>)}</tbody></table></div>; }
  if (block.img) return <figure className="reading-figure"><img src={block.img} alt={block.alt || ''} loading="lazy" />{block.caption && <figcaption>{block.caption}</figcaption>}</figure>;
  return null;
}

export function ArticlePage({ item, returnHref = '#work' }) {
  const title = useRef(null);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    title.current?.focus({ preventScroll: true });
    const previous = document.title;
    document.title = `${item?.title || '文章未找到'} — PLAYER / MAKER`;
    return () => { document.title = previous; };
  }, [item]);
  return <div className="reading-page"><header className="reading-nav container"><a className="wordmark" href="#home">P<span>/</span>M.</a><a href={returnHref}>← 返回文章列表</a></header>
    <main className="reading-main"><div className="reading-breadcrumb"><a href={returnHref}>文章</a><span>/</span><span>{item?.category || '文章'}</span></div><h1 tabIndex={-1} ref={title}>{item?.title || '没有找到这篇文章'}</h1>
    {item ? <><div className="reading-meta"><span>{item.type}</span><span>{item.tags.join(' / ')}</span></div><p className="reading-lead">{item.desc}</p>{item.cover ? <img className="reading-cover" src={item.cover} alt="" /> : <ArticleCover item={item} className="reading-cover" />}<div className="reading-body">{item.body.map((block, index) => <BodyBlock key={index} block={block} />)}</div></> : <p>链接可能已变更，你可以返回设计档案查看其他笔记。</p>}
    <div className="reading-footer"><a href={returnHref}>← 返回文章列表</a><a href="#archive">浏览全部归档 ↗</a></div></main></div>;
}

