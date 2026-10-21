import { getOgCards } from '@/lib/og-images';
import { renderOgCard } from '@/lib/og-card';
import { resolveFromParam } from '@/lib/route-params';
import { resolveLocaleValue } from '@/lib/i18n';
import { getDefaultLocale } from '@/lib/urls';
import { siteConfig } from '../../../../site.config';

export const dynamic = 'force-static';
export const dynamicParams = false;

// Output-export routes need at least one param; this one renders a site card.
const PLACEHOLDER = '_.png';

export function generateStaticParams() {
  const params = [...getOgCards().keys()].map((imagePath) => ({
    path: imagePath.slice('/og/'.length).split('/'),
  }));
  if (params.length === 0) return [{ path: [PLACEHOLDER] }];
  // Dev only: the dev server may see percent-encoded segments for Unicode slugs.
  if (process.env.NODE_ENV !== 'production') {
    for (const { path } of [...params]) {
      const encoded = path.map(encodeURIComponent);
      if (encoded.some((segment, i) => segment !== path[i])) params.push({ path: encoded });
    }
  }
  return params;
}

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const cards = getOgCards();
  const card = resolveFromParam(`/og/${path.join('/')}`, (imagePath) => cards.get(imagePath) ?? null);
  if (card) return renderOgCard(card);
  if (path.join('/') === PLACEHOLDER) {
    const locale = getDefaultLocale();
    return renderOgCard({ locale, title: resolveLocaleValue(siteConfig.description, locale), authors: [] });
  }
  return new Response('Not found', { status: 404 });
}
