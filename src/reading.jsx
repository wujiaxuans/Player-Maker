import { useEffect, useRef } from 'react';

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
    {item ? <><div className="reading-meta"><span>{item.type}</span><span>{item.tags.join(' / ')}</span><span>示例笔记</span></div><p className="reading-lead">{item.desc}</p><img className="reading-cover" src={`/media/${item.image}.jpg`} alt="" /><div className="reading-body">{item.body.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div><aside className="reading-note">当前为示例内容，后续可替换为完整的设计案例与图文分析。</aside></> : <p>链接可能已变更，你可以返回设计档案查看其他笔记。</p>}
    <div className="reading-footer"><a href={returnHref}>← 返回文章列表</a><a href="#archive">浏览全部归档 ↗</a></div></main></div>;
}

