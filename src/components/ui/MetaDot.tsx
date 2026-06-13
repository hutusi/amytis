import { cn } from '@/lib/cn';

interface MetaDotProps {
  className?: string;
}

/**
 * The tiny dot separator between inline metadata items
 * (e.g. date · reading time · category). Centralizes the repeated
 * `w-1 h-1 rounded-full bg-ink/[0.12]` separator.
 */
export default function MetaDot({ className }: MetaDotProps) {
  return <span className={cn('w-1 h-1 rounded-full bg-ink/[0.12]', className)} />;
}
