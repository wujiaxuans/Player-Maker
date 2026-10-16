// React Bits BounceCards, supplied by the user. Adapted to render text cards and centered details.
'use client';

import { useEffect, useRef } from 'react';

import './BounceCards.css';

const PATTERN = [1, 0.5, -0.3, -1, 0.2, 0.75, -0.6, 0.35, -0.85, 0.1];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const parseTransform = value => {
  if (typeof value !== 'string') return null;
  const rotate = value.match(/rotate\(\s*(-?[\d.]+)deg\s*\)/);
  const translate = value.match(/translate\(\s*(-?[\d.]+)px(?:\s*,\s*(-?[\d.]+)px)?\s*\)/);
  return {
    x: translate ? Number(translate[1]) : 0,
    y: translate && translate[2] ? Number(translate[2]) : 0,
    rotate: rotate ? Number(rotate[1]) : 0
  };
};

const toCard = item => (typeof item === 'string' ? { src: item, alt: '' } : { ...item, src: item?.src, alt: item?.alt ?? '' });

export default function BounceCards({
  images = [],
  renderCard,
  expandedIndex = -1,
  className = '',
  style,
  containerWidth = 400,
  containerHeight = 400,
  cardSize = 200,
  spread = 85,
  rotation = 10,
  arc = 0,
  animationDelay = 0.5,
  animationStagger = 0.06,
  bounciness = 0.6,
  enableHover = true,
  pushDistance = 160,
  hoverScale = 1.06,
  borderWidth = 5,
  borderColor = '#ffffff',
  radius = 25,
  shadow = true,
  transformStyles,
  onCardClick
}) {
  const rootRef = useRef(null);
  const cardRefs = useRef([]);
  const wakeRef = useRef(null);
  const cards = images.map(toCard);
  const count = cards.length;
  const middle = (count - 1) / 2;
  const reach = Math.max(1, middle);
  const slots = cards.map((_, i) => {
    const custom = transformStyles ? parseTransform(transformStyles[i]) : null;
    if (custom) return custom;
    const offset = i - middle;
    return {
      x: offset * spread,
      y: arc * (offset / reach) ** 2,
      rotate: rotation * PATTERN[i % PATTERN.length]
    };
  });
  const settings = {
    slots,
    keys: cards.map((card, i) => card.slug || i),
    expandedIndex,
    cardSize: Math.max(10, cardSize),
    delay: Math.max(0, animationDelay),
    stagger: Math.max(0, animationStagger),
    bounciness: clamp(bounciness, 0, 1),
    enableHover,
    pushDistance,
    hoverScale: clamp(hoverScale, 0.5, 2),
    clickable: typeof onCardClick === 'function'
  };
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const clickRef = useRef(onCardClick);
  clickRef.current = onCardClick;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const bodies = new Map();
    let initial = true;
    let down = null;
    let dragged = false;
    const state = { hovered: -1, time: 0, layer: -1 };
    let raf = 0;
    let last = performance.now();
    let alive = true;

    const body = i => {
      const key = settingsRef.current.keys[i];
      if (!bodies.has(key)) {
        const slot = settingsRef.current.slots[i] ?? { x: 0, y: 0, rotate: 0 };
        bodies.set(key, {
          x: slot.x,
          y: slot.y,
          rotate: slot.rotate,
          scale: reduce || !initial ? 1 : 0,
          vx: 0,
          vy: 0,
          vr: 0,
          vs: 0,
          born: initial ? state.time : -100,
          ready: !initial
        });
      }
      return bodies.get(key);
    };

    const step = (value, velocity, target, stiffness, damping, dt) => {
      const next = velocity + ((target - value) * stiffness - velocity * damping) * dt;
      return [value + next * dt, next];
    };

    const frame = now => {
      raf = 0;
      if (!alive) return;
      const s = settingsRef.current;
      const layout = s.keys.join('|') + ':' + s.slots.map(slot => slot.x).join(',') + ':' + s.expandedIndex;
      if (state.layout !== undefined && state.layout !== layout) state.hovered = -1;
      state.layout = layout;
      const dt = Math.min(1 / 30, Math.max(1 / 240, (now - last) / 1000));
      last = now;
      state.time += dt;

      const hovered = s.enableHover && s.expandedIndex < 0 && state.hovered < s.slots.length ? state.hovered : -1;
      const center = s.slots.reduce((best, slot, i) => Math.abs(slot.x) < Math.abs(s.slots[best].x) ? i : best, 0);
      const active = s.expandedIndex >= 0 ? s.expandedIndex : hovered >= 0 ? hovered : center;
      const popStiffness = 170;
      const popDamping = 2 * (1 - 0.85 * s.bounciness) * Math.sqrt(popStiffness);
      const moveStiffness = 210;
      const moveDamping = 2 * (reduce ? 1 : 0.72) * Math.sqrt(moveStiffness);
      const substeps = Math.ceil(dt / (1 / 240));
      const h = dt / substeps;
      let moving = 0;

      for (let i = 0; i < s.slots.length; i++) {
        const el = cardRefs.current[i];
        if (!el) continue;
        const card = body(i);
        const slot = s.slots[i];
        const appeared = reduce || state.time - card.born >= s.delay + Math.min(i, 4) * s.stagger;
        let targetX = slot.x;
        let targetY = slot.y;
        let targetRotate = slot.rotate;
        let targetScale = appeared ? 1 - Math.min(Math.abs(i - active), 3) * .045 : 0;
        if (hovered >= 0 && appeared) {
          if (i === hovered) {
            targetY = slot.y - s.cardSize * 0.04;
            targetRotate = 0;
            targetScale = s.hoverScale;
          } else {
            targetX = slot.x + Math.sign(i - hovered) * s.pushDistance;
          }
        }
        if (s.expandedIndex >= 0) {
          targetX = i === s.expandedIndex ? 0 : slot.x + Math.sign(i - s.expandedIndex) * 240;
          targetY = 0;
          targetRotate = i === s.expandedIndex ? 0 : slot.rotate;
          targetScale = i === s.expandedIndex ? 1 : .9;
        }
        for (let k = 0; k < substeps; k++) {
          [card.x, card.vx] = step(card.x, card.vx, targetX, moveStiffness, moveDamping, h);
          [card.y, card.vy] = step(card.y, card.vy, targetY, moveStiffness, moveDamping, h);
          [card.rotate, card.vr] = step(card.rotate, card.vr, targetRotate, moveStiffness, moveDamping, h);
          if (reduce) {
            card.scale = targetScale;
            card.vs = 0;
          } else {
            [card.scale, card.vs] = step(card.scale, card.vs, targetScale, popStiffness, popDamping, h);
          }
        }
        moving +=
          Math.abs(card.vx) +
          Math.abs(card.vy) +
          Math.abs(card.vr) +
          Math.abs(card.vs) * 100 +
          Math.abs(targetX - card.x) +
          Math.abs(targetY - card.y) +
          Math.abs(targetRotate - card.rotate) +
          Math.abs(targetScale - card.scale) * 100 +
          (appeared ? 0 : 1);
        el.style.transform = `translate(-50%, -50%) translate3d(${card.x.toFixed(2)}px, ${card.y.toFixed(2)}px, 0) rotate(${card.rotate.toFixed(3)}deg) scale(${Math.max(0, card.scale).toFixed(4)})`;
      }

      const topLayer = active;
      {
        state.layer = topLayer;
        cardRefs.current.forEach((el, i) => {
          if (!el) return;
          el.style.zIndex = i === topLayer ? String(s.slots.length + 1) : String(s.slots.length - Math.abs(i - topLayer));
          el.toggleAttribute('data-active', i === topLayer);
          el.dataset.distance = String(Math.min(3, Math.abs(i - topLayer)));
        });
      }

      initial = false;
      for (const key of bodies.keys()) if (!s.keys.includes(key)) bodies.delete(key);
      if (moving > 0.02) raf = requestAnimationFrame(frame);
    };

    const wake = () => {
      if (raf || !alive) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    wakeRef.current = wake;

    const pick = event => {
      const s = settingsRef.current;
      const rect = root.getBoundingClientRect();
      const px = event.clientX - rect.left - rect.width / 2;
      const py = event.clientY - rect.top - rect.height / 2;
      let best = -1;
      let distance = Infinity;
      s.slots.forEach((slot, i) => {
        const gap = Math.abs(px - slot.x);
        if (gap < distance) {
          distance = gap;
          best = i;
        }
      });
      if (best < 0) return -1;
      const slot = s.slots[best];
      const half = s.cardSize / 2;
      if (Math.abs(py - slot.y) > (cardRefs.current[best]?.offsetHeight || s.cardSize) / 2 + 12 || distance > half + 12) return -1;
      if (state.hovered >= 0 && state.hovered !== best) {
        const current = s.slots[state.hovered];
        if (current && Math.abs(px - current.x) - distance < 6) return state.hovered;
      }
      return best;
    };

    const onMove = event => {
      if (state.wheelPointer && Math.hypot(event.clientX - state.wheelPointer[0], event.clientY - state.wheelPointer[1]) < 4) return;
      state.wheelPointer = null;
      if (settingsRef.current.expandedIndex >= 0 || event.pointerType === 'touch') return;
      const next = pick(event);
      if (next !== state.hovered) {
        state.hovered = next;
        wake();
      }
    };
    const onLeave = () => {
      if (state.hovered !== -1) {
        state.hovered = -1;
        wake();
      }
    };
    const onClick = event => {
      if (dragged || settingsRef.current.expandedIndex >= 0 || event.target.closest('a,button,input')) return;
      const index = event.pointerType === 'touch' ? cardRefs.current.indexOf(event.target.closest('.bounce-cards__card')) : pick(event);
      if (index < 0) return;
      const card = bodies.get(settingsRef.current.keys[index]);
      if (card && !reduce) card.vs -= 2.2;
      wake();
      clickRef.current?.(index);
    };
    const onFocus = event => {
      if (settingsRef.current.expandedIndex >= 0) return;
      const index = cardRefs.current.indexOf(event.target);
      if (index >= 0) {
        state.hovered = index;
        wake();
      }
    };
    const onKey = event => {
      if (settingsRef.current.expandedIndex >= 0) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const index = cardRefs.current.indexOf(event.target);
      if (index < 0 || !settingsRef.current.clickable) return;
      event.preventDefault();
      const card = bodies.get(settingsRef.current.keys[index]);
      if (card && !reduce) card.vs -= 2.2;
      wake();
      clickRef.current?.(index);
    };

    const onDown = e => { down = [e.clientX, e.clientY]; dragged = false; };
    const onDrag = e => { if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 8) dragged = true; };
    const onWheel = event => { state.wheelPointer = [event.clientX, event.clientY]; state.hovered = -1; wake(); };
    root.addEventListener('wheel', onWheel, { passive: true });
    root.addEventListener('pointerdown', onDown);
    root.addEventListener('pointermove', onDrag);
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerdown', onMove);
    root.addEventListener('pointerleave', onLeave);
    root.addEventListener('click', onClick);
    root.addEventListener('focusin', onFocus);
    root.addEventListener('focusout', onLeave);
    root.addEventListener('keydown', onKey);
    wake();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      wakeRef.current = null;
      root.removeEventListener('wheel', onWheel);
      root.removeEventListener('pointerdown', onDown);
      root.removeEventListener('pointermove', onDrag);
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerdown', onMove);
      root.removeEventListener('pointerleave', onLeave);
      root.removeEventListener('click', onClick);
      root.removeEventListener('focusin', onFocus);
      root.removeEventListener('focusout', onLeave);
      root.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    wakeRef.current?.();
  });

  return (
    <div
      ref={rootRef}
      className={`bounce-cards${expandedIndex >= 0 ? ' has-expanded' : ''}${className ? ` ${className}` : ''}`}
      style={{
        width: containerWidth,
        height: containerHeight,
        '--bounce-cards-size': `${settings.cardSize}px`,
        '--bounce-cards-border': `${Math.max(0, borderWidth)}px`,
        '--bounce-cards-border-color': borderColor,
        '--bounce-cards-radius': `${Math.max(0, radius)}px`,
        '--bounce-cards-shadow': shadow
          ? '0 1px 2px rgba(0, 0, 0, 0.12), 0 10px 28px -6px rgba(0, 0, 0, 0.32)'
          : 'none',
        '--bounce-cards-shadow-active': shadow
          ? '0 2px 4px rgba(0, 0, 0, 0.14), 0 22px 44px -10px rgba(0, 0, 0, 0.42)'
          : 'none',
        ...style
      }}
    >
      {cards.map((card, i) => (
        <div
          key={card.slug || i}
          ref={el => {
            cardRefs.current[i] = el;
          }}
          className={`bounce-cards__card${expandedIndex === i ? ' is-expanded' : ''}${settings.clickable ? ' bounce-cards__card--clickable' : ''}`}
          style={{ zIndex: i + 1, ...card.style }}
          inert={expandedIndex >= 0 && expandedIndex !== i ? true : undefined}
          {...(settings.clickable ? { role: expandedIndex === i ? 'group' : 'button', tabIndex: expandedIndex >= 0 ? -1 : 0, 'aria-label': card.alt || `Card ${i + 1}` } : null)}
        >
          {renderCard ? renderCard(card, i) : card.src && <img src={card.src} alt={card.alt} draggable={false} />}
        </div>
      ))}
    </div>
  );
}