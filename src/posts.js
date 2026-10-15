import { categories as baseCategories } from './data';
import { postFromMarkdown } from './markdown';
import { comparePosts } from './sort';

// Published markdown posts: content/posts/<categoryId>/<slug>.md
const files = import.meta.glob('../content/posts/*/*.md', { query: '?raw', import: 'default', eager: true });

export const categories = baseCategories.map(category => {
  const items = Object.entries(files)
    .filter(([path]) => path.split('/').at(-2) === category.id)
    .map(([path, text]) => postFromMarkdown(text, path.split('/').at(-1).replace(/\.md$/, '')))
    .sort(comparePosts);
  return { ...category, items };
});
