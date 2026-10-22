import fs from 'node:fs';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { resolveLocaleValue } from '@/lib/i18n';
import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH } from '@/lib/metadata';
import type { OgCard } from '@/lib/og-images';
import { siteConfig } from '../../site.config';

/**
 * The light-theme `--accent` of each palette in globals.css (cards are always
 * light, like print). tests/tooling/og-card.test.ts keeps the two in sync.
 */
export const OG_ACCENTS: Record<typeof siteConfig.themeColor, string> = {
  default: '#047857',
  blue: '#1d4ed8',
  rose: '#be123c',
  amber: '#b45309',
};

const PAPER = '#fafaf9';
const HEADING = '#1c1917';
const MUTED = '#78716c';

// Latin glyphs come from the first family; Satori falls back through the
// rest, so Chinese titles and labels render in Noto Serif SC.
const SERIF = '"Libre Baskerville", "Noto Serif SC"';
const SANS = 'Inter, "Noto Serif SC"';

type OgFont = { name: string; data: Buffer; weight: 400 | 700; style: 'normal' };

let fonts: OgFont[] | undefined;

/** The fonts in src/fonts/og/, built by scripts/build-og-fonts.py. */
export function loadOgFonts(): OgFont[] {
  if (fonts) return fonts;
  const read = (file: string) =>
    fs.readFileSync(/* turbopackIgnore: true */ path.join(process.cwd(), 'src/fonts/og', file));
  fonts = [
    { name: 'Libre Baskerville', data: read('LibreBaskerville-Bold.ttf'), weight: 700, style: 'normal' },
    { name: 'Inter', data: read('Inter-Regular.ttf'), weight: 400, style: 'normal' },
    { name: 'Inter', data: read('Inter-Bold.ttf'), weight: 700, style: 'normal' },
    { name: 'Noto Serif SC', data: read('NotoSerifSC-Bold.otf'), weight: 700, style: 'normal' },
  ];
  return fonts;
}

const LOGO_TYPES: Record<string, string> = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

let logo: string | null | undefined;

/** The navbar logo, else the favicon, as a data URI; null when neither is a local svg/png/jpg. */
function loadLogo(): string | null {
  if (logo !== undefined) return logo;
  logo = null;
  for (const src of [siteConfig.logo.src, siteConfig.logo.favicon]) {
    const type = LOGO_TYPES[path.extname(src).toLowerCase()];
    if (!src.startsWith('/') || src.startsWith('//') || !type) continue;
    const file = path.join(process.cwd(), 'public', src.slice(1));
    if (!fs.existsSync(/* turbopackIgnore: true */ file)) continue;
    logo = `data:${type};base64,${fs.readFileSync(/* turbopackIgnore: true */ file).toString('base64')}`;
    break;
  }
  return logo;
}

/**
 * Title size by visual length: a CJK character is about one em wide, a Latin
 * one a little over half. Three lines at most; longer titles end in an ellipsis.
 */
export function titleFontSize(title: string): number {
  let ems = 0;
  for (const ch of title) ems += ch.codePointAt(0)! >= 0x2e80 ? 1 : 0.56;
  if (ems <= 28) return 72;
  if (ems <= 56) return 60;
  return 52;
}

function siteHost(): string {
  try {
    return new URL(siteConfig.baseUrl).host;
  } catch {
    return '';
  }
}

export function OgCardImage({ card }: { card: Pick<OgCard, 'locale' | 'title' | 'kicker' | 'date' | 'authors'> }) {
  const accent = OG_ACCENTS[siteConfig.themeColor] ?? OG_ACCENTS.default;
  const logoSrc = loadLogo();
  const meta = [card.date, card.authors.join(', ')].filter(Boolean).join(' · ');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        padding: '64px 80px',
        background: PAPER,
        color: MUTED,
        fontFamily: SANS,
        fontSize: 26,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- Satori markup, not a page
            <img src={logoSrc} width={44} height={44} alt="" style={{ marginRight: 16 }} />
          ) : null}
          <span style={{ color: HEADING, fontFamily: SERIF, fontSize: 30, fontWeight: 700 }}>
            {resolveLocaleValue(siteConfig.title, card.locale)}
          </span>
        </div>
        <span>{siteHost()}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1 }}>
        {card.kicker ? (
          <div style={{ display: 'flex', color: accent, fontSize: 28, fontWeight: 700, marginBottom: 20 }}>
            {card.kicker}
          </div>
        ) : null}
        <div
          style={{
            display: 'block',
            color: HEADING,
            fontFamily: SERIF,
            fontSize: titleFontSize(card.title),
            fontWeight: 700,
            lineHeight: 1.25,
            lineClamp: 3,
          }}
        >
          {card.title}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ width: 72, height: 4, background: accent, marginBottom: meta ? 24 : 0 }} />
        {meta ? <div style={{ display: 'flex' }}>{meta}</div> : null}
      </div>
    </div>
  );
}

export function renderOgCard(card: Pick<OgCard, 'locale' | 'title' | 'kicker' | 'date' | 'authors'>): ImageResponse {
  return new ImageResponse(<OgCardImage card={card} />, {
    width: OG_IMAGE_WIDTH,
    height: OG_IMAGE_HEIGHT,
    fonts: loadOgFonts(),
  });
}
