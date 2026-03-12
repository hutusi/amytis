// Single-language starter template for Amytis.
// Copy this file to site.config.ts and customize it for your site.
//
// This template has i18n disabled. All locale-aware fields use plain strings.
// To add multi-language support later, switch to { en: '...', zh: '...' } objects
// and set i18n.enabled: true with your locales.

export interface NavChildItem {
  name: string;
  url: string;
  external?: boolean;
  dividerBefore?: boolean; // render a separator line before this item
}

export interface NavItem {
  name: string;
  url: string;
  weight: number;
  external?: boolean;
  dropdown?: string[];
  children?: NavChildItem[]; // static sub-links rendered as a dropdown
}

// Defined up-front so nav and posts config stay in sync — change once here
const postsBasePath = 'posts'; // Change to e.g. 'articles' to serve all posts at /articles/[slug]

// Defined up-front so footer.connect can reference these URLs without duplication
const social = {
  github: "https://github.com/your-username",
  twitter: "https://twitter.com/your-username",
  email: "mailto:you@example.com",
};

export const siteConfig = {

  // ── Site identity ─────────────────────────────────────────────────────────
  title: "My Garden",
  logo: {
    // Path to navbar logo image served from public/ (leave empty for the default built-in icon)
    // Accepts SVG, PNG, etc. — e.g. "/logo.svg" or "/images/my-logo.png"
    src: "",
    // Path to favicon served from public/ (defaults to /icon.svg)
    favicon: "/icon.svg",
  },
  description: "A personal digital garden — notes, articles, and ideas.",
  baseUrl: "https://example.com", // Replace with your actual domain
  ogImage: "/og-image.png", // Default OG/social preview image — place a 1200×630 PNG at public/og-image.png
  footerText: `© ${new Date().getFullYear()} My Garden. All rights reserved.`,

  // ── i18n ──────────────────────────────────────────────────────────────────
  i18n: {
    // i18n is disabled: the language switcher is hidden and defaultLocale is always used.
    // To enable multi-language support, set enabled: true, add more locales, and
    // convert plain string fields to locale maps: e.g. title: { en: '...', zh: '...' }
    enabled: false,
    defaultLocale: 'en',
    locales: ['en'],
  },

  // ── Navigation ────────────────────────────────────────────────────────────
  nav: [
    { name: "Posts", url: `/${postsBasePath}`, weight: 1 },
    { name: "Series", url: "/series", weight: 2 },
    { name: "About", url: "/about", weight: 3 },
    { name: "More", url: "", weight: 4, children: [
      { name: "Archive", url: "/archive" },
      { name: "Tags", url: "/tags" },
      { name: "Subscribe", url: "/subscribe", dividerBefore: true },
    ]},
  ] as NavItem[],

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    explore: [
      { name: "Archive", url: "/archive", weight: 1 },
      { name: "Tags", url: "/tags", weight: 2 },
      { name: "About", url: "/about", weight: 3 },
    ],
    connect: [
      { name: "GitHub", url: social.github, weight: 1 },
      { name: "X (Twitter)", url: social.twitter, weight: 2 },
      { name: "RSS Feed", url: "/feed.xml", weight: 3, external: true },
      { name: "Subscribe", url: "/subscribe", weight: 4 },
    ],
    builtWith: {
      show: true,
      url: "https://github.com/hutusi/amytis",
      text: "Built with Amytis",
    },
    // bottomLinks: [
    //   { text: '京ICP备12345678号', url: 'https://beian.miit.gov.cn/' },
    // ],
    bottomLinks: [],
  },

  // ── Social & sharing ──────────────────────────────────────────────────────
  social,
  share: {
    enabled: true,
    // Supported: twitter, facebook, linkedin, weibo, reddit, hackernews,
    //            telegram, bluesky, mastodon, douban, zhihu, copy
    platforms: ['twitter', 'facebook', 'linkedin', 'copy'],
  },
  subscribe: {
    substack: '',       // Substack publication URL, e.g., 'https://yourname.substack.com'
    telegram: '',       // Telegram channel URL, e.g., 'https://t.me/yourchannel'
    wechat: {
      qrCode: '',       // Path to QR image in public/, e.g., '/images/wechat-qr.png'
      account: '',      // WeChat official account ID/name shown below QR
    },
    email: '',          // Newsletter/mailing list URL (distinct from social.email contact address)
  },

  // ── Features ──────────────────────────────────────────────────────────────
  features: {
    posts: {
      enabled: true,
      name: "Articles",
    },
    series: {
      enabled: true,
      name: "Series",
    },
    books: {
      enabled: false,
      name: "Books",
    },
    flow: {
      enabled: false,
      name: "Flow",
    },
  },

  // ── Homepage ──────────────────────────────────────────────────────────────
  hero: {
    tagline: "My Personal Digital Garden",
    title: "A place for ideas to grow.",
    subtitle: "Notes, articles, and explorations — written for curiosity, shared for connection.",
  },
  homepage: {
    sections: [
      { id: 'hero',            enabled: true, weight: 1 },
      { id: 'featured-posts',  enabled: true, weight: 2, maxItems: 4 },
      { id: 'latest-posts',    enabled: true, weight: 3, maxItems: 3 },
      { id: 'recent-flows',    enabled: false, weight: 4, maxItems: 8 },
      { id: 'featured-series', enabled: true, weight: 5, maxItems: 6 },
      { id: 'featured-books',  enabled: false, weight: 6, maxItems: 4 },
    ],
  },

  // ── Content ───────────────────────────────────────────────────────────────
  pagination: {
    posts: 10,
    series: 5,
    flows: 20,
    notes: 20,
  },
  posts: {
    basePath: postsBasePath,
    toc: true,
    showFuturePosts: false,
    includeDateInUrl: false,
    // trailingSlash is configured in next.config.ts (Next.js handles URL normalization)
    authors: {
      // Default author names applied when a post has no author in its frontmatter.
      // Falls back to series authors first, then to this list.
      default: ["Your Name"] as string[],
      showInHeader: true,   // Show author byline below the post title
      showAuthorCard: true, // Show author bio card at the end of the post
    },
    // Series slugs whose posts are hidden from the main posts listing.
    // Posts remain accessible via their series page and direct URLs.
    excludeFromListing: [] as string[],
    archive: {
      showAuthors: true,
    },
  },
  series: {
    // When true, posts in a series are served at /[series-slug]/[post-slug]
    // instead of the default posts basePath. Defaults to true.
    // customPaths entries always take precedence over autoPaths.
    autoPaths: true,
    // Per-series custom URL prefix for posts within that series.
    // Overrides autoPaths for the specified series.
    // e.g., { 'weeklies': 'weeklies' } → posts served at /weeklies/[slug]
    customPaths: {} as Record<string, string>,
  },
  flows: {
    recentCount: 5,
  },

  feed: {
    maxItems: 20,                                           // Max items per feed (0 = no limit)
    format: 'rss' as 'rss' | 'atom' | 'both',              // Format(s) to serve and advertise
    content: 'full' as 'excerpt' | 'full',                  // Full post content or excerpt only
    includeFlows: false,                                    // Include flow notes alongside posts
  },

  // ── Images ────────────────────────────────────────────────────────────────
  images: {
    // CDN base URL for serving images (leave empty to serve locally)
    // e.g., "https://cdn.example.com" or "https://your-bucket.r2.dev"
    // When set, local image paths like /posts/slug/images/cover.jpg are rewritten
    // to https://cdn.example.com/posts/slug/images/cover.jpg at render time.
    cdnBaseUrl: "",
  },

  // ── Appearance ────────────────────────────────────────────────────────────
  themeColor: 'default', // 'default' | 'blue' | 'rose' | 'amber'

  // ── Browser compatibility warning ─────────────────────────────────────────
  browserCheck: {
    // URL shown in the outdated-browser banner. Set to '' to hide the link
    // (useful for corporate/intranet deployments where IT manages upgrades).
    updateUrl: 'https://browsehappy.com/',
  },

  // ── Analytics ─────────────────────────────────────────────────────────────
  analytics: {
    providers: [], // enable one or many: 'umami' | 'plausible' | 'google'
    umami: {
      websiteId: process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID || '', // Your Umami Website ID
      src: process.env.NEXT_PUBLIC_UMAMI_URL || 'https://us.umami.is/script.js', // Default or self-hosted URL
    },
    plausible: {
      domain: '', // Your domain
      src: 'https://plausible.io/js/script.js',
    },
    google: {
      measurementId: '', // G-XXXXXXXXXX
    },
  },

  // ── Comments ──────────────────────────────────────────────────────────────
  comments: {
    provider: null, // 'giscus' | 'disqus' | null
    // Per-category defaults. Set false to disable comments for an entire content type.
    // Individual pages can override with `commentable: true/false` in their frontmatter.
    commentable: {
      posts: true,
      flows: true,
      notes: true,
      bookChapters: true,
      staticPages: false,
    },
    giscus: {
      repo: 'your-username/your-repo', // username/repo
      repoId: '',
      category: 'Announcements',
      categoryId: '',
    },
    disqus: {
      shortname: '',
    },
  },

  // ── Authors ───────────────────────────────────────────────────────────────
  authors: {
    // Map display name (as used in post frontmatter) to author profile.
    // Example:
    // "Author Name": {
    //   bio: "Short bio shown in author card below each post.",
    //   avatar: "/images/authors/author-name.jpg", // path under public/
    //   social: [
    //     { image: "/images/authors/wechat-qr.jpg", description: "WeChat Official Account" },
    //   ],
    // },
    "Your Name": {
      bio: "Write a short bio here.",
      avatar: "/images/avatar.jpg",
      social: [],
    },
  } as Record<string, {
    bio?: string;
    avatar?: string;  // Avatar image path served from public/
    social?: Array<{
      image: string;       // Social image (e.g. QR code) path served from public/
      description: string; // Label shown below the image
    }>;
  }>,

};
