import Link from 'next/link';
import type { BacklinkSource } from '@/lib/content/discovery';
import { t } from '@/lib/i18n';
import MetaLabel from '@/components/ui/MetaLabel';

interface BacklinksProps {
  backlinks: BacklinkSource[];
}

export default function Backlinks({ backlinks }: BacklinksProps) {
  if (!backlinks.length) return null;

  return (
    <div className="mt-12 pt-12 border-t border-ink/[0.07]">
      <h3 className="text-sm font-sans font-semibold uppercase tracking-widest text-muted mb-4">
        {t('backlinks')}
      </h3>
      <div className="flex flex-col gap-4">
        {backlinks.map(bl => (
          <div key={`${bl.type}-${bl.slug}`} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <MetaLabel className="text-muted/60 border border-ink/[0.07] rounded px-1.5 py-0.5">
                {bl.type}
              </MetaLabel>
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
