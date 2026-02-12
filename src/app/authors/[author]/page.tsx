import { getAllAuthors, getAuthorSlug, getPostsByAuthor, resolveAuthorParam } from '@/lib/markdown';
import PostCard from '@/components/PostCard';
import Tag from '@/components/Tag';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { siteConfig } from '../../../../site.config';
import { t } from '@/lib/i18n';

export async function generateStaticParams() {
  const authors = getAllAuthors();
  const params = new Set<string>();

  // Generate slug-based routes and keep legacy name-based routes for compatibility.
  for (const authorName of Object.keys(authors)) {
    params.add(getAuthorSlug(authorName));
    params.add(authorName);
  }

  return [...params].map((author) => ({ author }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ author: string }> }): Promise<Metadata> {
  const { author: rawAuthor } = await params;
  const decodedAuthorParam = decodeURIComponent(rawAuthor);
  const resolvedAuthor = resolveAuthorParam(decodedAuthorParam);

  if (!resolvedAuthor) {
    return {
      title: `Author Not Found | ${siteConfig.title}`,
    };
  }

  const posts = getPostsByAuthor(resolvedAuthor);
  return {
    title: `${resolvedAuthor} | ${siteConfig.title}`,
    description: `${posts.length} ${t('posts').toLowerCase()} ${t('written_by').toLowerCase()} ${resolvedAuthor}.`,
  };
}

export default async function AuthorPage({
  params,
}: {
  params: Promise<{ author: string }>;
}) {
  const { author: rawAuthor } = await params;
  const decodedAuthorParam = decodeURIComponent(rawAuthor);
  const resolvedAuthor = resolveAuthorParam(decodedAuthorParam);

  if (!resolvedAuthor) {
    notFound();
  }

  const posts = getPostsByAuthor(resolvedAuthor);

  if (posts.length === 0) {
    notFound();
  }

  // Collect unique tags and categories from this author's posts
  const tags = new Map<string, number>();
  const categories = new Set<string>();
  for (const post of posts) {
    categories.add(post.category);
    for (const tag of post.tags) {
      tags.set(tag, (tags.get(tag) || 0) + 1);
    }
  }
  const topTags = [...tags.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name]) => name);

  // Year range
  const dates = posts.map(p => p.date).sort();
  const firstYear = new Date(dates[0]).getFullYear();
  const lastYear = new Date(dates[dates.length - 1]).getFullYear();

  // Author initial for avatar
  const initial = resolvedAuthor.charAt(0).toUpperCase();

  return (
    <div className="layout-container">
      <header className="mb-20 text-center">
        {/* Author avatar */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-accent/10 border-2 border-accent/20">
          <span className="text-3xl font-serif font-bold text-accent">
            {initial}
          </span>
        </div>

        <h1 className="text-4xl md:text-5xl font-serif font-bold text-heading mb-4">
          {resolvedAuthor}
        </h1>

        {/* Stats */}
        <div className="flex items-center justify-center gap-4 text-sm text-muted font-mono">
          <span>{posts.length} {t('posts').toLowerCase()}</span>
          <span className="h-1 w-1 rounded-full bg-muted/30" />
          <span>{categories.size} {t('categories').toLowerCase()}</span>
          {firstYear !== lastYear && (
            <>
              <span className="h-1 w-1 rounded-full bg-muted/30" />
              <span>{firstYear} — {lastYear}</span>
            </>
          )}
        </div>

        {/* Top tags */}
        {topTags.length > 0 && (
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {topTags.map(tag => (
              <Tag key={tag} tag={tag} variant="default" />
            ))}
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {posts.map(post => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>
    </div>
  );
}
