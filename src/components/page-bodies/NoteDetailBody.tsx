import { buildSlugRegistry, getBacklinks } from '@/lib/content/discovery';
import { getNoteBySlug, getAdjacentNotes } from '@/lib/content/notes';
import { notFound } from 'next/navigation';
import { siteConfig } from '../../../site.config';
import { getTranslator } from '@/lib/i18n';
import { getNoteUrl, localizeUrl } from '@/lib/urls';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import NoteSidebar from '@/components/NoteSidebar';
import Tag from '@/components/Tag';
import ShareBar from '@/components/ShareBar';
import Comments from '@/components/Comments';
import { resolveCommentable } from '@/lib/comments';
import Link from 'next/link';

interface NoteDetailBodyProps {
  locale: string;
  /** Decoded note slug. */
  noteSlug: string;
}

/**
 * Shared body for a note detail page (`/notes/<slug>` and locale-prefixed
 * variants). The caller handles param decoding and feature gating; this
 * component owns the lookup, sidebar/backlinks assembly, and prev/next nav.
 */
export default function NoteDetailBody({ locale, noteSlug }: NoteDetailBodyProps) {
  const { t } = getTranslator(locale);
  const note = getNoteBySlug(noteSlug, locale);
  if (!note) notFound();

  const slugRegistry = buildSlugRegistry(locale);
  const backlinks = getBacklinks(note.slug, locale);
  const { prev, next } = getAdjacentNotes(note.slug, locale);

  const showToc = note.toc !== false && note.headings.length > 0;
  const visibleBacklinks = note.backlinks !== false ? backlinks : [];
  const showSidebar = showToc || visibleBacklinks.length > 0;
  const noteUrl = `${siteConfig.baseUrl}${localizeUrl(getNoteUrl(note.slug), locale)}`;

  const breadcrumb = (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted">
      <Link href={localizeUrl('/notes', locale)} className="hover:text-accent no-underline">
        {t('notes')}
      </Link>
      <span className="text-muted/40" aria-hidden="true">›</span>
      <span className="text-foreground truncate">{note.title}</span>
    </nav>
  );

  return (
    <div className="layout-main">
      {!showSidebar && <div className="mb-6">{breadcrumb}</div>}

      <div className={showSidebar
        ? 'grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-8 items-start'
        : 'max-w-3xl mx-auto'
      }>
        {showSidebar && (
          <NoteSidebar
            headings={note.headings}
            showToc={showToc}
            backlinks={visibleBacklinks}
            breadcrumb={breadcrumb}
          />
        )}
        <article className="min-w-0 w-full max-w-3xl mx-auto overflow-x-hidden">
          <header data-pagefind-body className="mb-8 border-b border-line pb-8">
            {note.draft && (
              <div className="mb-4">
                <span className="text-xs font-bold text-red-500 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded tracking-widest inline-block">
                  DRAFT
                </span>
              </div>
            )}
            <time className="text-sm font-mono text-accent" dateTime={note.date} data-pagefind-meta="date[datetime]">
              {note.date}
            </time>
            <h1 data-pagefind-meta="title" className="mt-2 text-3xl md:text-4xl font-serif font-bold text-heading leading-tight">
              {note.title}
            </h1>
            {note.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {note.tags.map(tag => (
                  <Tag key={tag} tag={tag} variant="default" />
                ))}
              </div>
            )}
          </header>

          <div data-pagefind-body>
            <MarkdownRenderer content={note.content} slug={`notes/${note.slug}`} slugRegistry={slugRegistry} />
          </div>

          <ShareBar url={noteUrl} title={note.title} className="mt-8 mb-2" />

          {resolveCommentable(note.commentable, 'notes') && (
            <Comments slug={`notes/${note.slug}`} postUrl={noteUrl} />
          )}

          {/* Prev/Next navigation */}
          <nav aria-label="Note navigation" className="mt-12 pt-12 border-t border-line grid grid-cols-2 gap-4">
            {prev ? (
              <Link href={localizeUrl(getNoteUrl(prev.slug), locale)} className="group text-left no-underline">
                <span className="text-xs text-muted">{t('older')}</span>
                <div className="text-sm font-medium text-heading group-hover:text-accent transition-colors truncate">
                  {prev.title}
                </div>
                <span className="text-xs font-mono text-muted">{prev.date}</span>
              </Link>
            ) : <div />}
            {next ? (
              <Link href={localizeUrl(getNoteUrl(next.slug), locale)} className="group text-right no-underline">
                <span className="text-xs text-muted">{t('newer')}</span>
                <div className="text-sm font-medium text-heading group-hover:text-accent transition-colors truncate">
                  {next.title}
                </div>
                <span className="text-xs font-mono text-muted">{next.date}</span>
              </Link>
            ) : <div />}
          </nav>
        </article>
      </div>
    </div>
  );
}
