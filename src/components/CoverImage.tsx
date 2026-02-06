import React from 'react';

const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1549887534-1541e9326642?auto=format&fit=crop&w=800&q=80", // Abstract Paint
  "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&w=800&q=80", // Colorful Paint
  "https://images.unsplash.com/photo-1579783902614-a3fb39279c23?auto=format&fit=crop&w=800&q=80", // Museum Art
  "https://images.unsplash.com/photo-1501472312651-726efe1188c1?auto=format&fit=crop&w=800&q=80", // Cloud/Sky
  "https://images.unsplash.com/photo-1605806616949-1e87b487bc2a?auto=format&fit=crop&w=800&q=80", // Flower/Oil
];

// Each palette defines a gradient background and text color for light/dark modes
const palettes = [
  // Warm amber
  'bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100 dark:from-amber-950 dark:via-orange-950 dark:to-yellow-950 text-amber-800 dark:text-amber-200',
  // Cool slate-blue
  'bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-blue-950 dark:to-indigo-950 text-slate-700 dark:text-slate-200',
  // Sage green
  'bg-gradient-to-br from-emerald-50 via-green-50 to-teal-100 dark:from-emerald-950 dark:via-green-950 dark:to-teal-950 text-emerald-800 dark:text-emerald-200',
  // Dusty rose
  'bg-gradient-to-br from-rose-50 via-pink-50 to-fuchsia-100 dark:from-rose-950 dark:via-pink-950 dark:to-fuchsia-950 text-rose-800 dark:text-rose-200',
  // Neutral stone
  'bg-gradient-to-br from-stone-100 via-stone-50 to-zinc-100 dark:from-stone-900 dark:via-stone-950 dark:to-zinc-900 text-stone-700 dark:text-stone-300',
  // Soft violet
  'bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100 dark:from-violet-950 dark:via-purple-950 dark:to-indigo-950 text-violet-800 dark:text-violet-200',
  // Warm teal
  'bg-gradient-to-br from-teal-50 via-cyan-50 to-sky-100 dark:from-teal-950 dark:via-cyan-950 dark:to-sky-950 text-teal-800 dark:text-teal-200',
];

// Decorative accent line color per palette
const accentColors = [
  'bg-amber-400/60 dark:bg-amber-500/40',
  'bg-indigo-400/60 dark:bg-indigo-400/40',
  'bg-emerald-400/60 dark:bg-emerald-500/40',
  'bg-rose-400/60 dark:bg-rose-400/40',
  'bg-stone-400/60 dark:bg-stone-500/40',
  'bg-violet-400/60 dark:bg-violet-400/40',
  'bg-teal-400/60 dark:bg-teal-400/40',
];

interface CoverImageProps {
  title: string;
  slug: string;
  src?: string;
  className?: string;
}

export default function CoverImage({ title, slug, src, className = "h-full w-full object-cover" }: CoverImageProps) {
  const imageIndex = slug.length % PLACEHOLDER_IMAGES.length;
  // If src is provided (even if empty string provided by parent?), use it. 
  // If src is undefined/null/empty, fallback to placeholder.
  // BUT we need to handle "text:" case properly.
  const imageUrl = src || PLACEHOLDER_IMAGES[imageIndex];
  
  const isTextCover = imageUrl.startsWith('text:');
  const coverText = isTextCover 
    ? (imageUrl.replace('text:', '').trim() || title) 
    : '';
    
  const paletteIndex = slug.length % palettes.length;
  const paletteClass = palettes[paletteIndex];
  const accentClass = accentColors[paletteIndex];

  if (isTextCover) {
    return (
      <div className={`h-full w-full ${paletteClass} flex items-center justify-center p-6 text-center relative overflow-hidden`}>
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-12 h-0.5 rounded-full ${accentClass} mt-4`} />
        <span className="font-serif font-bold tracking-tight break-words text-xl md:text-2xl leading-tight max-w-[80%]">
          {coverText}
        </span>
        <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 rounded-full ${accentClass} mb-4`} />
      </div>
    );
  }

  return (
    <img 
      src={imageUrl} 
      alt={title} 
      className={className}
      loading="lazy"
    />
  );
}
