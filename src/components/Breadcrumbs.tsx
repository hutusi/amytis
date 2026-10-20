import Link from 'next/link';
import { getTranslator } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import type { BreadcrumbItem } from '@/lib/breadcrumbs';

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  /** Locale of the page, for the landmark's label. */
  locale: string;
  className?: string;
}

/**
 * The trail from a section listing down to the current page. Ancestors are
 * links (or plain text for groups without a page, like book parts); the
 * current page is last, marked aria-current and truncated, since the
 * page's own title follows right below.
 */
export default function Breadcrumbs({ items, locale, className }: BreadcrumbsProps) {
  if (items.length === 0) return null;
  const { t } = getTranslator(locale);
  return (
    <nav aria-label={t('breadcrumb')} className={cn('text-sm text-muted print:hidden', className)}>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;
          return (
            <li key={index} className="flex min-w-0 max-w-full items-center gap-1.5">
              {index > 0 && <span className="text-muted/40" aria-hidden="true">›</span>}
              {isCurrent ? (
                <span aria-current="page" className="min-w-0 truncate text-foreground">{item.label}</span>
              ) : item.href ? (
                <Link href={item.href} className="max-w-[14rem] truncate no-underline hover:text-accent">
                  {item.label}
                </Link>
              ) : (
                <span className="max-w-[14rem] truncate">{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
