export const siteConfig = {
  title: "Amytis",
  description: "A minimalist digital garden for growing thoughts and sharing knowledge.",
  baseUrl: "https://example.com", // Replace with your actual domain
  footerText: `© ${new Date().getFullYear()} Amytis. All rights reserved.`,
  nav: [
    { name: "Garden", url: "/", weight: 1 },
    { name: "Archive", url: "/archive", weight: 2 },
    { name: "Tags", url: "/tags", weight: 3 },
    { name: "About", url: "/about", weight: 4 },
    { name: "GitHub", url: "https://github.com/vercel/next.js", weight: 5, external: true },
  ],
  pagination: {
    pageSize: 10,
  },
  includeDateInUrl: false,
  showFuturePosts: false,
  toc: true,
  analytics: {
    provider: null, // 'umami' | 'plausible' | 'google' | null
    umami: {
      websiteId: '', // Your Umami Website ID
      src: 'https://us.umami.is/script.js', // Default or self-hosted URL
    },
    plausible: {
      domain: '', // Your domain
      src: 'https://plausible.io/js/script.js',
    },
    google: {
      measurementId: '', // G-XXXXXXXXXX
    },
  },
};
