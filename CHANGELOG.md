# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.6] - 2026-02-19

### Fixed
- Mangled LaTeX rendering in "Mathematical Notation" sample post.
- Duplicated frontmatter mapping keys in sample content.
- Hydration mismatches in `LanguageProvider`, `Hero`, and `ThemeToggle` components.
- Persistent linting warnings and unused variable errors across the codebase.

### Changed
- Refined component semantics: preserved `<p>` tags in `MarkdownRenderer` for better accessibility.
- Optimized performance: added `requestAnimationFrame` cleanup to all interactive components.
- Cleaned up documentation tables in `ARCHITECTURE.md` for completeness.

## [1.5.5] - 2026-02-19

### Added
- **Trusted Publishing (OIDC)** support for secure npm deployment.
- Automated dual-registry publishing to both **npm** and **GitHub Packages** via GitHub Actions.

## [1.5.4] - 2026-02-19

### Changed
- Renamed package to `@hutusi/amytis` for scoped publishing.
- Updated CI/CD workflows to use `actions/setup-node` for robust registry authentication.

## [1.5.0] - 2026-02-18

### Added
- **Flows (Daily Notes)**: A new stream-based content format for micro-blogging and quick thoughts.
- **Full-text Search**: Migrated from Fuse.js to **Pagefind** for high-performance static indexing.
- **Metadata Inheritance**: Posts now inherit attributes (like authors) from series metadata.
- **Validate Command**: Added `bun run validate` to integrate linting, testing, and building.

### Changed
- Upgraded to **Next.js 16.1.1** and **React 19**.
- Refined homepage layout with horizontal scrolling for featured sections.
- Redesigned **Archive** and **Tags** pages for "austere elegance."

## [1.4.0] - 2026-02-10

### Added
- **Books Feature**: Support for structured, long-form content with multi-chapter navigation and dedicated layouts.
- **CLI Tools**: Added `new-from-pdf` and `new-from-images` for automated content importing.
- **Reading Progress**: Added sticky progress bar tracking for long-form content.

### Changed
- Merged Table of Contents (TOC) into the sidebar for improved readability.
- Standardized section spacing and responsive grids across the site.

## [1.3.0] - 2026-02-05

### Added
- **Multilingual Support**: Character-set aware reading time calculation (Latin & CJK).
- **Internationalization (i18n)**: Fully localized site configuration and language switcher.
- **Author Pages**: Detailed statistics and series contribution tracking for individual authors.

### Changed
- Improved mobile navigation with a new hamburger menu and responsive layout refinements.
- Enhanced Series Sidebar with centering logic and better UI.

## [1.2.0] - 2026-01-30

### Added
- **Robust Series Management**: Support for manual post ordering, cross-referencing, and folder-based structures.
- **Syntax Highlighting**: Added native support for 11+ programming languages.
- **Featured Content**: Logic to highlight curated series and stories on the homepage.

### Fixed
- Asset co-location issues for both file-based and folder-based posts.
- Unicode route resolution for static export.

## [1.1.0] - 2026-01-20

### Added
- **Engineering Quality**: Integrated Vitest/Bun Test for unit and integration testing.
- **Analytics**: Privacy-friendly configuration for Umami, Plausible, and Google Analytics.
- **Comments**: Integrated Giscus (GitHub Discussions) for community engagement.

### Changed
- Refined Table of Contents (TOC) with scroll tracking and high-contrast styling.
- Redesigned Archive page with date-grouped timeline.

## [1.0.0] - 2026-01-12

### Added
- Initial release of **Amytis**.
- Core SSG architecture using Next.js App Router and MDX.
- GitHub Flavored Markdown (GFM) and Mermaid diagram support.
- Configurable theme palettes and high-contrast typography.
- SEO optimization with automated Sitemap and RSS feed generation.
- CLI scaffolding tool for new posts.
