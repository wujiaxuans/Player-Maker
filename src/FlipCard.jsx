/* Adapted from React Bits Flip Card (https://reactbits.dev/micro/flip-card) and Bounce Cards hover
   (https://reactbits.dev/components/bounce-cards), github.com/DavidHDev/react-bits. Copyright (c) 2026 David Haz.
   MIT + Commons Clause License Condition v1.0: may be used as part of this website; the components themselves
   may not be sold, sublicensed or redistributed. Provided "AS IS", without warranty.
   Local changes: the original uses motion/react springs and drag-to-flip; this version flips with a CSS
   transition (no extra dependency), flips on click / Enter / Space, and takes scale + offset from the parent
   so neighbouring cards can shift aside like Bounce Cards. */
import './FlipCard.css';

export default function FlipCard({ front, back, flipped, onFlip, scale = 1, offset = 0, label, onHover, id }) {
  const onClick = e => { if (e.target.closest('a')) return; onFlip(); };
  const onKeyDown = e => {
    if (e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault(); if (!e.repeat) onFlip();
  };
  return <div id={id} className="flip-card" role="button" tabIndex={0} aria-pressed={flipped} aria-label={label}
    data-flipped={flipped ? '' : undefined} onClick={onClick} onKeyDown={onKeyDown}
    onPointerEnter={e => e.pointerType !== 'touch' && onHover?.(true)} onPointerLeave={() => onHover?.(false)}
    onFocus={() => onHover?.(true)} onBlur={() => onHover?.(false)}
    style={{ transform: `translateX(${offset}px) scale(${scale})`, zIndex: scale > 1 ? 2 : 1 }}>
    <div className="flip-card__rotor">
      <div className="flip-card__face flip-card__face--front" aria-hidden={flipped} inert={flipped ? '' : undefined}>{front}</div>
      <div className="flip-card__face flip-card__face--back" aria-hidden={!flipped} inert={!flipped ? '' : undefined}>{back}</div>
    </div>
  </div>;
}
