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
  - [ ] Per-tag / per-category RSS and Atom feeds (site-wide, posts, and flows feeds already ship).
- [ ] **Notes**: Support for un-linked mentions (searching for note titles in plain text).

## 🛠 Tooling & Maintenance
- [ ] **Link Validator**: Script to check for broken internal wiki-links and external URLs.
- [ ] **Content Porter**: Tool to import/export notes from Obsidian or Notion.
- [ ] **Optimization**: Automatically compress and resize co-located images during build.
- [ ] **Build Performance**: Profile `build:dev`, clean stale export/search outputs before indexing, and consider a lighter local build path that skips expensive full-site indexing when not needed.
- [ ] **Test Fixture Decoupling**: 18 of 30 integration tests read the live `content/` directory. Migrating them to `tests/fixtures/content/` needs a content-root override seam in `content/io.ts` plus a memo-cache reset design — deferred (2026-07) as a dedicated change.
- [ ] **Stricter Type Gates**: `noUncheckedIndexedAccess` (386 errors today) and type-aware ESLint (`recommendedTypeChecked`) — deferred (2026-07); both are churn-heavy sweeps best landed alone.
- [ ] **globals.css Split**: move the ~113 generated code-group icon lines to an imported partial (requires updating `scripts/generate-code-group-icons.ts`'s output target).

## 🤔 Under Consideration
- [ ] **Per-locale static routes** (`/en/…`, `/zh/…`): would let SSR emit the correct language, eliminating the flash of default-locale text and the `suppressHydrationWarning` workarounds that client-side i18n requires. Deferred (2026-07): changes public URLs (needs redirects) and roughly doubles the static page count; the incremental path chosen instead keeps URLs and shrinks the client-component surface.

## 📚 rST Follow-up
- [ ] **Fixture Coverage**: Add more compatibility fixtures from legacy rST series, including nested lists, tables, directives, images, and internal links.
- [ ] **Parser Diagnostics**: Improve rST build errors with clearer file context, line numbers where possible, and actionable unsupported-syntax messages.
- [ ] **Syntax Contract**: Document the exact supported rST subset and explicitly list unsupported or partial constructs.
- [ ] **Asset & Link Handling**: Harden relative asset resolution and add validation for broken local rST links and image references.
- [ ] **Reading Time**: Reuse the shared mixed-CJK reading-time rules for rST content so Chinese, Japanese, and Korean text are counted consistently.
- [ ] **Advanced Constructs**: Evaluate the highest-value next rST features from real imported content, such as footnotes, simple tables, and selected directives.

## ✅ Completed Highlights
- [x] **Immersive Reading Mode**: Fullscreen distraction-free reader for books and series with persisted preferences (1.17.0).
- [x] **Shiki Code Pipeline**: Build-time highlighting with code-group tabs, notation comments, and GitHub-flavored alerts (1.16.0).
- [x] **Flow Card Feed & Ink Design System**: Full-content flow feed with a month timeline rail; shared ink tokens across all surfaces (unreleased).
- [x] **JSON-LD Structured Data**: `BlogPosting`, `Book`, and `Article` schemas for Google rich results.
- [x] **Digital Garden**: Notes, Wiki-links, Backlinks, and interactive Knowledge Graph.
- [x] **Pagefind Search**: High-performance static full-text indexing with rich UI.
- [x] **Multi-format Content**: Native support for **Posts**, **Series**, **Books**, and **Flows** in Markdown, MDX, and rST.
- [x] **Professional Publishing**: Scoped `@hutusi/amytis` package with OIDC Trusted Publishing.
- [x] **Robust Engineering**: Strict build-time validation via Zod, an acyclic content layer enforced by test, and 75+ automated test files.
- [x] **Refined UI**: High-contrast typography, four color palettes, and horizontal scroll featured sections.
- [x] **Sub-features**: Newsletter/Subscribe page, Reading Progress, and Author Ecosystem.
