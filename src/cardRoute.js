import { GROUPS } from './cardFilter.js';

// '#cards' → all; '#cards/<group>' → group; '#card/<slug>' → deep link to one card. Otherwise null.
export function parseCardsRoute(hash) {
  const h = String(hash || '');
  if (h === '#cards' || h === '#cards/') return { group: null, focus: null };
  if (h.startsWith('#cards/')) {
    const group = safeDecode(h.slice(7));
    return { group: GROUPS.includes(group) ? group : null, focus: null };
  }
  if (h.startsWith('#card/')) return { group: null, focus: safeDecode(h.slice(6)) };
  return null;
}
export const cardsHref = group => group ? `#cards/${encodeURIComponent(group)}` : '#cards';
export const cardHref = slug => `#card/${encodeURIComponent(slug)}`;
function safeDecode(s) { try { return decodeURIComponent(s); } catch { return s; } }

// Decide how a wheel event over the horizontal track should be handled.
// inner: the scrollable back face under the pointer (or null) as {scrollTop, scrollHeight, clientHeight}.
// track: {scrollLeft, scrollWidth, clientWidth}. Returns 'inner' (let the card back scroll),
// 'track' (convert to horizontal scroll) or 'page' (do nothing, let the page scroll).
export function wheelTarget({ deltaX, deltaY }, track, inner) {
  if (Math.abs(deltaX) >= Math.abs(deltaY)) return 'page';
  if (inner && inner.scrollHeight > inner.clientHeight + 1) {
    const atTop = inner.scrollTop <= 0, atBottom = inner.scrollTop + inner.clientHeight >= inner.scrollHeight - 1;
    if ((deltaY < 0 && !atTop) || (deltaY > 0 && !atBottom)) return 'inner';
  }
  const max = track.scrollWidth - track.clientWidth;
  if (max <= 1) return 'page';
  if ((deltaY < 0 && track.scrollLeft <= 0) || (deltaY > 0 && track.scrollLeft >= max - 1)) return 'page';
  return 'track';
}

// Bounce-style neighbour push: hovered card scales up, others shift away from it.
export function bounceOffset(index, hovered, push = 28) {
  if (hovered < 0 || index === hovered) return 0;
  return Math.sign(index - hovered) * push;
}
