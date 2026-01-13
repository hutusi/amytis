import Link from 'next/link';
import { getAllTags } from '@/lib/markdown';

export const metadata = {
  title: 'Tags | Amytis',
  description: 'Explore topics in the garden.',
};

export default function TagsPage() {
  const tags = getAllTags();
  const sortedTags = Object.keys(tags).sort();

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 md:py-20">
      <header className="mb-16">
        <h1 className="text-4xl font-serif font-bold text-heading mb-4">Tags</h1>
        <p className="text-lg text-muted font-serif italic">
          Topics cultivated in this garden.
        </p>
      </header>

      <main>
        <div className="flex flex-wrap gap-4">
          {sortedTags.map((tag) => (
            <Link
              key={tag}
              href={`/tags/${tag}`}
              className="inline-flex items-center px-4 py-2 rounded-full border border-muted/30 bg-background text-foreground hover:border-accent hover:text-accent transition-colors duration-200 text-sm font-medium"
            >
              <span>{tag}</span>
              <span className="ml-2 text-xs text-muted bg-muted/10 px-1.5 py-0.5 rounded-full">
                {tags[tag]}
              </span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
