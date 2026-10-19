import { T } from '@/components/T';
import RedirectEffect from '@/components/RedirectEffect';

/**
 * Rendered at old URLs (`redirectFrom` aliases, series aliases, legacy author
 * URLs). Static export has no server redirects, so the stub redirects in
 * three layers:
 *
 * - an inline script runs while the HTML parses, before anything paints, and
 *   carries `location.hash` over so deep links to a heading survive the move;
 * - `<meta http-equiv="refresh">` (hoisted into <head> by React) covers
 *   no-JS clients and crawlers;
 * - `RedirectEffect` covers client-side navigation, where React inserts the
 *   markup without executing scripts or honoring the refresh.
 *
 * The visible fallback link is excluded from the Pagefind index; the route's
 * metadata (`buildRedirectMetadata`) marks the stub noindex with a canonical
 * pointing at the target.
 */
export default function RedirectPage({ to }: { to: string }) {
  // JSON.stringify quotes and escapes the path; escaping `<` keeps a
  // `</script>` sequence from closing the inline script early.
  const target = JSON.stringify(to).replace(/</g, '\\u003c');
  return (
    <div data-pagefind-ignore="all" className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
      <meta httpEquiv="refresh" content={`0;url=${to}`} />
      <script dangerouslySetInnerHTML={{ __html: `location.replace(${target}+location.hash)` }} />
      <RedirectEffect to={to} />
      <p className="text-muted">
        <T k="page_moved" />{' '}
        <a href={to} className="text-foreground underline underline-offset-4">
          <T k="redirect_fallback_link" />
        </a>
      </p>
    </div>
  );
}
