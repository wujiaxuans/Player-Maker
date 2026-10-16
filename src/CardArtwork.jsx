import { memo } from 'react';
import { cardArtwork } from './artworkParams.js';

export default memo(function CardArtwork({ slug }) {
  const p = cardArtwork(slug);
  const lines = Array.from({ length: p.count }, (_, i) => i);
  const shapes = lines.map(i => {
    const gap = i * 10;
    switch (p.family) {
      case 0: return <ellipse key={i} cx={212 + p.offset} cy="98" rx={24 + gap} ry={(24 + gap) * .63} />;
      case 1: return <path key={i} d={`M ${65 + gap} 176 L ${65 + gap} ${118 - i * 3} L ${180 + gap} ${12 - i * 3} L ${270 + gap} 84`} />;
      case 2: return <path key={i} d={`M 125 175 Q ${140 + i * 15} ${90 - i * 11} ${225 + i * 14} 8`} />;
      case 3: return <rect key={i} x={95 + i * 7} y={10 + i * 7} width={185 - i * 10} height={150 - i * 9} rx="3" transform={`rotate(${p.offset + 8} 210 95)`} />;
      case 4: return <path key={i} d={`M 75 ${30 + gap} H ${165 + i * 6} V ${60 + gap} H ${220 + i * 6} V ${90 + gap} H 355`} />;
      default: return <path key={i} d={`M 55 ${165 - i * 7} C 140 ${145 - i * 12}, 170 ${-45 + i * 8}, 240 ${32 + i * 7} S 310 ${165 - i * 4}, 385 ${30 + i * 9}`} />;
    }
  });
  return <div className="dc-artwork" data-family={p.family} aria-hidden="true">
    <svg viewBox="0 0 400 190" fill="none" focusable="false">
      <g transform={`translate(200 95) rotate(${p.angle}) scale(${p.flip ? -1 : 1} ${p.stretch}) translate(-200 -95)`} stroke="currentColor" strokeWidth="1.35">{shapes}</g>
    </svg>
  </div>;
});
