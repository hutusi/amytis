import Link from 'next/link';
import { siteConfig } from '../../site.config';

export default function Navbar() {
  const navItems = [...siteConfig.nav].sort((a, b) => a.weight - b.weight);

  return (
    <nav className="fixed top-0 left-0 w-full z-50 border-b border-muted/10 bg-background/80 backdrop-blur-md transition-all duration-300">
      <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link 
          href="/" 
          className="text-xl font-serif font-bold text-heading hover:text-accent transition-colors duration-200"
        >
          {siteConfig.title}
        </Link>
        
        <div className="flex items-center gap-6">
          {navItems.map((item) => (
            <Link 
              key={item.url}
              href={item.url} 
              className="text-sm font-sans font-medium text-muted hover:text-heading transition-colors duration-200"
            >
              {item.name}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
