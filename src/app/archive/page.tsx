import Link from 'next/link';
import { getAllPosts, getSeriesData, PostData } from '@/lib/markdown';
import { siteConfig } from '../../../site.config';
import { resolveLocale, t } from '@/lib/i18n';
import PageHeader from '@/components/PageHeader';

export const metadata = {
  title: `Archive | ${resolveLocale(siteConfig.title)}`,
  description: 'A complete list of all notes and thoughts.',
};

// Use month number as key for reliable sorting across all locales
type GroupedPosts = Record<string, Record<string, PostData[]>>;

const locale = siteConfig.i18n.defaultLocale === 'zh' ? 'zh-CN' : siteConfig.i18n.defaultLocale;

function getMonthName(monthNum: number): string {
  return new Date(2000, monthNum - 1).toLocaleString(locale, { month: 'long' });
}

function groupPostsByDate(posts: PostData[]): GroupedPosts {
  const groups: GroupedPosts = {};

  posts.forEach((post) => {
    const date = new Date(post.date);
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString();

    if (!groups[year]) {
      groups[year] = {};
    }
    if (!groups[year][month]) {
      groups[year][month] = [];
    }
    groups[year][month].push(post);
  });

  return groups;
}

export default function ArchivePage() {
  const posts = getAllPosts();
  const groupedPosts = groupPostsByDate(posts);
  const showAuthors = siteConfig.archive?.showAuthors;

  // Sort years descending to show newest content first
  const years = Object.keys(groupedPosts).sort((a, b) => Number(b) - Number(a));
  const totalPosts = posts.length;

  // Build series slug → title map (one lookup per unique series)
  const seriesSlugs = [...new Set(posts.filter(p => p.series).map(p => p.series!))];
  const seriesTitleMap: Record<string, string> = {};
  for (const slug of seriesSlugs) {
    const data = getSeriesData(slug);
    if (data) seriesTitleMap[slug] = data.title;
  }

  return (
    <div className="layout-main">
      <PageHeader
        titleKey="archive"
        subtitleKey="archive_subtitle"
        subtitleOneKey="archive_subtitle_one"
        count={years.length}
        subtitleParams={{ count: totalPosts, years: years.length }}
      />

      <main>
        {/* Year-jump navigation */}
        {years.length > 1 && (
          <nav aria-label="Jump to year" className="flex flex-wrap gap-x-4 gap-y-2 mb-12">
            {years.map(year => (
              <a
                key={year}
                href={`#${year}`}
                className="text-sm font-mono text-muted hover:text-accent transition-colors no-underline"
              >
                {year}
              </a>
            ))}
          </nav>
        )}

        <div className="space-y-24">
          {years.map((year) => {
            // Sort months within the year in descending order (December -> January)
            const months = Object.keys(groupedPosts[year]).sort((a, b) => Number(b) - Number(a));

            // Calculate total posts for the year
            const yearTotal = months.reduce((total, month) => total + groupedPosts[year][month].length, 0);

            return (
              <section key={year} id={year} className="relative grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8 md:gap-16">
                {/* Year Marker */}
                <div className="relative">
                  <div className="sticky top-24 lg:top-32 text-left md:text-right">
                    <h2 className="text-4xl md:text-5xl font-serif font-bold text-muted/50">
                      {year}
                    </h2>
                    <span className="block text-xs font-bold uppercase tracking-widest text-muted mt-2">
                      {yearTotal} {t('posts')}
                    </span>
                  </div>
                </div>
                
                {/* Content Timeline */}
                <div className="relative border-l-2 border-muted/20 pl-8 md:pl-12 space-y-16">
                  {months.map((month) => {
                    const monthPosts = groupedPosts[year][month];
                    return (
                      <div key={month} className="relative">
                        {/* Month Marker - positioned relative to border */}
                        <div className="absolute -left-[calc(2rem+1px)] md:-left-[calc(3rem+1px)] -translate-x-1/2 top-1.5 w-3 h-3 rounded-full bg-background border-2 border-accent/50"></div>
                        
                        <h3 className="text-base font-sans font-bold uppercase tracking-widest text-accent mb-8">
                          {getMonthName(Number(month))}
                          <span className="ml-2 inline-flex items-center text-[10px] font-mono text-muted/60 bg-muted/10 rounded px-1.5 py-0.5 align-middle leading-none">
                            {monthPosts.length}
                          </span>
                        </h3>
                        
                        <ul className="space-y-6">
                          {monthPosts.map((post) => {
                            const dateObj = new Date(post.date);
                            const day = dateObj.getDate().toString().padStart(2, '0');
                            
                            return (
                              <li key={post.slug} className="group">
                                <Link href={`/posts/${post.slug}`} className="block no-underline">
                                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 sm:gap-6">
                                    <div className="flex items-baseline gap-6">
                                      <span className="font-mono text-base text-muted shrink-0 w-8">
                                        {day}
                                      </span>
                                      <div className="flex items-baseline gap-2">
                                        <h4 className="text-xl font-serif font-medium text-heading/80 group-hover:text-accent transition-colors duration-200">
                                          {post.title}
                                        </h4>
                                        {post.series && (
                                          <span
                                            title={seriesTitleMap[post.series] ?? post.series}
                                            className="text-[10px] font-sans font-medium uppercase tracking-wider text-accent/60 border border-accent/20 rounded px-1.5 py-0.5 shrink-0 leading-none max-w-[14ch] truncate inline-block align-baseline"
                                          >
                                            {seriesTitleMap[post.series] ?? post.series}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    {showAuthors && post.authors.length > 0 && (
                                      <span className="text-sm font-sans italic text-muted/60 shrink-0 hidden sm:block">
                                        {post.authors.join(', ')}
                                      </span>
                                    )}
                                  </div>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </section>
            );

          })}
        </div>
      </main>
    </div>
  );
}