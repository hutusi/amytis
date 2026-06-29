import { z } from 'zod';
import { siteConfig as rawSiteConfig } from '../../site.config';

/**
 * Build-time validation of site.config.ts.
 *
 * Static export means a malformed config must fail the build with a readable
 * message, not surface as a cryptic runtime error deep inside a route (e.g. a
 * non-numeric `pagination.posts` blowing up in route-aliases.ts, or a typo'd
 * `themeColor`). This schema mirrors the config shape and is parsed at module
 * load (strict-build invariant).
 *
 * It must accept BOTH config shapes Amytis ships:
 *   - this repo's bilingual config (locale-aware fields are { en, zh } maps)
 *   - the create-amytis example (i18n disabled, locale-aware fields are plain
 *     strings)
 * so every locale-aware field is `string | Record<string, string>`.
 *
 * Objects use Zod's default semantics (unknown keys are ignored, not rejected)
 * so adding a new config field never breaks validation — but a renamed or
 * mistyped *required* key is still caught, because the expected key goes missing.
 */

/** A locale-aware field: a plain string (single-locale) or a { locale: value } map. */
const localeString = z.union([z.string(), z.record(z.string(), z.string())]);

const positiveInt = z.number().int().positive();
const nonNegativeInt = z.number().int().nonnegative();

const navChildSchema = z.object({
  name: z.string(),
  url: z.string(),
  external: z.boolean().optional(),
  dividerBefore: z.boolean().optional(),
});

const navItemSchema = z.object({
  name: z.string(),
  url: z.string(),
  weight: z.number(),
  external: z.boolean().optional(),
  dropdown: z.array(z.string()).optional(),
  children: z.array(navChildSchema).optional(),
});

const footerLinkSchema = z.object({
  name: z.string(),
  url: z.string(),
  weight: z.number().optional(),
  external: z.boolean().optional(),
});

const featureSchema = z.object({
  enabled: z.boolean(),
  name: localeString.optional(),
});

const homepageSectionSchema = z.object({
  id: z.string(),
  enabled: z.boolean(),
  weight: z.number(),
  maxItems: positiveInt.optional(),
  order: z.enum(['shuffle', 'date-desc', 'date-asc']).optional(),
});

const authorSchema = z.object({
  bio: z.string().optional(),
  avatar: z.string().optional(),
  social: z
    .array(z.object({ image: z.string(), description: z.string() }))
    .optional(),
});

export const SiteConfigSchema = z.object({
  // ── Site identity ──
  title: localeString,
  logo: z.object({ src: z.string(), favicon: z.string() }),
  description: localeString,
  baseUrl: z.string().min(1),
  ogImage: z.string(),
  footerText: localeString,

  // ── i18n ──
  i18n: z.object({
    enabled: z.boolean(),
    defaultLocale: z.string().min(1),
    locales: z.array(z.string()).min(1),
  }),

  // ── Navigation & footer ──
  nav: z.array(navItemSchema),
  footer: z.object({
    explore: z.array(footerLinkSchema),
    connect: z.array(footerLinkSchema),
    builtWith: z.object({ show: z.boolean(), url: z.string(), text: localeString }),
    bottomLinks: z.array(z.object({ text: localeString, url: z.string().optional() })),
  }),

  // ── Social & sharing ──
  social: z.record(z.string(), z.string()),
  share: z.object({ enabled: z.boolean(), platforms: z.array(z.string()) }),
  subscribe: z.object({
    substack: z.string(),
    telegram: z.string(),
    wechat: z.object({ qrCode: z.string(), account: z.string() }),
    email: z.string(),
  }),

  // ── Features ──
  features: z.object({
    posts: featureSchema,
    series: featureSchema,
    books: featureSchema,
    flow: featureSchema,
  }),

  // ── Homepage ──
  hero: z.object({ tagline: localeString, title: localeString, subtitle: localeString }),
  homepage: z.object({ sections: z.array(homepageSectionSchema) }),

  // ── Content ──
  pagination: z.object({
    posts: positiveInt,
    series: positiveInt,
    flows: positiveInt,
    notes: positiveInt,
  }),
  posts: z.object({
    basePath: z.string().min(1),
    toc: z.boolean(),
    showFuturePosts: z.boolean(),
    includeDateInUrl: z.boolean(),
    authors: z.object({
      default: z.array(z.string()),
      showInHeader: z.boolean(),
      showAuthorCard: z.boolean(),
    }),
    excludeFromListing: z.array(z.string()),
    archive: z.object({ showAuthors: z.boolean() }),
  }),
  series: z.object({
    autoPaths: z.boolean(),
    customPaths: z.record(z.string(), z.string()),
  }),
  flows: z.object({ recentCount: nonNegativeInt }),
  feed: z.object({
    maxItems: nonNegativeInt,
    format: z.enum(['rss', 'atom', 'both']),
    content: z.enum(['excerpt', 'full']),
    includeFlows: z.boolean(),
  }),

  // ── Images & appearance ──
  images: z.object({ cdnBaseUrl: z.string() }),
  themeColor: z.enum(['default', 'blue', 'rose', 'amber']),
  browserCheck: z.object({ updateUrl: z.string() }),

  // ── Analytics ──
  analytics: z.object({
    providers: z.array(z.enum(['umami', 'plausible', 'google'])),
    umami: z.object({ websiteId: z.string(), src: z.string() }),
    plausible: z.object({ domain: z.string(), src: z.string() }),
    google: z.object({ measurementId: z.string() }),
  }),

  // ── Comments ──
  comments: z.object({
    provider: z.enum(['giscus', 'disqus']).nullable(),
    commentable: z.object({
      posts: z.boolean(),
      flows: z.boolean(),
      notes: z.boolean(),
      bookChapters: z.boolean(),
      staticPages: z.boolean(),
    }),
    giscus: z.object({
      repo: z.string(),
      repoId: z.string(),
      category: z.string(),
      categoryId: z.string(),
    }),
    disqus: z.object({ shortname: z.string() }),
  }),

  // ── Authors ──
  authors: z.record(z.string(), authorSchema),
});

/**
 * Throws a readable, build-failing error if `config` doesn't satisfy the schema.
 * Exported so tests can exercise it directly against good and bad fixtures.
 */
export function validateSiteConfig(config: unknown): void {
  const result = SiteConfigSchema.safeParse(config);
  if (!result.success) {
    const lines = result.error.issues.map(
      (i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`,
    );
    throw new Error(`[amytis] Invalid site.config.ts:\n${lines.join('\n')}`);
  }
}

// Fail the build immediately (with a readable message) on a malformed config,
// rather than letting it surface as a cryptic runtime error later. This runs
// whenever any module imports siteConfig from here.
validateSiteConfig(rawSiteConfig);

/** The validated site config. Re-exported with its original inferred type. */
export const siteConfig = rawSiteConfig;
