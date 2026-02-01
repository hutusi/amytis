import React from 'react';

const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1549887534-1541e9326642?auto=format&fit=crop&w=800&q=80", // Abstract Paint
  "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&w=800&q=80", // Colorful Paint
  "https://images.unsplash.com/photo-1579783902614-a3fb39279c23?auto=format&fit=crop&w=800&q=80", // Museum Art
  "https://images.unsplash.com/photo-1501472312651-726efe1188c1?auto=format&fit=crop&w=800&q=80", // Cloud/Sky
  "https://images.unsplash.com/photo-1605806616949-1e87b487bc2a?auto=format&fit=crop&w=800&q=80", // Flower/Oil
];

// Inline classes to ensure they work without relying on globals in all contexts
const gradients = [
  'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white',
  'bg-gradient-to-br from-amber-500 to-amber-700 text-white',
  'bg-gradient-to-br from-rose-500 to-rose-700 text-white',
  'bg-gradient-to-br from-sky-500 to-sky-700 text-white',
  'bg-gradient-to-br from-violet-500 to-violet-700 text-white',
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
    
  const gradientClass = gradients[slug.length % gradients.length];

  if (isTextCover) {
    return (
      <div className={`h-full w-full ${gradientClass} flex items-center justify-center p-4 text-center`}>
        <span className="font-serif font-bold tracking-tight opacity-95 break-words text-xl md:text-2xl leading-tight">
          {coverText}
        </span>
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
