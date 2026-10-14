import { categories as baseCategories } from './data';
import { postFromMarkdown } from './markdown';

// Published markdown posts: content/posts/<categoryId>/<slug>.md
const files = import.meta.glob('../content/posts/*/*.md', { query: '?raw', import: 'default', eager: true });

export const categories = baseCategories.map(category => {
  const extra = Object.entries(files)
    .filter(([path]) => path.split('/').at(-2) === category.id)
    .map(([path, text]) => postFromMarkdown(text, path.split('/').at(-1).replace(/\.md$/, '')))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return extra.length ? { ...category, items: [...category.items, ...extra] } : category;
});
