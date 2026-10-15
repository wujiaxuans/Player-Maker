// Newest first by date; ties: newer `updated`, then lower `order`, then title.
export function comparePosts(a, b) {
  const byDate = String(b.date || '').localeCompare(String(a.date || ''));
  if (byDate) return byDate;
  const byUpdated = String(b.updated || '').localeCompare(String(a.updated || ''));
  if (byUpdated) return byUpdated;
  const ao = a.order || 0, bo = b.order || 0;
  if (ao !== bo) return ao - bo;
  return String(a.title || '').localeCompare(String(b.title || ''), 'zh');
}

export const sortPosts = posts => [...posts].sort(comparePosts);
