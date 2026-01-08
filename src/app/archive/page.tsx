import Link from 'next/link';
import { getAllPosts, PostData } from '@/lib/markdown';

export const metadata = {
  title: 'Archive | Amytis',
  description: 'A complete list of all notes and thoughts.',
};

type GroupedPosts = Record<string, Record<string, PostData[]>>;

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
  
  // Sort years descending
  const years = Object.keys(groupedPosts).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 md:py-20">
      <header className="mb-20">
        <h1 className="text-4xl font-serif font-bold text-heading mb-4">Archive</h1>
        <p className="text-lg text-muted font-serif italic">
          A chronological journey through the garden.
        </p>
      </header>

      <main>
        <div className="space-y-16">
          {years.map((year) => {
            // Sort months descending? Usually for archives, yes. 
            // But we have month names. We need to be careful with sorting months if we use names.
            // Let's rely on the order they appear if the posts are already sorted by date?
            // getAllPosts sorts by date descending. So iterating through the grouped structure might lose order if we iterate keys.
            // A better approach is to keep the Month keys but maybe we need a custom sort or just rely on the fact that we process them in order?
            // Actually, objects don't guarantee key order.
            
            // Let's re-sort months to be safe.
            const months = Object.keys(groupedPosts[year]).sort((a, b) => {
               const dateA = new Date(`${a} 1, 2000`);
               const dateB = new Date(`${b} 1, 2000`);
               return dateB.getTime() - dateA.getTime();
            });

            return (
              <section key={year} className="relative">
                <h2 className="text-8xl font-serif font-bold text-muted/10 absolute -top-12 -left-6 select-none z-0">
                  {year}
                </h2>
                <div className="relative z-10 pt-4">
                  {months.map((month) => (
                    <div key={month} className="mb-10 pl-2">
                      <h3 className="text-sm font-sans font-bold uppercase tracking-widest text-accent mb-6 flex items-center gap-2">
                        <span className="w-2 h-px bg-accent"></span>
                        {month}
                      </h3>
                      <ul className="space-y-6 border-l border-muted/20 ml-1 pl-6">
                        {groupedPosts[year][month].map((post) => (
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
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}