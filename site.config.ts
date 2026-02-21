export interface NavItem {
  name: string;
  url: string;
  weight: number;
  dropdown?: string[];
}

export const siteConfig = {
  title: { en: "Amytis", zh: "Amytis" },
  description: { en: "A minimalist digital garden for growing thoughts and sharing knowledge.", zh: "一个极简的数字花园，用于培育思想和分享知识。" },
  baseUrl: "https://example.com", // Replace with your actual domain
  ogImage: "/og-image.png", // Default OG/social preview image — place a 1200×630 PNG at public/og-image.png
  footerText: { en: `© ${new Date().getFullYear()} Amytis. All rights reserved.`, zh: `© ${new Date().getFullYear()} Amytis. 保留所有权利。` },
  nav: [
    { name: "Flow", url: "/flows", weight: 1 },
    { name: "Posts", url: "/posts", weight: 2 },
    { name: "Series", url: "/series", weight: 3, dropdown: ["digital-garden", "markdown-showcase", "ai-nexus-weekly"] },
    { name: "Books", url: "/books", weight: 4, dropdown: [] },
    { name: "About", url: "/about", weight: 5 },
  ] as NavItem[],
  footer: {
    explore: [
      { name: "Archive", url: "/archive", weight: 1 },
      { name: "Tags", url: "/tags", weight: 2 },
      { name: "Links", url: "/links", weight: 3 },
      { name: "About", url: "/about", weight: 4 },
    ],
    connect: [
      { name: "GitHub", url: "https://github.com/hutusi/amytis", weight: 1 },
      { name: "Twitter", url: "https://twitter.com/hutusi", weight: 2 },
      { name: "RSS Feed", url: "/feed.xml", weight: 3 },
      { name: "Subscribe", url: "/subscribe", weight: 4 },
    ],
    builtWith: {
      show: true,
      url: "https://github.com/hutusi/amytis",
      text: { en: "Built with Amytis", zh: "基于 Amytis 构建" },
    },
  },
  social: {
    github: "https://github.com/hutusi/amytis",
    twitter: "https://twitter.com/hutusi",
    email: "mailto:huziyong@gmail.com",
  },
  archive: {
    showAuthors: true,
  },
  pagination: {
    posts: 5,
    series: 1,
    flows: 20,
  },
  includeDateInUrl: false,
  // trailingSlash is configured in next.config.ts (Next.js handles URL normalization)
  showFuturePosts: false,
  toc: true,
  themeColor: 'default', // 'default' | 'blue' | 'rose' | 'amber'
  hero: {
    tagline: { en: "Digital Garden", zh: "数字花园" },
    title: { en: "Cultivating Digital Knowledge", zh: "培育数字知识" },
    subtitle: { en: "A minimalist digital garden for growing thoughts and sharing knowledge.", zh: "一个极简的数字花园，用于培育思想和分享知识。" },
  },
  flows: {
    recentCount: 5,
  },
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
    email: '',          // Alternative email newsletter URL (if not using Substack)
  },
  features: {
    posts: {
      enabled: true,
      name: { en: "Posts", zh: "文章" },
    },
    series: {
      enabled: true,
      name: { en: "Series", zh: "系列" },
    },
    books: {
      enabled: true,
      name: { en: "Books", zh: "书籍" },
    },
    flows: {
      enabled: true,
      name: { en: "Flow", zh: "随笔" },
    },
  },
  homepage: {
    sections: [
      { id: 'hero',            enabled: true, weight: 1 },
      { id: 'featured-series', enabled: true, weight: 2, maxItems: 6, scrollThreshold: 2 },
      { id: 'featured-books',  enabled: true, weight: 3, maxItems: 4, scrollThreshold: 2 },
      { id: 'featured-posts',  enabled: true, weight: 4, maxItems: 4, scrollThreshold: 1 },
      { id: 'latest-posts',    enabled: true, weight: 5, maxItems: 5 },
      { id: 'recent-flows',    enabled: true, weight: 6, maxItems: 5 },
    ],
  },
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh'],
  },
  analytics: {
    provider: 'umami', // 'umami' | 'plausible' | 'google' | null
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
  authors: {
    // Map display name (as used in post frontmatter) to author profile
    // "Author Name": { bio: "Short bio shown in author card below each post." },
  } as Record<string, { bio?: string }>,
  comments: {
    provider: 'giscus', // 'giscus' | 'disqus' | null
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
};
