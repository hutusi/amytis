'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';

/** Images the renderers marked (rehype-zoomable-images). */
const ZOOMABLE = 'img[data-zoomable="true"]';
/** Never zoom from inside these, marked or not: the click belongs to them. */
const OWNS_CLICKS = 'a, .mermaid';

interface Zoomed {
  src: string;
  /** What the page is showing, if the full-size `src` fails to load. */
  fallback: string;
  alt: string;
}

/**
 * Lightbox for content images, mounted once in the root layout. One
 * delegated click listener opens any marked image in a modal <dialog>:
 * showModal() puts it in the top layer, above the immersive reader and
 * outside the transformed flow cards that would otherwise contain a fixed
 * overlay. Escape, a click anywhere or the close button dismisses it.
 *
 * Images aren't focusable, so this is a pointer enhancement; the dialog
 * itself is fully keyboard-operable once open.
 */
export default function ImageZoom() {
  const { t } = useLanguage();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [zoomed, setZoomed] = useState<Zoomed | null>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof HTMLImageElement) || !target.matches(ZOOMABLE) || target.closest(OWNS_CLICKS)) return;
      event.preventDefault();
      // `src` is the largest variant the optimizer emitted (srcset picks a
      // smaller one for the page); `currentSrc` is what actually loaded.
      setZoomed({ src: target.src, fallback: target.currentSrc || target.src, alt: target.alt });
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!zoomed || !dialog) return;
    // Lock the page behind the dialog. <html>, not <body>: the immersive
    // reader owns body's overflow while it is open.
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
    if (!dialog.open) dialog.showModal();
    return () => {
      root.style.overflow = previousOverflow;
    };
  }, [zoomed]);

  const close = () => dialogRef.current?.close();

  return (
    <dialog
      ref={dialogRef}
      data-image-zoom="true"
      aria-label={zoomed?.alt || t('image_zoom_label')}
      onClose={() => setZoomed(null)}
      onClick={close}
      onKeyDown={(event) => {
        // Keys stop here: a window-level Escape would also exit the immersive
        // reader underneath, and "/" or Cmd+K would open search.
        event.stopPropagation();
        if (event.key === 'Escape') {
          event.preventDefault();
          close();
        }
      }}
      className="m-0 size-full max-h-none max-w-none border-0 bg-transparent p-0 backdrop:bg-black/85 print:hidden"
    >
      {zoomed && (
        <div className="flex size-full items-center justify-center p-4 sm:p-10">
          {/* eslint-disable-next-line @next/next/no-img-element -- a plain <img>: the source is already optimized */}
          <img
            src={zoomed.src}
            alt={zoomed.alt}
            onError={(event) => {
              const img = event.currentTarget;
              if (img.src !== zoomed.fallback) img.src = zoomed.fallback;
            }}
            className="max-h-full max-w-full cursor-zoom-out rounded-lg object-contain"
          />
          <button
            type="button"
            onClick={close}
            aria-label={t('image_zoom_close')}
            className="absolute right-3 top-3 grid size-11 place-items-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
          >
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
    </dialog>
  );
}
