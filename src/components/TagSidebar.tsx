import Link from 'next/link';
import { t } from '@/lib/i18n';

interface TagSidebarProps {
  tags: Record<string, number>;
  activeTag: string;
}

export default function TagSidebar({ tags, activeTag }: TagSidebarProps) {
  const sortedTags = Object.entries(tags).sort((a, b) => b[1] - a[1]);

  return (
    <aside className="hidden lg:block w-44 flex-shrink-0">
      <div className="sticky top-24">
        <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-muted mb-3">
          {t('tags')}
        </p>
        <nav className="space-y-0.5 max-h-[calc(100vh-10rem)] overflow-y-auto pr-1">
          {sortedTags.map(([tag, count]) => {
            const isActive = tag === activeTag;
            return (
              <Link
                key={tag}
                href={`/tags/${encodeURIComponent(tag)}`}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm no-underline transition-colors ${
                  isActive
                    ? 'bg-accent/10 text-accent font-medium'
                    : 'text-foreground/70 hover:text-foreground hover:bg-muted/10'
                }`}
              >
                <span className="truncate">{tag}</span>
                <span className={`ml-2 text-xs font-mono flex-shrink-0 ${isActive ? 'text-accent/70' : 'text-muted/50'}`}>
                  {count}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
