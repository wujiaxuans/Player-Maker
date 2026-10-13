import { useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
const conditions = { desktop: '(min-width: 701px)', mobile: '(max-width: 700px)', reduce: '(prefers-reduced-motion: reduce)' };
let openingHasPlayed = false;

// Component-scoped contexts clean up animations and triggers on navigation.
export function useOpening(scope, active) {
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add(conditions, ({ conditions: { reduce, desktop } }) => {
      if (reduce || !active || openingHasPlayed) return;
      const openingInitialized = requestAnimationFrame(() => { openingHasPlayed = true; });
      const root = scope.current;
      const q = gsap.utils.selector(root);
      const timeline = gsap.timeline({ defaults: { ease: 'power4.inOut' } });
      timeline.set(q('.opening'), { visibility: 'visible' })
        .fromTo(q('.opening-rule'), { scaleX: 0 }, { scaleX: 1, duration: 1.05 }, 0)
        .fromTo(q('.opening-label span'), { yPercent: 110 }, { yPercent: 0, duration: .9, stagger: .08 }, .08)
        .to(q('.opening-label span'), { yPercent: -115, duration: .65, stagger: .05 }, .92)
        .to(q('.opening-rule'), { scaleX: 0, transformOrigin: 'right center', duration: .6 }, 1)
        .fromTo(q('.opening-panel'), { scaleY: 1 }, { scaleY: 0, stagger: .12, duration: 1.65 }, 1.05)
        .fromTo(q('.hero-media'), { scale: 1.2 }, { scale: 1, duration: 2.5, ease: 'power3.out' }, 1.1)
        .fromTo(q('.hero-word'), { yPercent: 120, scaleX: .74, scaleY: 1.3, rotation: 5 }, { yPercent: 0, scaleX: 1, scaleY: 1, rotation: 0, duration: 1.75, stagger: .2, ease: 'power4.out', clearProps: 'transform' }, 1.58)
        .fromTo(q('.hero-kicker, .hero-description, .hero-margin-note'), { clipPath: 'inset(100% 0 0 0)', y: 25 }, { clipPath: 'inset(0% 0 0 0)', y: 0, stagger: .15, duration: 1.15, clearProps: 'clipPath,transform' }, 2.18)
        .set(q('.opening'), { visibility: 'hidden' }, 3.25);
      const finish = () => timeline.progress(1);
      root.addEventListener('focusin', finish);
      if (desktop) gsap.to(q('.hero-poster'), { yPercent: 9, ease: 'none', scrollTrigger: { trigger: root, start: 'top top', end: 'bottom top', scrub: 1.4 } });
      return () => { cancelAnimationFrame(openingInitialized); root.removeEventListener('focusin', finish); };
    }, scope);
    return () => mm.revert();
  }, [scope, active]);
}

export function useSectionMotion(scope, variant) {
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add(conditions, ({ conditions: { reduce } }) => {
      if (reduce) return;
      const root = scope.current;
      const q = gsap.utils.selector(root);
      const key = root.id === 'contact' ? 'footer' : 'articles';
      if (animatedSections.has(key)) return;
      const timeline = gsap.timeline({ defaults: { ease: 'power4.out' }, scrollTrigger: {
        trigger: root, start: 'top 88%', once: true,
        onEnter: () => animatedSections.add(key)
      } });
      timeline.from(q('.section-display span'), { yPercent: 115, xPercent: -12, scaleX: .7, rotation: 4, transformOrigin: 'left bottom', duration: 1.65, stagger: .12, clearProps: 'transform' })
        .from(q('.section-rule'), { scaleX: 0, transformOrigin: 'left', duration: 1.4, clearProps: 'transform' }, '+=.08');
      if (key === 'footer') {
        timeline.from(q('.footer-main'), { y: 45, clipPath: 'inset(100% 0 0 0)', duration: 1.15, clearProps: 'transform,clipPath' }, '+=.12')
          .from(q('.footer-bottom'), { y: 30, clipPath: 'inset(100% 0 0 0)', duration: .9, clearProps: 'transform,clipPath' }, '+=.1');
      } else {
        timeline.from(q('.work-heading h2'), { y: 40, clipPath: 'inset(100% 0 0 0)', duration: 1.05, clearProps: 'transform,clipPath' }, '+=.12')
          .from(q('.work-heading > p'), { y: 35, clipPath: 'inset(100% 0 0 0)', duration: 1.05, clearProps: 'transform,clipPath' }, '+=.1')
          .from(q('.filter-bar'), { y: 28, clipPath: 'inset(100% 0 0 0)', duration: .9, clearProps: 'transform,clipPath' }, '+=.1');
      }
      const finish = () => timeline.progress(1);
      root.addEventListener('focusin', finish);
      return () => root.removeEventListener('focusin', finish);
    }, scope);
    return () => mm.revert();
  }, [scope, variant]);
}
export function useCardsMotion(scope, active, archiveView) {
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add(conditions, ({ conditions: { reduce, desktop } }) => {
      if (reduce) return;
      const root = scope.current;
      const cards = Array.from(root.querySelectorAll('.project-card, .archive-item'));
      if (articleCardsHaveEntered) return;
      const cardsInitialized = requestAnimationFrame(() => { articleCardsHaveEntered = true; });
      const listeners = [];
      const columns = desktop && !archiveView ? 2 : 1;
      for (let i = 0; i < cards.length; i += columns) {
        const row = cards.slice(i, i + columns);
        const images = row.map(card => card.querySelector('.card-image-reveal')).filter(Boolean);
        const covers = row.map(card => card.querySelector('.image-curtain')).filter(Boolean);
        const timeline = gsap.timeline({ scrollTrigger: { trigger: row[0], start: 'top 96%', once: true, onEnter: () => { articleCardsHaveEntered = true; } }, defaults: { ease: 'power4.out' }, delay: i === 0 ? ((!location.hash || location.hash === '#home') && window.scrollY < 10 ? 2.9 : .7) : 0 });
        timeline.from(row, { y: desktop ? 115 : 65, clipPath: 'inset(0 0 100% 0)', duration: 1.55, stagger: .22, clearProps: 'transform,clipPath' });
        if (images.length) timeline.fromTo(covers, { scaleY: 1 }, { scaleY: 0, duration: 1.35, stagger: .22, ease: 'power4.inOut' }, .15)
          .from(images, { scale: 1.18, duration: 1.9, stagger: .22, clearProps: 'transform' }, .15);
        row.forEach(card => {
          const finish = () => timeline.progress(1);
          card.addEventListener('focusin', finish);
          listeners.push(() => card.removeEventListener('focusin', finish));
        });
      }
      if (desktop && !archiveView) cards.forEach(card => gsap.fromTo(card.querySelector('img'), { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: 1.2 } }));
      return () => { cancelAnimationFrame(cardsInitialized); listeners.forEach(remove => remove()); };
    }, scope);
    const refresh = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => { cancelAnimationFrame(refresh); mm.revert(); };
  }, [scope, active, archiveView]);
}



const animatedSections = new Set();
let articleCardsHaveEntered = false;


