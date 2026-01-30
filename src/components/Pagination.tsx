'use client';

import Link from 'next/link';
import { useLanguage } from './LanguageProvider';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
}

export default function Pagination({ currentPage, totalPages }: PaginationProps) {
  const { t } = useLanguage();
  
  if (totalPages <= 1) return null;

  const getPages = () => {
    const pages: (number | string)[] = [];
    const delta = 2; // Show 2 pages around current

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        pages.push(i);
      } else if (
        (i === currentPage - delta - 1 && i > 1) ||
        (i === currentPage + delta + 1 && i < totalPages)
      ) {
        pages.push('...');
      }
    }
    // Filter duplicates (like multiple ...)
    return pages.filter((item, index) => pages.indexOf(item) === index);
  };

  const pages = getPages();

  return (
    <nav className="flex justify-center items-center gap-2 mt-12 border-t border-muted/10 pt-8" aria-label="Pagination">
      {/* Previous */}
      {currentPage > 1 ? (
        <Link
          href={currentPage - 1 === 1 ? '/' : `/page/${currentPage - 1}`}
          className="p-2 text-muted hover:text-accent transition-colors group no-underline"
          title={t('prev_page')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-1 transition-transform">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </Link>
      ) : (
        <span className="p-2 text-muted/20 cursor-not-allowed">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </span>
      )}

      {/* Page Numbers */}
      <div className="flex items-center gap-1">
        {pages.map((page, index) => {
          if (page === '...') {
            return (
              <span key={`dots-${index}`} className="px-3 py-2 text-muted font-mono text-sm select-none">
                ...
              </span>
            );
          }

          const isCurrent = page === currentPage;
          const href = page === 1 ? '/' : `/page/${page}`;

          return (
            <Link
              key={page}
              href={href}
              className={`min-w-[40px] h-10 flex items-center justify-center rounded-lg text-sm font-sans font-medium transition-all no-underline ${
                isCurrent
                  ? 'bg-accent text-white shadow-md shadow-accent/20'
                  : 'text-muted hover:bg-muted/10 hover:text-accent'
              }`}
              aria-current={isCurrent ? 'page' : undefined}
            >
              {page}
            </Link>
          );
        })}
      </div>

      {/* Next */}
      {currentPage < totalPages ? (
        <Link
          href={`/page/${currentPage + 1}`}
          className="p-2 text-muted hover:text-accent transition-colors group no-underline"
          title={t('next_page')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </Link>
      ) : (
        <span className="p-2 text-muted/20 cursor-not-allowed">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </span>
      )}
    </nav>
  );
}