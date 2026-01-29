# Future Roadmap

## 🚀 High Priority (Next Steps)

- [ ] **User Experience (UX)**
  - [ ] **Code Blocks**: Add a "Copy to Clipboard" button.
  - [ ] **Images**: Implement a Lightbox or Zoom-on-click feature.
  - [ ] **Navigation**: Add Breadcrumbs (e.g., `Home > Category > Post`).
  - [ ] **Navigation**: Add Previous/Next post links at the bottom of articles.

- [ ] **Engagement**
  - [x] **Comments**: Integrate Giscus (GitHub Discussions) for comments.

## 🔮 Future Enhancements

- [ ] **Visuals**
  - [ ] **Dynamic OG Images**: Generate custom social cards with post title using `@vercel/og` (Satori).

- [ ] **Engineering**
  - [ ] **Validation**: Add Zod schema validation for content frontmatter to prevent build errors.
  - [ ] **Testing**: Add E2E tests for the new search and navigation features.

## ✅ Completed

- [x] **SEO & Discovery**
  - [x] Generate `sitemap.xml` for search engines.
  - [x] Generate `rss.xml` / `atom.xml` for feed readers.
  - [x] Add Open Graph (OG) meta tags for social sharing.

- [x] **Navigation & UX**
  - [x] Implement a client-side fuzzy Search bar (Command+K).
  - [x] Add a sticky Table of Contents (TOC) with Unicode/Multilingual support.
  - [x] Add "Reading Time" estimate to post headers.
  - [x] Refine link styling (clean default, underline on hover).

- [x] **Content & Architecture**
  - [x] **Series**: Support for grouping related posts.
  - [x] **Related Posts**: Auto-suggest relevant articles.
  - [x] **Analytics**: Privacy-friendly configuration (Umami/Plausible/Google).

- [x] **Performance**
  - [x] Static Image Optimization (`next-image-export-optimizer`).
  - [x] Automated image dimension injection.

- [x] **CLI Tools**
  - [x] `bun run new` script for scaffolding posts.
