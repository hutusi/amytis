'use client';

import { useState, useEffect } from 'react';

interface HeroProps {
  title: string;
  subtitle: string;
}

export default function Hero({ title, subtitle }: HeroProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [showTrigger, setShowTrigger] = useState(true);

  useEffect(() => {
    // Check local storage on mount
    const savedState = localStorage.getItem('amytis-hero-visible');
    if (savedState === 'false') {
      setIsVisible(false);
    }

    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      
      // If we've scrolled past the hero significantly, collapse it so it doesn't show on scroll up
      if (scrollPosition > 400 && isVisible) {
        setIsVisible(false);
        localStorage.setItem('amytis-hero-visible', 'false');
      }

      // Only show the trigger bar when near the top
      setShowTrigger(scrollPosition < 100);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isVisible]);

  const handleExpand = () => {
    setIsVisible(true);
    localStorage.setItem('amytis-hero-visible', 'true');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCollapse = () => {
    setIsVisible(false);
    localStorage.setItem('amytis-hero-visible', 'false');
  };

  if (!isVisible) {
    return (
      <div 
        className={`sticky top-16 z-10 w-full cursor-pointer border-b border-muted/10 bg-background/80 backdrop-blur transition-all duration-500 ease-in-out hover:bg-muted/5 ${
          showTrigger ? 'opacity-100 translate-y-0 py-4' : 'opacity-0 -translate-y-full pointer-events-none py-0 border-none'
        }`}
        onClick={handleExpand}
      >
        <div className="text-center">
          <button 
            className="text-xs font-bold uppercase tracking-widest text-muted hover:text-accent transition-colors"
          >
            Show Intro ↓
          </button>
        </div>
      </div>
    );
  }

  return (
    <header className="relative py-24 md:py-40 flex flex-col items-center justify-center text-center max-w-4xl mx-auto min-h-[60vh]">
      <div className="mb-8 flex items-center justify-center animate-fade-in">
         <span className="h-px w-12 bg-accent/30 mr-4"></span>
         <span className="text-xs font-sans font-bold uppercase tracking-[0.3em] text-accent/80">Digital Garden</span>
         <span className="h-px w-12 bg-accent/30 ml-4"></span>
      </div>
      
      <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-medium text-heading leading-[1.1] tracking-tight mb-10 text-balance animate-slide-up">
        {title}
      </h1>
      
      <p className="text-muted font-sans text-sm md:text-base max-w-xl mx-auto leading-relaxed opacity-80 animate-slide-up animation-delay-200">
        {subtitle}
      </p>

      {/* Manual Close */}
      <button 
        onClick={handleCollapse}
        className="absolute top-4 right-4 text-muted/30 hover:text-accent transition-colors p-2"
        aria-label="Collapse Hero"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-muted/30">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 13l5 5 5-5M7 6l5 5 5-5"/>
        </svg>
      </div>
    </header>
  );
}
