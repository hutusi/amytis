# Future Roadmap

## 🚀 High Priority (Next Steps)

- [ ] **User Experience (UX)**
  - [ ] **Code Blocks**: Add a "Copy to Clipboard" button.
  - [ ] **Images**: Implement a Lightbox or Zoom-on-click feature.
  - [ ] **Navigation**: Add Breadcrumbs (e.g., `Home > Category > Post`).
  - [ ] **Navigation**: Add Previous/Next post links at the bottom of articles.

## 🎨 UI Polish & Improvements

### High Priority
- [x] **Animations**: Define missing animation classes (`animate-fade-in`, `animate-slide-up`, `animation-delay-*`) in `globals.css`
- [x] **Color Contrast**: Improve `--muted` color contrast ratio for WCAG compliance
- [x] **Focus States**: Add visible focus rings to all interactive elements (links, buttons, cards)
- [x] **Section Spacing**: Standardize homepage section margins (`mb-24` vs `mb-32`)

### Medium Priority
- [x] **Responsive Grids**: Use `lg:` breakpoints consistently for sidebar layouts
- [x] **Archive Timeline**: Replace magic number positioning with proper CSS utilities
- [x] **Footer Layout**: Change to `lg:grid-cols-4` for better tablet display
- [x] **Tag Component**: Create unified tag styling component for consistency
- [x] **HorizontalScroll**: Add keyboard navigation (arrow keys) and improve disabled state visibility
- [x] **Series Dropdown**: Fix positioning to prevent cutoff on small screens

### Polish & Enhancements
- [x] **Thumbnails**: Increase Latest Writing thumbnail size on mobile (`w-24 h-24`)
- [x] **Loading States**: Add skeleton loaders for images and cards
- [x] **Typography**: Standardize line heights across headings
- [x] **Hover Transitions**: Ensure all transitions have consistent duration (`duration-300`)
- [x] **Skip Navigation**: Add "Skip to main content" link for accessibility
- [x] **Image Alt Text**: Make alt text more descriptive (e.g., `{title} cover image`)

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
  - [x] **Series**: Manual sorting, cross-referencing, and configurable order (`date-asc`, `date-desc`, `manual`).
  - [x] **Related Posts**: Auto-suggest relevant articles.
  - [x] **Cover Images**: Support local paths, external URLs, and generated text covers.
  - [x] **Analytics**: Privacy-friendly configuration (Umami/Plausible/Google).

- [x] **Performance**
  - [x] Static Image Optimization (`next-image-export-optimizer`).
  - [x] Automated image dimension injection.

- [x] **CLI Tools**
  - [x] `bun run new` script for scaffolding posts.
  - [x] `bun run new-series` script for scaffolding series.