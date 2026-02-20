# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
