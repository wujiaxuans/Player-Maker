import React, { useEffect, useRef, useState } from 'react';
import { sortPosts } from './sort';
import { createRoot } from 'react-dom/client';
import { categories } from './posts';
import { Header, Hero, Archive, Contact } from './components';
import { ArticlePage } from './reading';
import { DesignCardsEntry, CardsPage } from './DesignCards';
import { parseCardsRoute } from './cardRoute';
import './styles.css';

const articles = sortPosts(categories.flatMap(category => category.items.map((item, index) => ({ ...item, id: `${category.id}-${item.slug || index + 1}`, category: category.cn, categoryId: category.id }))));
function App() {
  const [active, setActive] = useState('all');
  const [hash, setHash] = useState(location.hash);
  const readingOrigin = useRef({ hash: '#work', scroll: null });
  useEffect(() => {
    const navigate = () => setHash(location.hash);
    window.addEventListener('hashchange', navigate);
    return () => window.removeEventListener('hashchange', navigate);
  }, []);
  const articleRoute = hash.startsWith('#article/');
  const cardsRoute = parseCardsRoute(hash);
  const cardRoute = Boolean(cardsRoute);
  const archiveView = hash === '#archive';
  const article = articles.find(item => `#article/${item.id}` === hash);
  useEffect(() => {
    if (articleRoute || cardRoute) return;
    const frame = requestAnimationFrame(() => {
      if (readingOrigin.current.scroll !== null && hash === readingOrigin.current.hash) {
        window.scrollTo({ top: readingOrigin.current.scroll, behavior: 'instant' });
        readingOrigin.current.scroll = null;
      } else document.getElementById(hash.slice(1) || 'home')?.scrollIntoView({ behavior: 'instant' });
    });
    return () => cancelAnimationFrame(frame);
  }, [hash, articleRoute, cardRoute]);
  if (cardsRoute) return <CardsPage key={cardsRoute.group || 'all'} group={cardsRoute.group} focus={cardsRoute.focus} />;
  if (articleRoute) return <ArticlePage item={article} returnHref={readingOrigin.current.hash} />;
  return <>
    <a className="skip-link" href={archiveView ? '#archive' : '#work'}>跳至文章内容</a>
    <Header archiveView={archiveView} onSelect={setActive} />
    <main>{!archiveView && <Hero openingActive={!hash || hash === '#home'} />}<Archive categories={categories} articles={articles} active={active} onSelect={setActive} archiveView={archiveView} onRead={() => { readingOrigin.current = { hash: archiveView ? '#archive' : '#work', scroll: window.scrollY }; }} />{!archiveView && <DesignCardsEntry />}</main>
    <Contact />
  </>;
}
createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);

