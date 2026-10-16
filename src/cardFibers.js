// Versioned deterministic seed: stable across reloads, ordering and category filters.
export function cardFiberParams(slug) {
  let seed = 2166136261;
  for (const char of `fibers-v2:${slug}`) seed = Math.imul(seed ^ char.codePointAt(0), 16777619) >>> 0;
  const random = () => {
    seed += 0x6D2B79F5;
    let n = Math.imul(seed ^ seed >>> 15, seed | 1);
    n ^= n + Math.imul(n ^ n >>> 7, n | 61);
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
  const between = (a, b) => +(a + random() * (b - a)).toFixed(3);
  return {
    layers: 1,
    twist: between(.45, .8), waves: between(.35, .75),
    rotation: between(-32, 12), threads: 30 + Math.floor(random() * 13),
    spread: between(.85, 1.3), volume: between(.02, .12),
    scale: between(.85, 1.15), perspective: between(.2, .5),
    fiberStyle: 'lines', gradient: 'along'
  };
}
