'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PostData } from '@/lib/markdown';

interface SeriesSidebarProps {
  seriesName: string;
  posts: PostData[];
  currentSlug: string;
}

export default function SeriesSidebar({ seriesName, posts, currentSlug }: SeriesSidebarProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <aside 
      className={`hidden lg:block sticky top-32 self-start border-r border-muted/10 max-h-[calc(100vh-10rem)] overflow-y-auto transition-all duration-300 ease-in-out ${
        isOpen ? 'w-64 pr-6 mr-6' : 'w-8 pr-2 mr-2'
      }`}
    >
      <div className="flex items-center justify-between mb-6 sticky top-0 bg-background/95 backdrop-blur z-10 py-2">
        <h3 className={`text-xs font-sans font-bold uppercase tracking-widest text-muted truncate ${!isOpen && 'hidden'}`}>
          Series Catalog
        </h3>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="text-muted hover:text-accent p-1 rounded-md hover:bg-muted/10 transition-colors"
          title={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {isOpen ? <path d="M18 6L6 12L18 18"/> : <path d="M6 6L18 12L6 18"/>}
          </svg>
        </button>
      </div>
      
      {isOpen && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <Link 
              href={`/series/${seriesName.toLowerCase().replace(/ /g, '-')}`} 
              className="block font-serif font-bold text-heading hover:text-accent transition-colors no-underline leading-tight"
            >
              {seriesName}
            </Link>
          </div>
          <ul className="space-y-3 relative">
            {/* Connector Line */}
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-muted/20" />
            
            {posts.map((post, index) => {
              const isCurrent = post.slug === currentSlug;
              return (
                <li key={post.slug} className="relative pl-6">
                  {/* Dot */}
                  <div className={`absolute left-[4px] top-2 w-[7px] h-[7px] rounded-full transition-colors ${isCurrent ? 'bg-accent shadow-sm shadow-accent/50' : 'bg-muted/30'}`} />
                  
                  <Link
                    href={`/posts/${post.slug}`}
                    className={`block text-sm transition-colors leading-snug no-underline ${
                      isCurrent
                        ? 'text-accent font-semibold'
                        : 'text-muted/80 hover:text-heading'
                    }`}
                  >
                    {post.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </aside>
  );
}
