import { categories as baseCategories } from './data';
import { postFromMarkdown } from './markdown';

// Published markdown posts: content/posts/<categoryId>/<slug>.md
const files = import.meta.glob('../content/posts/*/*.md', { query: '?raw', import: 'default', eager: true });

export const categories = baseCategories.map(category => {
  const items = Object.entries(files)
    .filter(([path]) => path.split('/').at(-2) === category.id)
    .map(([path, text]) => postFromMarkdown(text, path.split('/').at(-1).replace(/\.md$/, '')))
    .sort((a, b) => {
      const ao = a.order || 0, bo = b.order || 0;
      if (ao && bo && ao !== bo) return ao - bo;
      if (ao && !bo) return -1;
      if (!ao && bo) return 1;
      return String(b.date).localeCompare(String(a.date)) || String(a.slug).localeCompare(String(b.slug));
    });
  return { ...category, items };
});
