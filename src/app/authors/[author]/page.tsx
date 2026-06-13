import { getSeriesData, getSeriesPosts } from '@/lib/content/series';
import { getAllAuthors, getAuthorSlug, getPostsByAuthor, resolveAuthorParam } from '@/lib/content/authors';
import { resolveFromParam } from '@/lib/route-params';
import { getBooksByAuthor } from '@/lib/content/books';
import PostList from '@/components/PostList';
import Tag from '@/components/Tag';
import ContentCard from '@/components/ContentCard';
import { getBookUrl, getSeriesUrl } from '@/lib/urls';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { siteConfig } from '../../../../site.config';
import { t, resolveLocale } from '@/lib/i18n';
import AuthorStats from '@/components/AuthorStats';
import TranslatedText from '@/components/TranslatedText';

export async function generateStaticParams() {
  const authors = getAllAuthors();
  const authorNames = Object.keys(authors);
  if (authorNames.length === 0) return [{ author: '_' }];
  const params = new Set<string>();

  // Generate slug-based routes and keep legacy name-based routes for compatibility.
  for (const authorName of authorNames) {
    params.add(getAuthorSlug(authorName));
    params.add(authorName);
  }

  return [...params].map((author) => ({ author }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ author: string }> }): Promise<Metadata> {
  const { author: rawAuthor } = await params;
  const resolvedAuthor = resolveFromParam(rawAuthor, resolveAuthorParam);

  if (!resolvedAuthor) {
    return {
      title: `Author Not Found | ${resolveLocale(siteConfig.title)}`,
    };
  }

  const posts = getPostsByAuthor(resolvedAuthor);
  return {
    title: `${resolvedAuthor} | ${resolveLocale(siteConfig.title)}`,
    description: `${posts.length} ${t('posts').toLowerCase()} ${t('written_by').toLowerCase()} ${resolvedAuthor}.`,
  };
}

export default async function AuthorPage({
  params,
}: {
  params: Promise<{ author: string }>;
}) {
  const { author: rawAuthor } = await params;
  const resolvedAuthor = resolveFromParam(rawAuthor, resolveAuthorParam);

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

  // Collect series the author contributed to
  const seriesSlugs = [...new Set(
    posts.filter(p => p.series).map(p => p.series!)
  )];
  const authorSeries = seriesSlugs
    .map(slug => {
      const data = getSeriesData(slug);
      const seriesPosts = getSeriesPosts(slug);
      if (!data) return null;
      return { slug, data, postCount: seriesPosts.length };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  // Collect books the author wrote
  const authorBooks = getBooksByAuthor(resolvedAuthor);

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
        <AuthorStats
          postCount={posts.length}
          seriesCount={authorSeries.length}
          categoryCount={categories.size}
          bookCount={authorBooks.length}
        />

        {/* Top tags */}
        {topTags.length > 0 && (
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {topTags.map(tag => (
              <Tag key={tag} tag={tag} variant="default" />
            ))}
          </div>
        )}
      </header>

      {/* Books */}
      {authorBooks.length > 0 && (
        <section className="mb-16">
          <h2 className="text-2xl font-serif font-bold text-heading mb-8"><TranslatedText translationKey="books" /></h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {authorBooks.map(book => (
              <ContentCard
                key={book.slug}
                href={getBookUrl(book.slug)}
                title={book.title}
                slug={book.slug}
                coverImage={book.coverImage}
                badge={`${book.chapters.length} ${t('chapters_count')}`}
                excerpt={book.excerpt}
                size="compact"
              />
            ))}
          </div>
        </section>
      )}

      {/* Series contributions */}
      {authorSeries.length > 0 && (
        <section className="mb-16">
          <h2 className="text-2xl font-serif font-bold text-heading mb-8"><TranslatedText translationKey="series" /></h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {authorSeries.map(({ slug, data, postCount }) => (
              <ContentCard
                key={slug}
                href={getSeriesUrl(slug)}
                title={data.title}
                slug={slug}
                coverImage={data.coverImage}
                badge={`${postCount} ${t('parts')}`}
                excerpt={data.excerpt}
                size="compact"
              />
            ))}
          </div>
        </section>
      )}

      <section>
        {authorSeries.length > 0 && (
          <h2 className="text-2xl font-serif font-bold text-heading mb-8"><TranslatedText translationKey="posts" /></h2>
        )}
        <PostList posts={posts} />
      </section>
    </div>
  );
}
