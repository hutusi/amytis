import Link from 'next/link';
import { getAllPosts, PostData } from '@/lib/markdown';
import { siteConfig } from '../../../site.config';

export const metadata = {
  title: 'Archive | Amytis',
  description: 'A complete list of all notes and thoughts.',
};

type GroupedPosts = Record<string, Record<string, PostData[]>>;

/**
 * Groups posts by Year and then by Month name.
 * Returns a nested object structure: { "2024": { "January": [...] } }
 */
function groupPostsByDate(posts: PostData[]): GroupedPosts {
  const groups: GroupedPosts = {};

  posts.forEach((post) => {
    const date = new Date(post.date);
    const year = date.getFullYear().toString();
    const month = date.toLocaleString('default', { month: 'long' });

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

  return (
    <div className="layout-main">
      <header className="page-header">
        <h1 className="page-title">Archive</h1>
        <p className="page-subtitle">
          A chronological journey through the garden.
        </p>
      </header>

      <main className="max-w-4xl mx-auto">
        <div className="space-y-24">
          {years.map((year) => {
            // Sort months within the year in descending order (December -> January)
            const months = Object.keys(groupedPosts[year]).sort((a, b) => {
               const dateA = new Date(`${a} 1, 2000`);
               const dateB = new Date(`${b} 1, 2000`);
               return dateB.getTime() - dateA.getTime();
            });

            // Calculate total posts for the year
            const yearTotal = months.reduce((total, month) => total + groupedPosts[year][month].length, 0);

            return (
              <section key={year} className="relative grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8 md:gap-16">
                {/* Year Marker */}
                <div className="relative">
                  <div className="sticky top-24 lg:top-32 text-left md:text-right">
                    <h2 className="text-4xl md:text-5xl font-serif font-bold text-muted/50">
                      {year}
                    </h2>
                    <span className="block text-xs font-bold uppercase tracking-widest text-muted mt-2 hidden md:block">
                      {yearTotal} Posts
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
                        <div className="absolute -left-[calc(2rem+5px)] md:-left-[calc(3rem+5px)] top-1.5 w-3 h-3 rounded-full bg-background border-2 border-accent/50"></div>
                        
                        <h3 className="text-base font-sans font-bold uppercase tracking-widest text-accent mb-8">
                          {month}
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
                                      <h4 className="text-xl font-serif font-medium text-heading/80 group-hover:text-accent transition-colors duration-200">
                                        {post.title}
                                      </h4>
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