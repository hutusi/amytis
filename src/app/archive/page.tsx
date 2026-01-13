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
    <div className="max-w-4xl mx-auto px-6 py-12 md:py-20">
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

            // Calculate total posts for the year for display next to the header
            const yearTotal = months.reduce((total, month) => total + groupedPosts[year][month].length, 0);

            return (
              <section key={year} className="relative">
                <div className="flex items-baseline gap-4 mb-8">
                  <h2 className="text-6xl md:text-8xl font-serif font-bold text-muted/40 select-none">
                    {year}
                  </h2>
                  <span className="text-xl font-mono text-muted/60">
                    ({yearTotal})
                  </span>
                </div>
                
                <div className="relative z-10 pt-2 pl-2 md:pl-4">
                  {months.map((month) => {
                    const monthPosts = groupedPosts[year][month];
                    return (
                      <div key={month} className="mb-10 pl-2">
                        <h3 className="text-sm font-sans font-bold uppercase tracking-widest text-accent mb-6 flex items-center gap-2">
                          <span className="w-2 h-px bg-accent"></span>
                          {month}
                          <span className="text-muted/70 ml-1 font-normal normal-case tracking-normal">
                            ({monthPosts.length})
                          </span>
                        </h3>
                        <ul className="space-y-6 border-l border-muted/20 ml-1 pl-6">
                          {monthPosts.map((post) => (
                            <li key={post.slug} className="group relative">
                               <span className="absolute -left-[29px] top-2.5 w-1.5 h-1.5 rounded-full bg-muted/40 group-hover:bg-accent transition-colors duration-200 ring-4 ring-background"></span>
                              <Link href={`/posts/${post.slug}`} className="block">
                                <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between">
                                  <h4 className="text-lg font-serif font-medium text-heading group-hover:text-accent transition-colors duration-200">
                                    {post.title}
                                  </h4>
                                  <span className="text-xs font-mono text-muted mt-1 sm:mt-0">
                                    {new Date(post.date).getDate().toString().padStart(2, '0')}
                                  </span>
                                </div>
                              </Link>
                            </li>
                          ))}
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