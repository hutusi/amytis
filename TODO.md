# Amytis Roadmap

## 🚀 Priority UX & Engineering
- [ ] **Breadcrumbs**: Extend Flow breadcrumbs to standard Posts and Books.
- [ ] **Dynamic OG**: Generate automated social cards with Satori for every post.
- [ ] **PWA Support**: Add manifest and service worker for offline reading.
- [ ] **Image Zoom**: Implement medium-zoom or a lightbox for MDX images.

## 🌿 Digital Garden Evolution
- [ ] **Knowledge Graph**:
  - [ ] Interactive fullscreen mode for the graph.
  - [ ] Filter graph by tags or content types.
  - [ ] "Local Graph" view in the sidebar of individual notes.
- [ ] **Hover Preview**: Show a floating excerpt card when hovering over wiki-links, without navigating away.
- [ ] **Transclusion**: Embed another note or post's content inline using `![[slug]]` syntax.
- [ ] **Discovery**:
  - [ ] "On this day" section for Flows (history from previous years).
  - [ ] RSS/Atom feeds for specific categories or tags.
- [ ] **Notes**: Support for un-linked mentions (searching for note titles in plain text).

## 🛠 Tooling & Maintenance
- [ ] **Link Validator**: Script to check for broken internal wiki-links and external URLs.
- [ ] **Content Porter**: Tool to import/export notes from Obsidian or Notion.
- [ ] **Optimization**: Automatically compress and resize co-located images during build.

## ✅ Completed Highlights
- [x] **JSON-LD Structured Data**: `BlogPosting`, `Book`, and `Article` schemas for Google rich results.
- [x] **Digital Garden**: Notes, Wiki-links, Backlinks, and interactive Knowledge Graph.
- [x] **Pagefind Search**: High-performance static full-text indexing with rich UI.
- [x] **Smart Navigation**: Persistent "Previous" and "Next" article links on all posts.
- [x] **Multi-format Content**: Native support for **Posts**, **Series**, **Books**, and **Flows**.
- [x] **Professional Publishing**: Scoped `@hutusi/amytis` package with OIDC Trusted Publishing.
- [x] **Robust Engineering**: Zero hydration mismatches, Zod validation, and 64+ automated tests.
- [x] **Refined UI**: High-contrast typography, four color palettes, and horizontal scroll featured sections.
- [x] **Sub-features**: Newsletter/Subscribe page, Reading Progress, and Author Ecosystem.
