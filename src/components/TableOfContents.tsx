import Link from 'next/link';
import { Heading } from '@/lib/markdown';

export default function TableOfContents({ headings }: { headings: Heading[] }) {
  if (headings.length === 0) return null;

  return (
    <nav className="hidden lg:block sticky top-32 self-start max-h-[calc(100vh-8rem)] overflow-y-auto w-64 pl-8 border-l border-muted/10">
      <h2 className="text-xs font-sans font-bold uppercase tracking-widest text-muted mb-6">
        On this page
      </h2>
      <ul className="space-y-3">
        {headings.map((heading) => (
          <li 
            key={heading.id}
            className={`${heading.level === 3 ? 'pl-4' : ''}`}
          >
            <a 
              href={`#${heading.id}`}
              className="text-sm text-muted/80 hover:text-accent transition-colors duration-200 block leading-relaxed"
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
