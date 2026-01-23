import Link from 'next/link';
import { getAllPosts, PostData } from '@/lib/markdown';

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
  
  // Sort years descending to show newest content first
  const years = Object.keys(groupedPosts).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="layout-container">
      <header className="mb-20">
        <h1 className="text-4xl font-serif font-bold text-heading mb-4">Archive</h1>
        <p className="text-lg text-muted font-serif italic">
          A chronological journey through the garden.
        </p>
      </header>

      <main>
        <div className="space-y-16">
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
              <section key={year} className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-8 md:gap-16">
                <div className="relative">
                  <div className="sticky top-32 text-right hidden md:block">
                    <h2 className="text-5xl font-serif font-bold text-muted">
                      {year}
                    </h2>
                    <span className="block text-sm font-mono text-muted mt-2">
                      {yearTotal} posts
                    </span>
                  </div>
                  {/* Mobile year header */}
                  <div className="flex items-baseline justify-between md:hidden border-b border-muted/20 pb-2 mb-8">
                    <h2 className="text-4xl font-serif font-bold text-heading">
                      {year}
                    </h2>
                    <span className="text-sm font-mono text-muted">
                      {yearTotal} posts
                    </span>
                  </div>
                </div>
                
                <div className="space-y-16">
                  {months.map((month) => {
                    const monthPosts = groupedPosts[year][month];
                    return (
                      <div key={month}>
                        <h3 className="text-xs font-sans font-bold uppercase tracking-widest text-accent mb-6 flex items-center gap-4">
                          {month}
                          <span className="h-px flex-1 bg-muted/10"></span>
                        </h3>
                        <ul className="space-y-3">
                          {monthPosts.map((post) => {
                            const dateObj = new Date(post.date);
                            const day = dateObj.getDate().toString().padStart(2, '0');
                            
                            return (
                              <li key={post.slug} className="group">
                                <Link href={`/posts/${post.slug}`} className="flex items-baseline gap-6 w-full hover:translate-x-1 transition-transform duration-200 py-1">
                                  <time className="text-sm font-mono text-muted shrink-0 w-6 text-right">
                                    {day}
                                  </time>
                                  <h4 className="text-lg font-serif font-medium text-heading group-hover:text-accent transition-colors duration-200">
                                    {post.title}
                                  </h4>
                                  {post.authors.length > 0 && (
                                    <span className="text-xs font-sans italic text-muted ml-auto hidden sm:block shrink-0">
                                      {post.authors[0]}
                                    </span>
                                  )}
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