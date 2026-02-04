export const siteConfig = {
  title: "Amytis",
  description: "A minimalist digital garden for growing thoughts and sharing knowledge.",
  baseUrl: "https://example.com", // Replace with your actual domain
  footerText: `© ${new Date().getFullYear()} Amytis. All rights reserved.`,
  nav: [
    { name: "Garden", url: "/", weight: 1 },
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
    navbar: ["advanced-markdown"], // Slugs of series to show in navbar
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
    title: "Cultivating Digital Knowledge",
    subtitle: "A minimalist digital garden for growing thoughts and sharing knowledge.",
  },
  featured: {
    series: {
      scrollThreshold: 2,  // Enable scrolling when more than this number
      maxItems: 6,
    },
    stories: {
      scrollThreshold: 1,  // Enable scrolling when more than this number
      maxItems: 5,
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
    provider: null, // 'giscus' | 'disqus' | null
    giscus: {
      repo: 'hutusi/amytis', // username/repo
      repoId: '',
      category: 'General',
      categoryId: '',
    },
    disqus: {
      shortname: '',
    },
  },
};
