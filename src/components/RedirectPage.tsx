'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Rendered at old URLs listed in a post's `redirectFrom` frontmatter field.
 * Immediately redirects the browser to the canonical URL and provides a
 * visible fallback link for non-JS environments.
 */
export default function RedirectPage({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-muted-foreground">
        This page has moved.{' '}
        <Link href={to} className="text-foreground underline underline-offset-4">
          Click here
        </Link>{' '}
        if you are not redirected automatically.
      </p>
    </div>
  );
}
