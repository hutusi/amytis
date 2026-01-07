import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 w-full z-50 border-b border-muted/10 bg-background/80 backdrop-blur-md transition-all duration-300">
      <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link 
          href="/" 
          className="text-xl font-serif font-bold text-heading hover:text-accent transition-colors duration-200"
        >
          Amytis
        </Link>
        
        <div className="flex items-center gap-6">
          <Link 
            href="/" 
            className="text-sm font-sans font-medium text-muted hover:text-heading transition-colors duration-200"
          >
            Garden
          </Link>
          <Link 
            href="/archive" 
            className="text-sm font-sans font-medium text-muted hover:text-heading transition-colors duration-200"
          >
            Archive
          </Link>
          <Link 
            href="/about" 
            className="text-sm font-sans font-medium text-muted hover:text-heading transition-colors duration-200"
          >
            About
          </Link>
        </div>
      </div>
    </nav>
  );
}
