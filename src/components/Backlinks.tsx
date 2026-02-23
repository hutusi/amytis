import Link from 'next/link';
import { BacklinkSource } from '@/lib/markdown';
import { t } from '@/lib/i18n';

interface BacklinksProps {
  backlinks: BacklinkSource[];
}

export default function Backlinks({ backlinks }: BacklinksProps) {
  if (!backlinks.length) return null;

  return (
    <div className="mt-12 pt-12 border-t border-muted/20">
      <h3 className="text-sm font-sans font-semibold uppercase tracking-widest text-muted mb-4">
        {t('backlinks')}
      </h3>
      <div className="flex flex-col gap-4">
        {backlinks.map(bl => (
          <div key={`${bl.type}-${bl.slug}`} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-muted/60 border border-muted/20 rounded px-1.5 py-0.5">
                {bl.type}
              </span>
              <Link
                href={bl.url}
                className="text-sm font-medium text-heading hover:text-accent no-underline transition-colors"
              >
                {bl.title}
              </Link>
            </div>
            {bl.context && (
              <p className="text-sm text-muted leading-relaxed">&ldquo;{bl.context}&rdquo;</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
