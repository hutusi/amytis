import { siteConfig } from '../../site.config';

export const TELAREAD_ORIGIN = 'https://telaread.com';

/**
 * The footer link that lets a site owner claim the site on Tela
 * (telaread.com), or null when `siteConfig.telaread.username` is empty.
 *
 * Tela verifies a claim by fetching the home page and looking for a link to
 * `https://telaread.com/@<username>` whose `rel` contains `me`, so the URL
 * shape and that `me` token are the contract.
 *
 * Takes the config as a plain `object` because code type-checks against each
 * site's own inferred config type: a site.config.ts written before this field
 * existed must still compile, which `siteConfig.telaread` would not.
 */
export function telareadProfileLink(
  config: object = siteConfig,
): { href: string; rel: string } | null {
  const username = (config as { telaread?: { username?: string } }).telaread?.username;
  if (!username) return null;
  return { href: `${TELAREAD_ORIGIN}/@${username}`, rel: 'me noopener noreferrer' };
}
