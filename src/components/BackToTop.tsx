'use client';

import { useEffect, useRef, useState } from 'react';
import { LuArrowUp } from 'react-icons/lu';
import { useLanguage } from '@/components/LanguageProvider';
import { scrollBehavior } from '@/lib/scroll-utils';

/** Shown once the reader is this many viewport heights down the page. */
const SHOW_AFTER_SCREENS = 2;

/**
 * Floating "back to top" button, on every page. Scroll handling follows
 * ReadingProgressBar: a passive listener schedules at most one rAF per
 * frame, and React state changes only when the threshold is crossed.
 * Hidden, it is `invisible` too, so it leaves the tab order and the
 * accessibility tree.
 *
 * Keep `data-back-to-top`: the immersive-reading CSS hides the button by
 * that attribute (the window doesn't scroll while the reader is open).
 */
export default function BackToTop() {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const next = window.scrollY > window.innerHeight * SHOW_AFTER_SCREENS;
      if (next !== visibleRef.current) {
        visibleRef.current = next;
        setVisible(next);
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  const backToTop = () => {
    window.scrollTo({ top: 0, behavior: scrollBehavior() });
    // Keyboard and screen-reader users continue from the top too, not from
    // a button that just vanished. The temporary tabindex lets <main> take
    // focus without becoming a click target for the rest of the visit.
    const main = document.getElementById('main-content');
    if (!main) return;
    if (!main.hasAttribute('tabindex')) {
      main.setAttribute('tabindex', '-1');
      main.addEventListener('blur', () => main.removeAttribute('tabindex'), { once: true });
    }
    main.focus({ preventScroll: true });
  };

  return (
    <button
      type="button"
      data-back-to-top
      onClick={backToTop}
      aria-label={t('back_to_top')}
      title={t('back_to_top')}
      className={`fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-30 grid size-11 place-items-center rounded-full border border-line bg-background/90 text-muted shadow-md backdrop-blur transition-[opacity,visibility,color] duration-200 hover:text-accent print:hidden ${
        visible ? 'opacity-100' : 'pointer-events-none invisible opacity-0'
      }`}
    >
      <LuArrowUp aria-hidden="true" size={20} />
    </button>
  );
}
