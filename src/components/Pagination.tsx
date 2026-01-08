import Link from 'next/link';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
}

export default function Pagination({ currentPage, totalPages }: PaginationProps) {
  const prevPage = currentPage - 1;
  const nextPage = currentPage + 1;

  return (
    <div className="flex justify-between items-center mt-12 border-t border-muted/20 pt-8">
      {prevPage >= 1 ? (
        <Link
          href={prevPage === 1 ? '/' : `/page/${prevPage}`}
          className="text-muted hover:text-accent transition-colors duration-200 font-sans text-sm flex items-center gap-1 group"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span>
          <span>Previous</span>
        </Link>
      ) : (
        <span className="text-muted/40 font-sans text-sm cursor-not-allowed">
          ← Previous
        </span>
      )}

      <span className="text-sm font-mono text-muted">
        Page {currentPage} of {totalPages}
      </span>

      {nextPage <= totalPages ? (
        <Link
          href={`/page/${nextPage}`}
          className="text-muted hover:text-accent transition-colors duration-200 font-sans text-sm flex items-center gap-1 group"
        >
          <span>Next</span>
          <span className="group-hover:translate-x-1 transition-transform">→</span>
        </Link>
      ) : (
        <span className="text-muted/40 font-sans text-sm cursor-not-allowed">
          Next →
        </span>
      )}
    </div>
  );
}
