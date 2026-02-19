# Future Roadmap

## 🚀 High Priority (Next Steps)

- [ ] **User Experience (UX)**
  - [ ] **Code Blocks**: Add a "Copy to Clipboard" button.
  - [ ] **Images**: Implement a Lightbox or Zoom-on-click feature.
  - [ ] **Navigation**: Add Breadcrumbs (e.g., `Home > Category > Post`).
  - [ ] **Navigation**: Add Previous/Next post links at the bottom of articles.

## 🌿 Digital Garden Features

- [ ] **Knowledge Graph**:
  - [ ] **Backlinks**: Show "Pages that link here" at the bottom of posts.
  - [ ] **Wiki-links**: Support `[[Internal Link]]` syntax.

## 🔮 Future Enhancements

- [ ] **Performance & App**
  - [ ] **PWA**: Add `manifest.json` and service workers for offline support.
  - [ ] **Search Optimization**: Optimize search index for large gardens (e.g. content segmentation).

- [ ] **Visuals**
  - [ ] **Dynamic OG Images**: Generate custom social cards with post title using `@vercel/og` (Satori).

- [ ] **CLI Enhancements**
  - [ ] **Interactive Mode**: Use prompts to select series, tags, and layouts when creating new posts.

## ✅ Completed

- [x] **Content Types**
  - [x] **Flows**: Stream-style daily notes or micro-blogging.
  - [x] **Books**: Structured long-form content with chapters.

- [x] **Engagement**
  - [x] **Comments**: Integrate Giscus (GitHub Discussions) for comments.

- [x] **Engineering**
  - [x] **Validation**: Add Zod schema validation for content frontmatter to prevent build errors.
  - [x] **Testing**: Add E2E tests for the new search and navigation features.

- [x] **SEO & Discovery**
  - [x] Generate `sitemap.xml` for search engines.
  - [x] Generate `rss.xml` / `atom.xml` for feed readers.
  - [x] Add Open Graph (OG) meta tags for social sharing.

- [x] **Navigation & UX**
  - [x] Implement a client-side fuzzy Search bar (Command+K).
  - [x] Add a sticky Table of Contents (TOC) with Unicode/Multilingual support.
  - [x] Add "Reading Time" estimate to post headers.
  - [x] Refine link styling (clean default, underline on hover).
  - [x] **Hero Section**: Configurable, collapsible welcome mat.
  - [x] **Themes**: Configurable color palettes (default, blue, rose, amber).
  - [x] **i18n**: Client-side language switcher infrastructure.

- [x] **Content & Architecture**
  - [x] **Series**: Robust support for grouping related posts (file-based & folder-based).
  - [x] **Series**: Manual sorting, cross-referencing, and configurable order.
  - [x] **Related Posts**: Auto-suggest relevant articles.
  - [x] **Cover Images**: Support local paths, external URLs, and generated text covers.
  - [x] **Analytics**: Privacy-friendly configuration (Umami/Plausible/Google).

- [x] **Performance**
  - [x] Static Image Optimization (`next-image-export-optimizer`).
  - [x] Automated image dimension injection.

- [x] **CLI Tools**
  - [x] `bun run new` script for scaffolding posts.
  - [x] `bun run new-series` script for scaffolding series.

- [x] **UI Polish & Refinements**
  - [x] **Animations**: Define missing animation classes.
  - [x] **Color Contrast**: Improve accessibility.
  - [x] **Responsive Grids**: Improve mobile/tablet layouts.
  - [x] **Archive Timeline**: Refine CSS.
  - [x] **Loading States**: Add skeleton loaders.
