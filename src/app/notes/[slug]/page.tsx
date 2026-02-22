import { getAllNotes, getNoteBySlug, buildSlugRegistry, getBacklinks, getAdjacentNotes } from '@/lib/markdown';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { siteConfig } from '../../../../site.config';
import { t, resolveLocale } from '@/lib/i18n';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import Backlinks from '@/components/Backlinks';
import Tag from '@/components/Tag';
import Link from 'next/link';

export function generateStaticParams() {
  return getAllNotes().map(note => ({ slug: note.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const note = getNoteBySlug(slug);
  if (!note) return { title: 'Not Found' };
  return {
    title: `${note.title} | ${resolveLocale(siteConfig.title)}`,
    description: note.excerpt,
    openGraph: {
      title: note.title,
      description: note.excerpt,
      type: 'article',
      publishedTime: note.date,
      siteName: resolveLocale(siteConfig.title),
    },
  };
}

export default async function NotePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const note = getNoteBySlug(slug);
  if (!note) notFound();

  const slugRegistry = buildSlugRegistry();
  const backlinks = getBacklinks(slug);
  const { prev, next } = getAdjacentNotes(slug);

  return (
    <div className="layout-main">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted mb-6">
        <Link href="/notes" className="hover:text-accent no-underline">
          {t('notes')}
        </Link>
        <span className="text-muted/40">›</span>
        <span className="text-foreground">{note.title}</span>
      </nav>

      <div className="max-w-3xl mx-auto">
        <article>
          <header className="mb-8 border-b border-muted/10 pb-8">
            {note.draft && (
              <div className="mb-4">
                <span className="text-xs font-bold text-red-500 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded tracking-widest inline-block">
                  DRAFT
                </span>
              </div>
            )}
            <time className="text-sm font-mono text-accent" data-pagefind-meta="date[content]">
              {note.date}
            </time>
            <h1 className="mt-2 text-3xl md:text-4xl font-serif font-bold text-heading leading-tight">
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

          <MarkdownRenderer content={note.content} slug={note.slug} slugRegistry={slugRegistry} />

          {note.backlinks && <Backlinks backlinks={backlinks} />}

          {/* Prev/Next navigation */}
          <nav className="mt-12 pt-12 border-t border-muted/20 grid grid-cols-2 gap-4">
            {prev ? (
              <Link href={`/notes/${prev.slug}`} className="group text-left no-underline">
                <span className="text-xs text-muted">{t('older')}</span>
                <div className="text-sm font-medium text-heading group-hover:text-accent transition-colors truncate">
                  {prev.title}
                </div>
                <span className="text-xs font-mono text-muted">{prev.date}</span>
              </Link>
            ) : <div />}
            {next ? (
              <Link href={`/notes/${next.slug}`} className="group text-right no-underline">
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
