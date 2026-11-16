import { Children, type ReactNode } from 'react';
import ExternalLinkIcon from '@/components/ExternalLinkIcon';
import SlideDeckControls from '@/components/SlideDeckControls';
import { getTranslator } from '@/lib/i18n';
import { isExternalUrl } from '@/lib/urls';
import { siteConfig } from '../../site.config';

interface SlideDeckProps {
  'data-base'?: string;
  'data-count'?: string;
  'data-title'?: string;
  'data-pdf'?: string;
  'data-video'?: string;
  /** Content locale, for the fallback name and link labels. */
  locale?: string;
  children?: ReactNode;
}

const LINK_CLASS = 'text-accent no-underline hover:underline';

/**
 * A `:::slides` deck (remark-slide-deck): a horizontal scroll-snap track with
 * one full-width slide per snap point, and a caption with the deck title and
 * talk links. A Server Component that works without JavaScript — swipe or
 * scroll between slides, arrow keys move the focused track, `#slides-12`
 * scrolls straight to slide 12, and print stacks every slide. Buttons, the
 * counter, keys, hash sync and the fullscreen presenter load on demand
 * (SlideDeckControls → SlideDeckRuntime).
 *
 * The children are the slide wrappers (`div#<stem>-<n>`) the remark plugin
 * built, each holding an image the `img` override rendered as a slide.
 */
export default function SlideDeck(props: SlideDeckProps) {
  const { t } = getTranslator(props.locale ?? siteConfig.i18n.defaultLocale);
  const title = props['data-title'];
  const pdf = props['data-pdf'];
  const video = props['data-video'];
  // Drop whitespace text nodes left between the slide wrappers.
  const slides = Children.toArray(props.children).filter((child) => typeof child !== 'string' || child.trim().length > 0);
  const videoIsExternal = !!video && isExternalUrl(video);
  const stem = props['data-base'];
  const count = Number(props['data-count']) || slides.length;
  const label = title || t('slides_label');

  return (
    <figure data-slide-deck="" data-base={props['data-base']} className="not-prose my-8">
      <div className="relative">
        <div
          data-slide-track=""
          tabIndex={0}
          role="region"
          aria-label={label}
          className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-lg border border-line bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 print:block print:overflow-visible print:border-0 print:bg-transparent"
        >
          {slides}
        </div>
        <span className="sr-only">{t('scroll_keyboard_hint')}</span>
        {stem && <SlideDeckControls stem={stem} count={count} label={label} />}
      </div>
      {(title || pdf || video) && (
        <figcaption className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm text-muted">
          {title && <span className="font-medium text-heading">{title}</span>}
          {pdf && (
            <a href={pdf} download className={LINK_CLASS}>
              {t('slides_pdf')}
            </a>
          )}
          {video && (
            <a
              href={video}
              className={LINK_CLASS}
              {...(videoIsExternal ? { target: '_blank', rel: 'noopener noreferrer', 'data-print-url': 'true' } : {})}
            >
              {t('slides_video')}
              {videoIsExternal && <ExternalLinkIcon />}
            </a>
          )}
        </figcaption>
      )}
    </figure>
  );
}
