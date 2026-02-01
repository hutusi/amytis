'use client';

import { useRef, useState, useEffect, ReactNode } from 'react';

interface HorizontalScrollProps {
  children: ReactNode;
  itemCount: number;
  scrollThreshold: number;
  className?: string;
}

export default function HorizontalScroll({
  children,
  itemCount,
  scrollThreshold,
  className = ''
}: HorizontalScrollProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const shouldShowArrows = itemCount > scrollThreshold;

  const updateScrollState = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  };

  useEffect(() => {
    updateScrollState();
    const container = scrollRef.current;
    if (container) {
      container.addEventListener('scroll', updateScrollState);
      window.addEventListener('resize', updateScrollState);
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', updateScrollState);
      }
      window.removeEventListener('resize', updateScrollState);
    };
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const scrollAmount = container.clientWidth * 0.8;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  if (!shouldShowArrows) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className="relative group/scroll">
      {/* Left Arrow */}
      <button
        onClick={() => scroll('left')}
        className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 p-3 bg-background/90 backdrop-blur-sm border border-muted/20 rounded-full shadow-lg transition-all hidden md:flex items-center justify-center ${
          canScrollLeft
            ? 'text-muted hover:text-accent hover:border-accent/40 hover:shadow-accent/10'
            : 'text-muted/20 cursor-not-allowed opacity-0'
        }`}
        disabled={!canScrollLeft}
        aria-label="Scroll left"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={canScrollLeft ? 'group-hover/scroll:-translate-x-0.5 transition-transform' : ''}>
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>

      {/* Scrollable Container */}
      <div
        ref={scrollRef}
        className={`overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory ${className}`}
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {children}
      </div>

      {/* Right Arrow */}
      <button
        onClick={() => scroll('right')}
        className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 p-3 bg-background/90 backdrop-blur-sm border border-muted/20 rounded-full shadow-lg transition-all hidden md:flex items-center justify-center ${
          canScrollRight
            ? 'text-muted hover:text-accent hover:border-accent/40 hover:shadow-accent/10'
            : 'text-muted/20 cursor-not-allowed opacity-0'
        }`}
        disabled={!canScrollRight}
        aria-label="Scroll right"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={canScrollRight ? 'group-hover/scroll:translate-x-0.5 transition-transform' : ''}>
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
    </div>
  );
}
