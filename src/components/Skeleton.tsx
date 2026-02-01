interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string;
  height?: string;
}

/**
 * Skeleton loading placeholder component.
 * Use for content that is loading to improve perceived performance.
 */
export function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height,
}: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-muted/20';

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const style = {
    width: width || undefined,
    height: height || undefined,
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

/**
 * Skeleton for a post card with image and text.
 */
export function PostCardSkeleton() {
  return (
    <div className="card-base p-0 overflow-hidden">
      <Skeleton className="h-48 w-full rounded-none" />
      <div className="p-6 space-y-4">
        <Skeleton className="h-4 w-20" variant="text" />
        <Skeleton className="h-6 w-3/4" variant="text" />
        <Skeleton className="h-4 w-full" variant="text" />
        <Skeleton className="h-4 w-2/3" variant="text" />
      </div>
    </div>
  );
}

/**
 * Skeleton for a post list item.
 */
export function PostListSkeleton() {
  return (
    <div className="py-8 border-b border-muted/10 flex gap-8">
      <div className="flex-1 space-y-3">
        <Skeleton className="h-3 w-24" variant="text" />
        <Skeleton className="h-6 w-3/4" variant="text" />
        <Skeleton className="h-4 w-full" variant="text" />
        <Skeleton className="h-4 w-1/2" variant="text" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-3 w-16" variant="text" />
          <Skeleton className="h-3 w-12" variant="text" />
        </div>
      </div>
      <Skeleton className="w-24 h-24 md:w-32 md:h-24 shrink-0 rounded-lg" />
    </div>
  );
}

/**
 * Skeleton for a series card.
 */
export function SeriesCardSkeleton() {
  return (
    <div className="card-base p-0 overflow-hidden">
      <Skeleton className="h-56 w-full rounded-none" />
      <div className="p-8 space-y-4">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-7 w-2/3" variant="text" />
        <Skeleton className="h-4 w-full" variant="text" />
        <div className="pt-6 border-t border-muted/10 space-y-2">
          <div className="flex items-center gap-3">
            <Skeleton className="w-6 h-6" variant="circular" />
            <Skeleton className="h-4 w-32" variant="text" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="w-6 h-6" variant="circular" />
            <Skeleton className="h-4 w-40" variant="text" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="w-6 h-6" variant="circular" />
            <Skeleton className="h-4 w-28" variant="text" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for featured story.
 */
export function FeaturedStorySkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
      <Skeleton className="md:col-span-7 aspect-[16/9] rounded-2xl" />
      <div className="md:col-span-5 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-3 w-20" variant="text" />
          <Skeleton className="h-3 w-16" variant="text" />
        </div>
        <Skeleton className="h-10 w-full" variant="text" />
        <Skeleton className="h-10 w-3/4" variant="text" />
        <Skeleton className="h-4 w-full" variant="text" />
        <Skeleton className="h-4 w-full" variant="text" />
        <Skeleton className="h-4 w-2/3" variant="text" />
        <Skeleton className="h-3 w-24 mt-4" variant="text" />
      </div>
    </div>
  );
}

export default Skeleton;
