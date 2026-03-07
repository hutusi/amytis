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

// Defined up-front so footer.connect can reference these URLs without duplication
const social = {
  github: "https://github.com/hutusi/amytis",
  twitter: "https://twitter.com/hutusi",
  email: "mailto:huziyong@gmail.com",
};

export const siteConfig = {

  // ── Site identity ─────────────────────────────────────────────────────────
  title: { en: "Amytis", zh: "Amytis" },
  logo: {
    // Path to navbar logo image served from public/ (leave empty for the default built-in icon)
    // Accepts SVG, PNG, etc. — e.g. "/logo.svg" or "/images/my-logo.png"
    src: "",
    // Path to favicon served from public/ (defaults to /icon.svg)
    favicon: "/icon.svg",
  },
  description: { en: "Amytis — an elegant open-source framework for building your personal digital garden.", zh: "Amytis — 优雅的开源数字花园框架。" },
  baseUrl: "https://example.com", // Replace with your actual domain
  ogImage: "/og-image.png", // Default OG/social preview image — place a 1200×630 PNG at public/og-image.png
  footerText: { en: `© ${new Date().getFullYear()} Amytis. All rights reserved.`, zh: `© ${new Date().getFullYear()} Amytis. 保留所有权利。` },

  // ── i18n ──────────────────────────────────────────────────────────────────
  i18n: {
    // Set enabled: false to disable multi-language support entirely.
    // The language switcher will be hidden and the defaultLocale is always used.
    // When disabled, all locale-aware fields (title, description, hero, etc.)
    // accept plain strings instead of { en: '...', zh: '...' } objects.
    enabled: true,
    defaultLocale: 'en',
    locales: ['en', 'zh'],
  },

  // ── Navigation ────────────────────────────────────────────────────────────
  nav: [
    { name: "Flow", url: "/flows", weight: 1 },
    { name: "Posts", url: "/posts", weight: 2 },
    { name: "Series", url: "/series", weight: 3, dropdown: ["digital-garden", "markdown-showcase", "ai-nexus-weekly"] },
    { name: "Books", url: "/books", weight: 4, dropdown: [] },
    { name: "About", url: "/about", weight: 5 },
    { name: "More", url: "", weight: 6, children: [
      { name: "Archive", url: "/archive" },
      { name: "Tags", url: "/tags" },
      { name: "Links", url: "/links" },
      { name: "Subscribe", url: "/subscribe", dividerBefore: true },
    ]},
  ] as NavItem[],

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    explore: [
      { name: "Archive", url: "/archive", weight: 1 },
      { name: "Tags", url: "/tags", weight: 2 },
      { name: "Links", url: "/links", weight: 3 },
      { name: "About", url: "/about", weight: 4 },
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
      text: { en: "Built with Amytis", zh: "基于 Amytis 构建" },
    },
    // Optional custom links shown in the footer bottom bar.
    // Common uses: ICP registration (China), PSB registration, cookie policy, sitemap, etc.
    // Example:
    // bottomLinks: [
    //   { text: '京ICP备12345678号', url: 'https://beian.miit.gov.cn/' },
    //   { text: 'Cookie Policy' },     // url is optional — renders as plain text
    // ],
    bottomLinks: [] as { text: string | Record<string, string>; url?: string }[],
  },

  // ── Social & sharing ──────────────────────────────────────────────────────
  social,
  share: {
    enabled: true,
    // Supported: twitter, facebook, linkedin, weibo, reddit, hackernews,
    //            telegram, bluesky, mastodon, douban, zhihu, copy
    platforms: ['twitter', 'facebook', 'linkedin', 'weibo', 'copy'],
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
      name: { en: "Articles", zh: "文章" },
    },
    series: {
      enabled: true,
      name: { en: "Series", zh: "系列" },
    },
    books: {
      enabled: true,
      name: { en: "Books", zh: "书籍" },
    },
    flow: {
      enabled: true,
      name: { en: "Flow", zh: "随笔" },
    },
  },

  // ── Homepage ──────────────────────────────────────────────────────────────
  hero: {
    tagline: { en: "Open Source Digital Garden", zh: "开源数字花园框架" },
    title: { en: "A home for ideas to grow, link, and evolve.", zh: "让想法生长、关联、演化的地方。" },
    subtitle: { en: "An elegant, open-source framework for cultivating personal knowledge — from raw daily flows to refined articles, curated series, and structured books.", zh: "优雅的开源知识培育框架——从每日随笔到精炼文章，从系列合集到结构化书籍，层层深化。" },
  },
  homepage: {
    sections: [
      { id: 'hero',            enabled: true, weight: 1 },
      { id: 'featured-posts',  enabled: true, weight: 2, maxItems: 4 },
      { id: 'latest-posts',    enabled: true, weight: 3, maxItems: 3 },
      { id: 'recent-flows',    enabled: true, weight: 4, maxItems: 8 },
      { id: 'featured-series', enabled: true, weight: 5, maxItems: 6, scrollThreshold: 2 },
      { id: 'featured-books',  enabled: true, weight: 6, maxItems: 4 },
    ],
  },

  // ── Content ───────────────────────────────────────────────────────────────
  pagination: {
    posts: 5,
    series: 5,
    flows: 20,
    notes: 20,
  },
  posts: {
    basePath: 'posts', // Change to e.g. 'articles' to serve all posts at /articles/[slug]
    toc: true,
    showFuturePosts: false,
    includeDateInUrl: false,
    // trailingSlash is configured in next.config.ts (Next.js handles URL normalization)
    authors: {
      // Default author names applied when a post has no author in its frontmatter.
      // Falls back to series authors first, then to this list.
      default: ["John Hu"] as string[],
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
    // Per-series custom URL prefix for posts within that series
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
    providers: ['umami'] as ('umami' | 'plausible' | 'google')[], // enable one or many; [] disables analytics
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
    provider: 'giscus', // 'giscus' | 'disqus' | null
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
      repo: 'hutusi/amytis', // username/repo
      repoId: 'R_kgDOQ1YSwA',
      category: 'Announcements',
      categoryId: 'DIC_kwDOQ1YSwM4C2NmL',
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
    "John Hu": {
      bio: "Coder, Writer, Creator.",
      avatar: "/images/avatar.jpg",
      social: [
        { image: "/images/wechat-qr.jpg", description: "Follow on WeChat" },
      ],
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
