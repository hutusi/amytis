'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { parseSlideHash, slideId, slideIndexFromScroll } from '@/lib/slide-deck';
import { scrollBehavior } from '@/lib/scroll-utils';

export interface SlideDeckRuntimeProps {
  /** The deck's slide-id stem: slide n is `#${stem}-${n}`. */
  stem: string;
  count: number;
  /** The deck's accessible name: its title, or the generic "Slides". */
  label: string;
}

interface PresentedSlide {
  src: string;
  /** What the page loaded, if the full-size `src` fails. */
  fallback: string;
  alt: string;
}

/** Without `scrollend`, a scroll counts as settled after this much quiet. */
const SETTLE_FALLBACK_MS = 120;
/** A presenter swipe: at least this far, and more sideways than up/down. */
const SWIPE_MIN_PX = 40;
const ROUND_BUTTON = 'grid size-11 place-items-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70';
const PILL = 'rounded-full bg-black/50 px-2.5 py-1 text-xs text-white';

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points={direction === 'left' ? '15 18 9 12 15 6' : '9 18 15 12 9 6'} />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * The interactive layer of a slide deck, loaded on demand by
 * SlideDeckControls once a deck is on the page. SlideDeck's server-rendered
 * track stays the source of truth — the slide on screen is wherever the
 * track is scrolled — and this adds:
 *
 * - prev/next buttons, a "3 / 40" counter and a polite live region;
 * - keys on the focused deck: ←/→, Home/End, F for fullscreen;
 * - loading of the neighbouring slides once the deck is near the viewport
 *   (every slide is lazy; without this the next one starts loading only as
 *   it scrolls in), and of every slide before printing;
 * - `#<stem>-<n>` sync: a slide hash opens the deck at that slide, and once
 *   the reader flips, the address follows (replaceState, only when a scroll
 *   settles — Safari throttles frequent calls and Next syncs its router on
 *   each);
 * - a presenter: a modal <dialog> (the top layer works inside flow cards
 *   and above the immersive reader, and on iPhone, which has no element
 *   fullscreen) whose stage goes fullscreen where supported. A dialog
 *   itself can't be made fullscreen. Leaving fullscreen closes it, so one
 *   Escape exits both.
 */
export default function SlideDeckRuntime({ stem, count, label }: SlideDeckRuntimeProps) {
  const { t, tWith } = useLanguage();
  const rootRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // Rendered only after mount (SlideDeckControls), so the hash is readable.
  const [initialIndex] = useState(() => parseSlideHash(window.location.hash, stem, count) ?? 0);
  const [index, setIndex] = useState(initialIndex);
  const [presented, setPresented] = useState<PresentedSlide | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const indexRef = useRef(initialIndex);
  /** Where a programmatic scroll is heading; navigation continues from it. */
  const targetRef = useRef<number | null>(null);
  /** Hash writes and announcements wait for the reader's first move. */
  const interactedRef = useRef(false);
  const nearViewportRef = useRef(false);
  const presentingRef = useRef(false);
  /** Fullscreen was left with the toggle, not Escape: keep presenting. */
  const leavingFullscreenRef = useRef(false);
  const swipeRef = useRef<{ x: number; y: number } | null>(null);
  const swipedRef = useRef(false);

  const getTrack = useCallback(
    () => rootRef.current?.closest('[data-slide-deck]')?.querySelector<HTMLElement>('[data-slide-track]') ?? null,
    [],
  );
  const slideImage = useCallback(
    (i: number) => getTrack()?.children[i]?.querySelector('img') ?? null,
    [getTrack],
  );
  const slideSource = useCallback(
    (i: number): PresentedSlide | null => {
      const img = slideImage(i);
      // `src` is the largest variant the optimizer emitted (srcset picks a
      // smaller one for the page); `currentSrc` is what actually loaded.
      return img ? { src: img.src, fallback: img.currentSrc || img.src, alt: img.alt } : null;
    },
    [slideImage],
  );

  const warm = useCallback(
    (i: number) => {
      if (!nearViewportRef.current) return;
      for (const j of [i - 1, i, i + 1]) {
        const img = slideImage(j);
        if (img?.getAttribute('loading') === 'lazy') img.setAttribute('loading', 'eager');
      }
    },
    [slideImage],
  );

  const show = useCallback(
    (i: number) => {
      indexRef.current = i;
      setIndex(i);
      if (!presentingRef.current) return;
      setPresented(slideSource(i));
      for (const j of [i - 1, i + 1]) {
        const neighbour = slideImage(j);
        if (neighbour) new Image().src = neighbour.src;
      }
    },
    [slideImage, slideSource],
  );

  const settle = useCallback(() => {
    const track = getTrack();
    if (!track) return;
    const target = targetRef.current;
    targetRef.current = null;
    const i = track.clientWidth > 0
      ? slideIndexFromScroll(track.scrollLeft, track.clientWidth, count)
      : (target ?? indexRef.current);
    show(i);
    warm(i);
    if (!interactedRef.current) return;
    setAnnouncement(tWith('slide_position', { n: i + 1, total: count }));
    const id = slideId(stem, i + 1);
    if (safeDecode(window.location.hash.slice(1)) !== id) {
      window.history.replaceState(window.history.state, '', `#${id}`);
    }
  }, [count, getTrack, show, stem, tWith, warm]);

  const goTo = useCallback(
    (i: number, behavior: ScrollBehavior = scrollBehavior()) => {
      const track = getTrack();
      if (!track) return;
      const next = Math.max(0, Math.min(count - 1, i));
      interactedRef.current = true;
      targetRef.current = next;
      show(next);
      const left = next * track.clientWidth;
      if (Math.abs(track.scrollLeft - left) < 1) {
        // Already there: no scroll event will follow to settle it.
        settle();
        return;
      }
      track.scrollTo({ left, behavior });
    },
    [count, getTrack, settle, show],
  );

  const step = useCallback(
    (delta: number, behavior?: ScrollBehavior) => goTo((targetRef.current ?? indexRef.current) + delta, behavior),
    [goTo],
  );

  const enterFullscreen = useCallback(() => {
    const stage = stageRef.current;
    if (!stage || !document.fullscreenEnabled || !stage.requestFullscreen) return;
    stage.requestFullscreen().catch(() => {});
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      leavingFullscreenRef.current = true;
      document.exitFullscreen().catch(() => {
        leavingFullscreenRef.current = false;
      });
    } else {
      enterFullscreen();
    }
  }, [enterFullscreen]);

  const present = useCallback(
    (i: number, withFullscreen: boolean) => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      presentingRef.current = true;
      leavingFullscreenRef.current = false;
      // The track follows along instantly behind the dialog, so closing
      // lands the inline deck on the slide the presenter ended on.
      goTo(i, 'auto');
      if (!dialog.open) dialog.showModal();
      // Inside the gesture: fullscreen needs the user's activation.
      if (withFullscreen) enterFullscreen();
    },
    [enterFullscreen, goTo],
  );

  const closePresenter = useCallback(() => dialogRef.current?.close(), []);

  // Scroll tracking, settling, and the inline keys and clicks.
  useEffect(() => {
    const track = getTrack();
    const keyScope = track?.parentElement;
    if (!track || !keyScope) return;
    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const supportsScrollEnd = 'onscrollend' in window;

    const onScroll = () => {
      if (!frame) {
        frame = requestAnimationFrame(() => {
          frame = 0;
          // While a button/key scroll runs, the counter shows its target.
          if (targetRef.current === null && track.clientWidth > 0) {
            show(slideIndexFromScroll(track.scrollLeft, track.clientWidth, count));
          }
        });
      }
      if (!supportsScrollEnd) {
        clearTimeout(timer);
        timer = setTimeout(settle, SETTLE_FALLBACK_MS);
      }
    };
    const onInteract = () => {
      interactedRef.current = true;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      // The presenter <dialog> sits inside this scope in the DOM, so its keys
      // bubble here too; it handles its own.
      if (event.target instanceof Node && dialogRef.current?.contains(event.target)) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      switch (event.key) {
        case 'ArrowLeft': step(-1); break;
        case 'ArrowRight': step(1); break;
        case 'Home': goTo(0); break;
        case 'End': goTo(count - 1); break;
        case 'f':
        case 'F': present(indexRef.current, true); break;
        default: return;
      }
      // Only the keys the deck handles; "/" and Cmd+K still reach search.
      event.preventDefault();
    };
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof HTMLImageElement)) return;
      const slide = [...track.children].findIndex((child) => child.contains(target));
      if (slide >= 0) present(slide, false);
    };

    track.addEventListener('scroll', onScroll, { passive: true });
    if (supportsScrollEnd) track.addEventListener('scrollend', settle);
    track.addEventListener('pointerdown', onInteract, { passive: true });
    track.addEventListener('wheel', onInteract, { passive: true });
    track.addEventListener('click', onClick);
    keyScope.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      track.removeEventListener('scroll', onScroll);
      track.removeEventListener('scrollend', settle);
      track.removeEventListener('pointerdown', onInteract);
      track.removeEventListener('wheel', onInteract);
      track.removeEventListener('click', onClick);
      keyScope.removeEventListener('keydown', onKeyDown);
    };
  }, [count, getTrack, goTo, present, settle, show, step]);

  // Open at the slide the address names, and follow in-page slide links.
  useEffect(() => {
    const track = getTrack();
    if (track && initialIndex > 0) {
      track.scrollTo({ left: initialIndex * track.clientWidth, behavior: 'auto' });
    }
    const onHashChange = () => {
      const i = parseSlideHash(window.location.hash, stem, count);
      if (i !== null) goTo(i, 'auto');
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [count, getTrack, goTo, initialIndex, stem]);

  // Load the slides around the current one once the deck nears the viewport.
  useEffect(() => {
    const deck = rootRef.current?.closest('[data-slide-deck]');
    if (!deck) return;
    const markNear = () => {
      nearViewportRef.current = true;
      warm(indexRef.current);
    };
    if (typeof IntersectionObserver === 'undefined') {
      markNear();
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      markNear();
    }, { rootMargin: '200px' });
    observer.observe(deck);
    return () => observer.disconnect();
  }, [warm]);

  // Lazy slides that never scrolled into view would print blank.
  useEffect(() => {
    const onBeforePrint = () => {
      getTrack()?.querySelectorAll('img[loading="lazy"]').forEach((img) => img.setAttribute('loading', 'eager'));
    };
    window.addEventListener('beforeprint', onBeforePrint);
    return () => window.removeEventListener('beforeprint', onBeforePrint);
  }, [getTrack]);

  // While presenting: lock the page (<html>: the immersive reader owns
  // <body>'s overflow) and close when fullscreen ends by Escape.
  const presenting = presented !== null;
  useEffect(() => {
    if (!presenting) return;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
    const onFullscreenChange = () => {
      const active = !!stageRef.current && document.fullscreenElement === stageRef.current;
      setFullscreen(active);
      if (!active && !leavingFullscreenRef.current) closePresenter();
      if (!active) leavingFullscreenRef.current = false;
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      root.style.overflow = previousOverflow;
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, [closePresenter, presenting]);

  const onPresenterClosed = () => {
    presentingRef.current = false;
    if (document.fullscreenElement) {
      leavingFullscreenRef.current = true;
      document.exitFullscreen().catch(() => {});
    }
    setPresented(null);
    setFullscreen(false);
    settle();
  };

  const onPresenterKeyDown = (event: ReactKeyboardEvent<HTMLDialogElement>) => {
    // Keys stop here: a window-level Escape would also exit the immersive
    // reader underneath, and "/" or Cmd+K would open search.
    event.stopPropagation();
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    switch (event.key) {
      case 'ArrowLeft':
      case 'PageUp': step(-1, 'auto'); break;
      case 'ArrowRight':
      case 'PageDown': step(1, 'auto'); break;
      case ' ':
        // Space still presses a focused button.
        if (event.target instanceof HTMLButtonElement) return;
        step(event.shiftKey ? -1 : 1, 'auto');
        break;
      case 'Home': goTo(0, 'auto'); break;
      case 'End': goTo(count - 1, 'auto'); break;
      case 'f':
      case 'F': toggleFullscreen(); break;
      case 'Escape': closePresenter(); break;
      default: return;
    }
    event.preventDefault();
  };

  const onStagePointerDown = (event: ReactPointerEvent) => {
    swipeRef.current = { x: event.clientX, y: event.clientY };
  };
  const onStagePointerUp = (event: ReactPointerEvent) => {
    const start = swipeRef.current;
    swipeRef.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) >= SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy)) {
      swipedRef.current = true;
      step(dx < 0 ? 1 : -1, 'auto');
    }
  };

  // Rendered only on the client, so `document` is there. iPhone Safari has
  // no element fullscreen: the presenter alone fills the viewport.
  const canFullscreen = !!document.fullscreenEnabled;
  const atStart = index === 0;
  const atEnd = index === count - 1;
  const position = `${index + 1} / ${count}`;

  return (
    <div ref={rootRef} data-slide-deck-controls="" className="print:hidden">
      {!atStart && (
        <button type="button" onClick={() => step(-1)} aria-label={t('slide_prev')} className={`absolute left-2 top-1/2 -translate-y-1/2 ${ROUND_BUTTON}`}>
          <Chevron direction="left" />
        </button>
      )}
      {!atEnd && (
        <button type="button" onClick={() => step(1)} aria-label={t('slide_next')} className={`absolute right-2 top-1/2 -translate-y-1/2 ${ROUND_BUTTON}`}>
          <Chevron direction="right" />
        </button>
      )}
      <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
        <span aria-hidden="true" className={PILL}>{position}</span>
        <button type="button" onClick={() => present(indexRef.current, true)} aria-label={t('slides_fullscreen')} className={`${PILL} transition-colors hover:bg-black/70`}>
          <ExpandIcon />
        </button>
      </div>
      <span className="sr-only" aria-live="polite">{presenting ? '' : announcement}</span>

      <dialog
        ref={dialogRef}
        data-slide-presenter=""
        aria-label={label}
        onClose={onPresenterClosed}
        onKeyDown={onPresenterKeyDown}
        className="m-0 size-full max-h-none max-w-none border-0 bg-transparent p-0 backdrop:bg-black/85 print:hidden"
      >
        <div
          ref={stageRef}
          onPointerDown={onStagePointerDown}
          onPointerUp={onStagePointerUp}
          className="relative flex size-full items-center justify-center bg-black p-4 sm:p-10"
        >
          {presented && (
            // eslint-disable-next-line @next/next/no-img-element -- a plain <img>: the source is already optimized
            <img
              src={presented.src}
              alt={presented.alt}
              onClick={() => {
                if (swipedRef.current) {
                  swipedRef.current = false;
                  return;
                }
                step(1, 'auto');
              }}
              onError={(event) => {
                const img = event.currentTarget;
                if (img.src !== presented.fallback) img.src = presented.fallback;
              }}
              className="max-h-full max-w-full object-contain"
            />
          )}
          {!atStart && (
            <button type="button" onClick={() => step(-1, 'auto')} aria-label={t('slide_prev')} className={`absolute left-3 top-1/2 -translate-y-1/2 ${ROUND_BUTTON}`}>
              <Chevron direction="left" />
            </button>
          )}
          {!atEnd && (
            <button type="button" onClick={() => step(1, 'auto')} aria-label={t('slide_next')} className={`absolute right-3 top-1/2 -translate-y-1/2 ${ROUND_BUTTON}`}>
              <Chevron direction="right" />
            </button>
          )}
          <div className="absolute right-3 top-3 flex items-center gap-1.5">
            <span aria-hidden="true" className={PILL}>{position}</span>
            {canFullscreen && (
              <button type="button" onClick={toggleFullscreen} aria-label={t('slides_fullscreen')} aria-pressed={fullscreen} className={ROUND_BUTTON}>
                <ExpandIcon />
              </button>
            )}
            <button type="button" onClick={closePresenter} aria-label={t('image_zoom_close')} className={ROUND_BUTTON}>
              <CloseIcon />
            </button>
          </div>
          <span className="sr-only" aria-live="polite">{presenting ? announcement : ''}</span>
        </div>
      </dialog>
    </div>
  );
}
