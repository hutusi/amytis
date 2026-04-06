import { getAllSeries, getSeriesData, PostData } from '@/lib/markdown';

export function safeDecodeParam(param: string): string {
  try {
    return decodeURIComponent(param);
  } catch {
    return param;
  }
}

function normalizeRedirectPath(path: string): string | null {
  const trimmed = path.trim();
  if (!trimmed) return null;

  try {
    const decoded = decodeURIComponent(trimmed);
    return decoded.startsWith('/') ? decoded : `/${decoded}`;
  } catch {
    return null;
  }
}

export function findSeriesByRedirectFrom(path: string): { slug: string; data: PostData } | null {
  const normalizedPath = normalizeRedirectPath(path);
  if (!normalizedPath) return null;

  for (const seriesSlug of Object.keys(getAllSeries())) {
    const data = getSeriesData(seriesSlug);
    if (!data) continue;

    const hasRedirect = (data.redirectFrom ?? []).some((redirectFrom) => {
      const normalizedRedirect = normalizeRedirectPath(redirectFrom);
      return normalizedRedirect === normalizedPath;
    });

    if (hasRedirect) {
      return { slug: seriesSlug, data };
    }
  }

  return null;
}
