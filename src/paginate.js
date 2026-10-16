export const PAGE_SIZE = 6;
export function pageCount(total, size = PAGE_SIZE) { return Math.max(1, Math.ceil(total / size)); }
export function paginate(items, page, size = PAGE_SIZE) {
  const pages = pageCount(items.length, size);
  const current = Math.min(Math.max(1, page), pages);
  return { page: current, pages, items: items.slice((current - 1) * size, current * size) };
}
