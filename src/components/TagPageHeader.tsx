import Link from 'next/link';
import { T } from './T';

interface TagPageHeaderProps {
  tag: string;
  postCount?: number;
  flowCount?: number;
  noteCount?: number;
}

// Server component: count logic is pure; translated strings render via <T>.
export default function TagPageHeader({ tag, postCount = 0, flowCount = 0, noteCount = 0 }: TagPageHeaderProps) {
  const parts: React.ReactNode[] = [];
  if (postCount > 0) {
    parts.push(
      <T
        key="posts"
        k={postCount === 1 ? 'tag_post_count_one' : 'tag_post_count'}
        params={{ count: postCount }}
      />
    );
  }
  if (flowCount > 0) {
    parts.push(
      <T
        key="flows"
        k={flowCount === 1 ? 'tag_flow_count_one' : 'tag_flow_count'}
        params={{ count: flowCount }}
      />
    );
  }
  if (noteCount > 0) {
    parts.push(
      <T
        key="notes"
        k={noteCount === 1 ? 'tag_note_count_one' : 'tag_note_count'}
        params={{ count: noteCount }}
      />
    );
  }

  return (
    <>
      {/* Back link: visible only on mobile (desktop has sidebar) */}
      <nav className="mb-8 flex lg:hidden">
        <Link
          href="/tags"
          className="text-xs font-bold uppercase tracking-widest text-muted hover:text-accent transition-colors no-underline"
        >
          &larr; <T k="tags" />
        </Link>
      </nav>

      <header className="mb-10">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-heading">
          <span className="text-accent/50 mr-1">#</span>{tag}
        </h1>
        {parts.length > 0 && (
          <p className="mt-2 text-sm text-muted">
            {parts.map((node, index) => (
              <span key={index}>
                {index > 0 && ' · '}
                {node}
              </span>
            ))}
          </p>
        )}
      </header>
    </>
  );
}
