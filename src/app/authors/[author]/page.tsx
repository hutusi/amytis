import { getAllAuthors, getAuthorSlug, getPostsByAuthor, resolveAuthorParam, getSeriesData, getSeriesPosts, getBooksByAuthor } from '@/lib/markdown';
import PostList from '@/components/PostList';
import Tag from '@/components/Tag';
import CoverImage from '@/components/CoverImage';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { siteConfig } from '../../../../site.config';
import { t, resolveLocale } from '@/lib/i18n';
import AuthorStats from '@/components/AuthorStats';
import TranslatedText from '@/components/TranslatedText';

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
              <Link key={book.slug} href={`/books/${book.slug}`} className="group block no-underline">
                <div className="card-base h-full group flex flex-col p-0 overflow-hidden">
                  <div className="relative h-40 w-full overflow-hidden bg-muted/10">
                    <CoverImage
                      src={book.coverImage}
                      title={book.title}
                      slug={book.slug}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-6">
                    <span className="badge-accent mb-3 inline-block">
                      {book.chapters.length} {t('chapters_count')}
                    </span>
                    <h3 className="mb-2 font-serif text-xl font-bold text-heading group-hover:text-accent transition-colors">
                      {book.title}
                    </h3>
                    {book.excerpt && (
                      <p className="text-sm text-muted font-serif italic leading-relaxed line-clamp-2">
                        {book.excerpt}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
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
              <Link key={slug} href={`/series/${slug}`} className="group block no-underline">
                <div className="card-base h-full group flex flex-col p-0 overflow-hidden">
                  <div className="relative h-40 w-full overflow-hidden bg-muted/10">
                    <CoverImage
                      src={data.coverImage}
                      title={data.title}
                      slug={slug}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-6">
                    <span className="badge-accent mb-3 inline-block">
                      {postCount} {t('parts')}
                    </span>
                    <h3 className="mb-2 font-serif text-xl font-bold text-heading group-hover:text-accent transition-colors">
                      {data.title}
                    </h3>
                    {data.excerpt && (
                      <p className="text-sm text-muted font-serif italic leading-relaxed line-clamp-2">
                        {data.excerpt}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
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
