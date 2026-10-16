// Stable geometry with distinct silhouettes, rather than variations of one ribbon.
export function cardArtwork(slug) {
  let seed = 2166136261;
  for (const char of `artwork-v3:${slug}`) seed = Math.imul(seed ^ char.codePointAt(0), 16777619) >>> 0;
  const family = seed % 6;
  const random = () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  return { family, flip: random() > .5, angle: Math.round(random() * 24 - 12),
    count: 9 + Math.floor(random() * 5), offset: Math.round(random() * 35),
    stretch: .8 + random() * .4 };
}
