# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.15.0] - 2026-04-12

### Added
- **First-Class rST Support**: Added robust reStructuredText post and series support through the Python/docutils pipeline, including README-based series indexes and better handling of legacy rST metadata and content structure.
- **Legacy rST Link Resolution**: Added support for legacy `:doc:` references, including same-series and cross-series links, so migrated rST content can keep its internal navigation intact.

### Changed
- **rST Rendering Fidelity**: Improved rST rendering parity with Markdown for links, tables, code blocks, images, and general article presentation, making legacy content feel native inside Amytis.
- **Series Ordering Accuracy**: Series listing pages now sort by the real newest post date in each series instead of assuming the first rendered post is the latest one.
- **Build Performance**: Significantly reduced rebuild cost by caching rendered rST output, preserving nested image optimizer caches, tightening asset sync behavior, reducing generated image width buckets, and skipping Pagefind work when exported HTML is unchanged.

### Fixed
- **Legacy rST Edge Cases**: Fixed broken rST image rendering, restored docutils-based runtime rendering, accepted legacy single-digit date formats, improved adjacency/order handling for manually ordered rST series, and kept rST excerpts explicit when metadata omits them.
- **Image Optimizer Compatibility**: Prevented broken optimized URLs for local `.avif` and `.webp` sources by bypassing `next-image-export-optimizer` for those files in shared image renderers.
- **Create Amytis on Windows**: Fixed `create-amytis` scaffolding on Windows for releases containing Unicode paths by switching the Windows extraction path to ZIP + PowerShell. The scaffold package was also released separately as `create-amytis@0.1.2`.

## [1.14.0] - 2026-04-05

### Added
- **Type-Specific Feeds**: Introduced dedicated RSS and Atom feed endpoints for `/posts/feed.xml`, `/flows/feed.xml`, and a global `/all.xml` firehose, allowing readers to subscribe to specific content streams.
- **Namespaced Collections**: Collection items now support `folder/slug` syntax (e.g., `posts/my-post`, `web-dev/intro`) for explicit resolution, preventing slug collisions across different content directories.
- **Enhanced Feed Metadata**: Added RFC 4287 compliant author fallbacks for Atom feeds and optimized feed generation with lazy HTML rendering.

### Changed
- **Copy-Paste UX**: Wrapped article content in background-stable containers to prevent "striping" when pasting into rich-text editors and applied `select-none` to navigation and sidebars for cleaner content selection.
- **Archive Page Robustness**: Refactored the chronological archive layout to prioritize titles and gracefully truncate long author lists, preventing layout shifts on posts with many contributors.
- **Test Coverage**: Added comprehensive integration tests for namespaced resolution and E2E tests for the new feed architecture.

### Fixed
- **XML Template Literals**: Fixed a syntax issue with escaped backticks in the RSS/Atom generator that caused build-time errors.
- **Archive Mobile Layout**: Improved layout stability on mobile devices for archive timeline entries.

## [1.13.0] - 2026-03-25

### Added
- **Slug Rename Redirects**: Added `redirectFrom` support for post slug renames within the same URL prefix so renamed content can keep resolving from legacy paths.
- **Series Slug Migration**: Added `redirectFrom` support for series slug renames, preserving access to older series URLs after route changes.

### Changed
- **Series Routing Defaults**: `series.autoPaths` now defaults to `true`, making `/<series-slug>/<post-slug>` the standard route shape for series posts.
- **README Positioning**: Updated the English README to match the latest Chinese version, including the project backstory and refreshed documentation structure.

### Fixed
- **Route Conflict Handling**: Prevented auto-path series slugs from colliding with configured `series.customPaths` values during route generation.

## [1.12.0] - 2026-03-08

### Added
- **Series Auto Paths**: Added `series.autoPaths` so series posts can be served directly at `/<series-slug>/<post-slug>` without manual per-series path mapping.
- **URL Migration Tooling**: Added `bun run add-series-redirects` with `--dry-run` and `--auto-paths` support to backfill `redirectFrom` entries before route migrations.
- **Collections**: Added curated cross-series collections with dedicated data-layer support, listing surfaces, and integration test coverage.
- **Static Page Comments**: Added per-category comment controls plus optional comments on book chapters, notes, and flows.
- **Obsidian Importer**: Added `bun run import-obsidian` for recursive vault import with wikilink rewriting and relative-path handling.
- **Mobile Coverage**: Added Playwright-based mobile compatibility testing and homepage/navigation assertions across real-device profiles.

### Changed
- **Wikilink Readability**: Wikilinks now prefer rendered note titles over raw slugs where metadata is available.
- **Homepage Behavior**: Clicking the logo on the homepage now scrolls back to the top, and section spacing stays consistent when optional homepage blocks are disabled.
- **Documentation**: Refreshed repository guidance, architecture notes, and release-facing docs to match current commands, routing rules, and import workflows.

### Fixed
- **Redirect Safety**: Prevented `redirectFrom` aliases from hijacking reserved routes or existing pages, including conflicting and single-segment alias cases.
- **Custom Route Redirects**: Fixed renamed-slug redirects for `series.customPaths` and `[slug]/[postSlug]` routes.
- **Collection Integrity**: Fixed duplicate collection entries, draft leakage in production, and prev/next navigation inconsistencies.
- **Tag URL Consistency**: Normalized mixed-case tag URLs without losing display casing and removed duplicate counting from same-document tag variants.
- **Unicode Note Routing**: Fixed dev-mode handling for percent-encoded Unicode note slugs.
- **Mobile UX**: Improved narrow-viewport layout stability, tap-target sizing, and flaky mobile test behavior.

## [1.11.0] - 2026-03-07

### Changed
- **Feed Output Quality**: RSS and Atom feeds now render Markdown content as HTML, include richer item metadata, and send explicit cache headers for static deployments.
- **Metadata Consistency**: Consolidated image URL resolution so Open Graph and JSON-LD metadata use the same asset handling logic.
- **Documentation Sync**: Updated the English and Chinese READMEs plus contributor guidance to reflect current scaffolding behavior, dev-search setup, and workspace instructions.

### Fixed
- **RSS Standards Compliance**: Corrected the RSS MIME type to `application/rss+xml` and improved RSS/Atom structure for better reader compatibility.
- **Feed Metadata Fidelity**: Improved handling of author fields, item content, and image metadata across feed generation and social preview output.
- **Post Page Polish**: Improved post page OG images, previous/next navigation consistency, and TOC indentation.
- **Book Link Consistency**: Standardized book links to use the shared URL helper.

### Docs
- **Developer Notes**: Added inline documentation for `getFeedItems()` behavior and configuration handling.
- **Repository Instructions**: Refreshed repository-level agent instructions to match the current workspace layout and release workflow.

## [1.10.0] - 2026-03-02

### Added
- **Configurable URL Topology**: Added support for `posts.basePath` and `series.customPaths` so posts and series can be served under custom prefixes.
- **Single-Language Mode**: Added `i18n.enabled` to disable multilingual routing/UI when running a single-locale site.
- **Homepage Content Controls**: Added pinned-post support and optional post subtitles for improved featured and latest sections.
- **Author Profile Expansion**: Added configurable default authors plus optional author avatar/social images and header/card visibility toggles.
- **Publishing Controls**: Added `posts.excludeFromListing` to keep selected series posts out of the main `/posts` feed.
- **Deployment & Media**: Added one-command Linux/nginx deploy script and `images.cdnBaseUrl` support for serving images from a CDN.
- **Branding Controls**: Added configurable logo and favicon paths in `site.config.ts`.

### Changed
- **Homepage Design System**: Refined homepage layout and card hierarchy across hero, featured content, latest writing, and series sections.
- **Subscribe Surface**: Moved `/subscribe` to content-driven authoring so users can fully edit subscription copy in Markdown/MDX.
- **Documentation**: Updated architecture, deployment, and configuration guides to reflect current routing and feature behavior.

### Fixed
- **Static Export Stability**: Fixed `output: "export"` edge cases by returning placeholder params for empty/disabled dynamic routes.
- **Dynamic Routing Conflicts**: Resolved route naming and generation conflicts for custom prefixes and static params.
- **Navigation Consistency**: Fixed mismatch between navigation post URL and configured posts base path.
- **Book Route Safety**: Prevented invalid book chapter params by validating chapter existence before route generation.
- **Image Handling**: Fixed markdown image path resolution across content types and ensured CDN prefixing is applied consistently.
- **Rendering & Type Safety**: Fixed TypeScript handling for custom `rss-feed` element and addressed dev-time WebP 404 behavior.

## [1.9.0] - 2026-02-28

### Added
- **Book Importer**: Added `bun run import-book` to import GitBook/Markdown-style books into `content/books/` with chapter mapping support.
- **Flow Chat Import Improvements**: Extended `new-flow-from-chat` with improved formatting and optional timestamp output.

### Changed
- **Import Reliability**: Hardened `import-book` chapter path and ID handling for mixed source structures.

### Fixed
- **Author Slug Normalization**: Stabilized `getAuthorSlug` output for bracketed and edge-case names.
- **Image Path Handling**: Fixed import image-path normalization to correctly handle `../images/`, `./images/`, and `images/` patterns.
- **Test Consistency**: Aligned static-params mock slug behavior with production logic to avoid CI-only test leakage failures.

## [1.8.0] - 2026-02-24

### Added
- **Digital Garden Foundation**: Introduced **Notes** (`content/notes/`) as atomic, evergreen units of knowledge.
- **Interconnected Knowledge**:
  - **Wiki-links**: Native support for `[[Slug]]` and `[[Slug|Display]]` bidirectional linking across all content types.
  - **Backlinks**: Automated "Linked References" display with context snippets for every note.
  - **Knowledge Graph**: Interactive, visual network map of the entire digital garden at `/graph`.
- **Advanced Navigation**:
  - **'More' Dropdown**: Configurable navbar menu for static child links (Archive, Tags, Links).
  - **Scroll-aware UI**: Navbar now features scroll-triggered transparency and glassmorphism effects.
  - **Active Route Tracking**: Visual indicators for currently active navigation paths.
  - **Mobile Sub-groups**: Grouped navigation links in the mobile drawer for better information hierarchy.

### Changed
- **Content Experience**: Removed titles from daily Flows for a more immersive, journal-like journal experience.
- **Layout Evolution**:
  - Promoted `FlowHubTabs` to a primary page heading for easier navigation between Flows, Notes, and Graph.
  - Moved note backlinks and breadcrumbs to the left sidebar for a cleaner, more aligned reading view.
- **Improved Excerpts**: Refined logic to preserve content within inline code blocks during excerpt generation.

### Fixed
- **Navbar Stability**: Resolved a flash of transparency on initial mount by initializing scroll state correctly.
- **Visual Distinction**: Added subtle bracket decorations and consistent hover states for wiki-links.
- **Static Export**: Fixed handling of empty notes and trailing slashes in active state detection.

## [1.7.0] - 2026-02-21

### Added
- **Subscription Hub**: Dedicated `/subscribe` page with support for RSS, Email/Substack, Telegram, and WeChat.
- **Social Sharing**: New configurable `ShareBar` for posts and books with support for 10+ platforms (X, Reddit, Telegram, etc.).
- **Enhanced Tags UX**:
  - Redesigned tags index with A-Z grouping and popularity badges.
  - Tabbed filtering for "Posts" vs "Flows" within each tag page.
  - Sidebar-driven tag navigation with pagination and search.
- **Improved Archive**: Redesigned chronological archive with year-based navigation, post counts, and series indicators.
- **Content Expansion**: New multimedia showcase post and deep-dives on i18n routing strategies.
- **Author Pages**: Added series contribution tracking and per-author book listings.

### Changed
- **Homepage Refinement**: Dynamic sections with configurable ordering, scrolling thresholds, and item limits via `site.config.ts`.
- **Navigation Upgrade**: Segmented pill design for the language switcher and improved mobile drawer.
- **Documentation**: Synchronized and streamlined `GEMINI.md`, `ARCHITECTURE.md`, and `TODO.md` roadmap.

### Fixed
- **Engineering**: Resolved multiple race conditions in scroll listeners via a new `useScrollY` singleton hook.
- **Layout Consistency**: Standardized spacing, dividers, and typography across all content layouts.
- **i18n Logic**: Fixed locale-specific TOC heading extraction and variant file exclusions.

## [1.6.0] - 2026-02-20

### Added
- **Search Engine Upgrade**: Migrated from Fuse.js to **Pagefind** for high-performance, static full-text search with extremely low client-side overhead.
- **Enhanced Search UI**:
  - Full-content search with context highlighting and excerpts.
  - Type-based filtering tabs (All, Post, Flow, Book).
  - Recent searches history persisted in local storage.
  - Interactive search tips panel with syntax hints.
  - Advanced keyboard navigation (Tab-based focus trap, arrow keys, Alt+number shortcuts).
  - Debounced input and visual loading states.
  - Full-screen responsive layout for mobile devices.
- **Search Utilities**: New unit-tested utility library for processing search results and metadata.
- **Project Documentation**: Added a comprehensive `CHANGELOG.md` documenting the project's evolution from 1.0.0.

### Changed
- **Documentation Overhaul**: Streamlined `TODO.md` roadmap and updated `GEMINI.md` and `ARCHITECTURE.md` to reflect the new search architecture.
- **i18n**: Fully localized search interface supporting both English and Chinese.

### Fixed
- **Hydration**: Suppressed body-level hydration warnings caused by browser extensions.
- **Search Precision**: Improved title cleaning and date extraction for search results.

## [1.5.6] - 2026-02-19

### Added
- **Scoped Publishing**: Transitioned to `@hutusi/amytis` for official release on npm and GitHub.
- **Trusted Publishing**: Implemented secure OIDC-based deployment for npm.
- **Engineering Quality**: Added `bun run validate` to integrate linting, testing, and building.

### Changed
- **Refined DX**: Cleaned up all linting warnings and optimized interactive components with `requestAnimationFrame` cleanup.
- **Better Accessibility**: Improved `MarkdownRenderer` semantics by preserving native `<p>` tags.

### Fixed
- **Hydration & Stability**: Resolved all React 19 hydration mismatches in `LanguageProvider`, `Hero`, and `ThemeToggle`.
- **Content Fixes**: Corrected mangled LaTeX formulas and resolved duplicated frontmatter mapping keys.

## [1.5.0] - 2026-02-18

### Added
- **Daily Notes (Flows)**: A new stream-style content format for micro-blogging and quick thoughts.
- **Full-text Search**: Migrated to **Pagefind** for high-performance static full-text indexing.
- **Metadata Inheritance**: Implemented logic for posts to inherit attributes from series metadata.

### Changed
- **Major Tech Upgrade**: Modernized architecture to **Next.js 16 (App Router)** and **React 19**.
- **UI Overhaul**: Redesigned homepage with horizontal scroll featured sections and distinct card styles.
- **Austere Elegance**: New design for Archive and Tags pages focusing on minimalism.

## [1.4.0] - 2026-02-10

### Added
- **Books Feature**: Support for structured, multi-chapter long-form content.
- **Reading Progress**: Integrated sticky progress bar and scroll tracking.
- **Import Tooling**: New CLI commands for PDF and image folder ingestion.

## [1.3.0] - 2026-02-05

### Added
- **Internationalization (i18n)**: Native support for English and Chinese with language switching.
- **Smart Reading Time**: Multilingual character counting for accurate estimates.
- **Author Pages**: Detailed statistics and contribution tracking.

## [1.2.0] - 2026-01-30

### Added
- **Series Management**: Robust support for manual ordering and folder-based structures.
- **Rich Code Blocks**: Syntax highlighting for 11+ languages with copy-to-clipboard.

## [1.1.0] - 2026-01-20

### Added
- **Testing Suite**: Integrated Vitest/Bun Test with 64+ automated tests.
- **Integrations**: Support for Giscus comments and multiple analytics providers (Umami/Plausible).

## [1.0.0] - 2026-01-12

### Added
- **Initial Release**: Launch of **Amytis**, a high-performance digital garden and blog engine.
- **Next.js Foundation**: Built on App Router for optimal static site generation (SSG).
- **Advanced Markdown**: Native support for GFM, Mermaid diagrams, and LaTeX math.
- **Refined Typography**: High-contrast typefaces and optimized readability.
- **Theming System**: Four built-in palettes (`default`, `blue`, `rose`, `amber`) with Dark Mode.
- **Content Organization**: Flexible flat-file and nested-folder post structures.
- **Smart Discovery**: Client-side search, tag clouds, and chronological archives.
- **SEO & Performance**: Automated Sitemap/RSS generation and optimized WebP delivery.
