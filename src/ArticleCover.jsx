import CardArtwork from './CardArtwork.jsx';

// Generated cover shared by every article: category hue, seeded geometry and the English title.
export default function ArticleCover({ item, className = '' }) {
  return <div className={`article-cover ${className}`} style={{ '--category-color': item.categoryColor }} aria-hidden="true">
    <CardArtwork slug={item.id} />
    <span className="article-cover-title">{item.en || item.categoryEn}</span>
  </div>;
}
