import { getAllTags } from '@/lib/markdown';
import Tag from '@/components/Tag';

export const metadata = {
  title: 'Tags | Amytis',
  description: 'Explore topics in the garden.',
};

export default function TagsPage() {
  const tags = getAllTags();
  const sortedTags = Object.keys(tags).sort((a, b) => tags[b] - tags[a]);

  return (
    <div className="layout-main">
      <header className="page-header">
        <h1 className="page-title">Tags</h1>
        <p className="page-subtitle">
          Explore the topics cultivated in this garden.
        </p>
      </header>

      <main>
        <div className="flex flex-wrap justify-center gap-3 md:gap-4">
          {sortedTags.map((tag) => (
            <Tag key={tag} tag={tag} count={tags[tag]} variant="large" showHash={false} />
          ))}
        </div>
      </main>
    </div>
  );
}
