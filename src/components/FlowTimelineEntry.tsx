import Link from 'next/link';
import Tag from './Tag';

interface FlowTimelineEntryProps {
  date: string;
  title: string;
  excerpt: string;
  tags: string[];
  slug: string;
}

export default function FlowTimelineEntry({ date, title, excerpt, tags, slug }: FlowTimelineEntryProps) {
  return (
    <article className="relative pl-6 pb-8 border-l-2 border-muted/20 last:pb-0">
      {/* Timeline dot */}
      <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-accent" />

      <time className="text-xs font-mono text-accent">{date}</time>
      <h3 className="mt-1 mb-2 font-serif text-xl font-bold text-heading">
        <Link href={`/flows/${slug}`} className="no-underline hover:text-accent transition-colors">
          {title}
        </Link>
      </h3>
      <p className="text-sm text-muted leading-relaxed line-clamp-3">{excerpt}</p>
      {tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {tags.map(tag => (
            <Tag key={tag} tag={tag} variant="compact" />
          ))}
        </div>
      )}
    </article>
  );
}
