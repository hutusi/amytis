import { ExternalLink } from '@/lib/markdown';

interface ExternalLinksProps {
  links: ExternalLink[];
}

export default function ExternalLinks({ links }: ExternalLinksProps) {
  if (!links || links.length === 0) {
    return null;
  }

  return (
    <div className="mt-12 pt-8 border-t border-muted/20">
      <h3 className="text-sm font-sans font-semibold uppercase tracking-widest text-muted mb-4">
        Discuss this post
      </h3>
      <div className="flex flex-wrap gap-3">
        {links.map((link) => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-muted/20 bg-muted/5 text-foreground hover:border-accent/50 hover:bg-accent/5 hover:text-accent transition-all duration-200 no-underline"
          >
            <span>{link.name}</span>
            <svg
              className="w-4 h-4 opacity-60"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        ))}
      </div>
    </div>
  );
}
