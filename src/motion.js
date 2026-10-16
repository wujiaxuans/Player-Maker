import { useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
const conditions = { desktop: '(min-width: 701px)', mobile: '(max-width: 700px)', reduce: '(prefers-reduced-motion: reduce)' };
const played = new Set();

// Defer setup until React has finished its development setup/cleanup rehearsal.
// Cancel an unstarted setup instead of consuming the visit's entrance animation.
function mountMotion(scope, setup) {
  const mm = gsap.matchMedia();
  const frame = requestAnimationFrame(() => {
    mm.add(conditions, setup, scope);
    ScrollTrigger.refresh();
  });
  return () => { cancelAnimationFrame(frame); mm.revert(); };
}

// Component-scoped contexts clean up animations and triggers on navigation.
export function useOpening(scope, active) {
  useLayoutEffect(() => {
    return mountMotion(scope, ({ conditions: { reduce, desktop } }) => {
      if (reduce || !active || played.has('opening')) return;
      const root = scope.current;
      const q = gsap.utils.selector(root);
      const timeline = gsap.timeline({ defaults: { ease: 'power4.inOut' }, onStart: () => played.add('opening') });
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
      return () => root.removeEventListener('focusin', finish);
    });
  }, [scope, active]);
}

export function useSectionMotion(scope, variant, active) {
  useLayoutEffect(() => {
    return mountMotion(scope, ({ conditions: { reduce, desktop } }) => {
      if (reduce) return;
      const root = scope.current;
      const q = gsap.utils.selector(root);
      const key = root.id === 'contact' ? 'footer' : root.id === 'card-entry' ? 'cards-entry' : 'articles';
      if (played.has(key)) return;
      const timeline = gsap.timeline({
        defaults: { ease: 'power4.out' },
        onStart: () => played.add(key),
        scrollTrigger: { trigger: root, start: 'top 78%', once: true }
      });
      timeline.from(q('.section-display span'), {
        yPercent: 115, xPercent: -12, scaleX: .7, rotation: 4,
        transformOrigin: 'left bottom', duration: 1.65, stagger: .12,
        clearProps: 'transform'
      }, 0)
        .from(q('.section-rule'), {
          scaleX: 0, transformOrigin: 'left', duration: 1.4, clearProps: 'transform'
        }, .55);
      if (key === 'footer') {
        timeline.from(q('.footer-main'), {
          y: 45, clipPath: 'inset(100% 0 0 0)', duration: 1.15,
          clearProps: 'transform,clipPath'
        }, .9)
          .from(q('.footer-bottom'), {
            y: 30, clipPath: 'inset(100% 0 0 0)', duration: .9,
            clearProps: 'transform,clipPath'
          }, 1.1);
      } else if (key === 'cards-entry') {
        timeline.from(q('.dc-heading'), {
          y: 36, clipPath: 'inset(100% 0 0 0)', duration: 1.1,
          clearProps: 'transform,clipPath'
        }, .65)
          .from(q('.dc-discovery'), { y: 55, clipPath: 'inset(0 0 100% 0)', duration: 1.5, clearProps: 'transform,clipPath' }, .85)
          // A single ordered stagger keeps the lower rows behind the first row.
          .from(q('.dc-tile'), {
            y: 90, scaleY: .86, clipPath: 'inset(0 0 100% 0)',
            transformOrigin: 'center bottom', duration: 1.4, stagger: .09,
            clearProps: 'transform,transformOrigin,clipPath'
          }, .9)
          .from(q('.dc-symbol'), {
            scale: .65, rotation: -24, transformOrigin: 'center',
            duration: 1.5, stagger: .09, clearProps: 'transform,transformOrigin'
          }, 1.05)
          .from(q('.dc-home-foot'), {
            y: 25, clipPath: 'inset(100% 0 0 0)', duration: 1,
            clearProps: 'transform,clipPath'
          }, 1.8);
      } else {
        timeline.from(q('.work-heading'), {
          y: 40, clipPath: 'inset(100% 0 0 0)', duration: 1.05,
          clearProps: 'transform,clipPath'
        }, .8)
          .from(q('.filter-bar'), {
            y: 28, clipPath: 'inset(100% 0 0 0)', duration: .9,
            clearProps: 'transform,clipPath'
          }, 1);

        // One timeline owns every card: later rows can never overtake the first.
        const cards = q('.project-card, .archive-item');
        const images = q('.card-image-reveal');
        const covers = q('.image-curtain');
        timeline.from(cards, {
          y: desktop ? 115 : 65, clipPath: 'inset(0 0 100% 0)',
          duration: 1.55, stagger: .16, clearProps: 'transform,clipPath'
        }, 1.15);
        if (images.length) timeline
          .fromTo(covers, { scaleY: 1 }, {
            scaleY: 0, duration: 1.35, stagger: .16, ease: 'power4.inOut'
          }, 1.3)
          .from(images, {
            scale: 1.18, duration: 1.9, stagger: .16, clearProps: 'transform'
          }, 1.3);
      }
      const finish = () => {
        played.add(key);
        timeline.progress(1);
      };
      root.addEventListener('focusin', finish);
      return () => root.removeEventListener('focusin', finish);
    });
  }, [scope, variant, active]);
}
