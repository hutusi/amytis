export const siteConfig = {
  title: { en: "Amytis", zh: "Amytis" },
  description: { en: "A minimalist digital garden for growing thoughts and sharing knowledge.", zh: "一个极简的数字花园，用于培育思想和分享知识。" },
  baseUrl: "https://example.com", // Replace with your actual domain
  footerText: { en: `© ${new Date().getFullYear()} Amytis. All rights reserved.`, zh: `© ${new Date().getFullYear()} Amytis. 保留所有权利。` },
  nav: [
    { name: "Flow", url: "/flows", weight: 1 },
    { name: "Posts", url: "/posts", weight: 2 },
    { name: "Series", url: "/series", weight: 3, dropdown: ["digital-garden", "markdown-showcase", "ai-nexus-weekly"] },
    { name: "Books", url: "/books", weight: 4, dropdown: [] as string[] },
    { name: "About", url: "/about", weight: 5 },
  ],
  footer: {
    explore: [
      { name: "Archive", url: "/archive", weight: 1 },
      { name: "Tags", url: "/tags", weight: 2 },
      { name: "Links", url: "/links", weight: 3 },
      { name: "About", url: "/about", weight: 4 },
    ],
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
