export const siteConfig = {
  title: { en: "Amytis", zh: "Amytis" },
  description: { en: "A minimalist digital garden for growing thoughts and sharing knowledge.", zh: "一个极简的数字花园，用于培育思想和分享知识。" },
  baseUrl: "https://example.com", // Replace with your actual domain
  footerText: { en: `© ${new Date().getFullYear()} Amytis. All rights reserved.`, zh: `© ${new Date().getFullYear()} Amytis. 保留所有权利。` },
  nav: [
    { name: "Home", url: "/", weight: 1 },
    { name: "Series", url: "/series", weight: 1.5 },
    { name: "Archive", url: "/archive", weight: 2 },
    { name: "Tags", url: "/tags", weight: 3 },
    { name: "About", url: "/about", weight: 4 },
  ],
  social: {
    github: "https://github.com/hutusi/amytis",
    twitter: "https://twitter.com/hutusi",
    email: "mailto:huziyong@gmail.com",
  },
  series: {
    navbar: ["digital-garden", "markdown-showcase", "ai-nexus-weekly"], // Slugs of series to show in navbar
  },
  archive: {
    showAuthors: true,
  },
  pagination: {
    posts: 5,
    series: 1,
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
  about: {
    title: { en: "About Amytis", zh: "关于 Amytis" },
    subtitle: { en: "Learn more about the philosophy and technology behind this digital garden.", zh: "了解这座数字花园背后的理念与技术。" },
  },
  featured: {
    series: {
      scrollThreshold: 2,  // Enable scrolling when more than this number
      maxItems: 6,
    },
    stories: {
      scrollThreshold: 1,  // Enable scrolling when more than this number
      maxItems: 4,
    },
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
