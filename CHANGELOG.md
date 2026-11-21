# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.0] - 2026-11-22

### Upgrading from 2.1.0
- **The demo content stays in your site.** New sites now start without it (see **Lean New Sites**), but the upgrade never changes `content/` or `public/images/`, so it only says how many demo files you still have unchanged. "Demo content" in `docs/guides/upgrading-a-site.md` shows how to remove exactly those.
- **The repo's notes for AI assistants go.** The upgrade removes `CLAUDE.md`, `AGENTS.md`, `GEMINI.md` and `.claude/rules/` if you never changed them; they are about working on Amytis itself. A copy you rewrote stays.

### Added
- **Claim Your Site on Tela**: set `telaread.username` in `site.config.ts` to your Tela (telaread.com) username and the footer's Connect column links to your Tela profile with `rel="me"`. Tela accepts that link as proof that the site is yours, so you can claim it there with no token or extra file. It is empty by default, which shows no link. The field is optional: a site made from the demo config keeps building without it, and can copy the `telaread` block from `site.config.example.ts` to use it.
- **Lean New Sites**: `bun create amytis` no longer copies the demo site's content (about a hundred posts, series, books, flows and notes) and photos into a new site. `content/` starts with a welcome post that shows where things live and how to write, deploy and upgrade, plus generic About, Privacy and Subscribe pages. The demo's privacy page had claimed Umami and Giscus, which the starter turns off. New sites also leave out the repo's notes for AI assistants and the demo-only `new-weekly` script. Needs `create-amytis` 0.3.0.
- **Starter Config Hints**: `site.config.example.ts` shows, in comments, how to turn on what it leaves off: the Flow, Books and Links nav entries, series and book dropdowns, the matching homepage sections, a second language, Umami analytics, and Giscus or Disqus comments. They are comments above each block, so the upgrade merges them into a customized config without conflicts.

### Fixed
- **New Posts' Author**: `bun run new`, `new-from-pdf` and `new-from-images` (and `templates/default.mdx`) wrote `authors: ["Amytis"]` into every post. Posts now take the site's `posts.authors.default`.

### Removed
- **Unused SVGs**: `public/next.svg`, `vercel.svg`, `window.svg`, `globe.svg` and `file.svg`, left over from the create-next-app template. The upgrade removes them from a site that never changed them.

## [2.1.0] - 2026-11-20

### Added
- **Upgrading a Site**: `bun run upgrade` brings a newer release into a site made with `bun create amytis` (sites made before it run `bunx create-amytis@latest upgrade`). It merges file by file, the way git would. Files you never changed take the new release's version, and your changes stay. Only files both of you changed are merged, with conflict markers where the edits overlap. Your content is never touched, `package.json` keeps the dependencies you added, and a `site.config.ts` that began as the starter config gains new config fields (older sites made from the demo config copy them by hand). It prints the upgrade notes of every release in between. Guide: `docs/guides/upgrading-a-site.md`. Needs `create-amytis` 0.2.0.
- **CI**: an Upgrade check job makes a site from the last release, upgrades it to each change and builds it, so a change existing sites can't take fails before it is released.
- **Keep a Moved Post's Feed Id**: a post's optional `feedId` frontmatter (`:FeedId:` in rST) sets the id its RSS `<guid>` and Atom `<id>` carry. After a slug rename, a move into a series or locale tree, or a new domain, set it to the post's old `<guid>` and feed readers don't show the post again as new. It is used exactly as written; it must start with a URI scheme (`https:`, `tag:`, ...) and contain no spaces or control characters, and two items sharing an id fail the build. Item ids otherwise stay the page URL, unchanged.

### Fixed
- **Feeds With Control Characters**: a control character in a post's title, excerpt, tags or body (a stray backspace pasted from a terminal, a YAML `\x01` escape) made the whole RSS or Atom feed unparseable, while the page itself rendered fine. The feeds now drop the characters XML forbids.

## [2.0.2] - 2026-11-18

### Fixed
- **No Links to Disabled Features**: with books, series or flows (and so notes) turned off, as in the starter config, the author page, "linked from" backlinks, wikilinks (to notes, flows and series), the knowledge graph and `search.json` no longer list content whose pages aren't built. A new site's build now reports no broken links.
- **New Sites Without the Repo's Tests**: `bun create amytis` no longer copies the repo's test suite, which tests the demo site and failed in a new site, its CI workflows or the scaffolder's own source; `bun run validate` in a new site runs lint, the type check and a build. `tsconfig.json` now names Bun's types, which TypeScript 6 doesn't load by itself and which only the tests used to bring in. Needs `create-amytis` 0.1.4.
- **Scaffolding Behind a Shared IP Address**: `create-amytis` finds the latest release through github.com instead of the GitHub API, whose hourly limit for requests without a token could make it fail. Needs `create-amytis` 0.1.4.

## [2.0.1] - 2026-11-17

### Fixed
- **New Sites Start From the Starter Config**: `bun create amytis` gave every new site this repo's own `site.config.ts` (the demo author's social links, domain and two-language setup). It now uses the single-language `site.config.example.ts`, as documented, and drops the demo's Chinese translations, which a single-language site can't build. Needs `create-amytis` 0.1.3.
- **Starter Config Builds**: the code now type-checks against `site.config.example.ts` (its empty `analytics.providers` and `footer.bottomLinks` were inferred as `never[]`), and a CI job builds the site with it.
- **Feature Names in a Single-Language Config**: a plain-string `features.*.name` (e.g. `name: "Articles"`) was ignored, because it was read as a per-locale map; it now renames the feature in every language.
- **Feature Names With `$`**: a `$&` or `$$` in a configured feature name acted as a replacement pattern in the labels built from it ("All Series", "Curated Series"); it is now kept as written.

## [2.0.0] - 2026-11-17

Translations now live in locale content trees with their own URLs (`/zh/…`), replacing 1.x's sibling translation files. That breaks sites that have translations, which is why this is a major release; see **Upgrading from 1.x**.

### Upgrading from 1.x
- **Move translations into a locale tree.** A sibling translation such as `content/about.zh.mdx` now fails the build with a migration hint. Move it to the same path under `content/<locale>/`, e.g. `content/zh/about.mdx`. Content in another language that was published at unprefixed URLs can move under its prefix and keep its old URLs as `redirectFrom` aliases: see `docs/guides/migrating-content-to-locale-trees.md`.
- **Locale codes are reserved.** While i18n is enabled, a series, page, alias or `posts.basePath` named after a locale (`en`, `zh`, …) fails the build.
- **Add the new config fields.** Copy `generateOgImages` and `linkCheck` from `site.config.example.ts` into your `site.config.ts`; the build's type-check fails without them. A site-relative `ogImage`, logo or favicon that doesn't exist now fails the build too (a default `public/og-image.png` ships).
- **Ignore the generated folders.** Add `/public/vendor/` and, for each locale tree, `/public/<locale>/` to `.gitignore`; the build copies files there.
- **Reinstall dependencies** with `bun install` (Next.js 16.4, React 19.3, KaTeX 0.19).
- **What readers notice:** the language comes from the URL instead of a setting remembered in the browser, and the language switch opens the page's translation (or the locale home). Feed item ids change once, to the trailing-slash URLs the site serves, so some feed readers show recent items again. The light palettes' accent colors are a shade darker, to meet AA contrast.

### Added
- **Locale URL routing**: `content/<locale>/` mirrors `content/`, and the file's location is its language. `content/zh/posts/foo.md` is served at `/zh/posts/foo/` and pairs with `content/posts/foo.md` as its translation; default-language URLs don't change. A `/zh/` page exists only for content that has a translation. Translations get reciprocal `hreflang` with `x-default`, each page gets the right `<html lang>`, the search index is split by language (with CJK word segmentation), and sitemap, search and graph cover every tree. Works with any `defaultLocale`. This also ends the hydration errors and flash of English that the old client-side language switch caused on every link click.
- **Full Locale Home Pages**: `/zh/` shows the same sections as the default home (featured posts, latest posts, series, books) from its own tree; flows, which locale trees don't have yet, are left out.
- **`bun run translate`**: translates a post, page, note, series or book into a locale tree with any OpenAI-compatible chat API, such as Aliyun Bailian. Code blocks and math never reach the model and are restored byte for byte; titles, excerpts and book chapter names are translated while dates, tags and slugs are kept. A reply that lost a code block, link, heading or directive is not written (`--write-anyway` writes it for fixing by hand); `--force` translates again over an existing translation. Guide: `docs/guides/translating-content.md`.
- **Chinese Sample Content**: the welcome post, the Markdown, code-block, syntax-highlighting and multimedia showcases (slide deck included), the Digital Garden and Markdown Showcase series and the sample handbook now have Chinese versions under `content/zh/`.
- **Slide Decks**: a `:::slides` block of ordinary Markdown images becomes a carousel with a presenter view (fullscreen where the browser allows it, clicker keys), `#slides-N` links to a slide, a swipeable strip without JavaScript, and a first-slide preview in feeds. `bun run new-slides` copies a Keynote/PowerPoint/Google Slides export or a PDF into place. Reference: `docs/SLIDES.md`.
- **Link Check After Every Build**: the export is scanned for internal links to pages that weren't built, missing images, broken wikilinks, missing `#anchors` and links through redirect aliases, with each finding traced to its content file. `linkCheck: 'error'` fails the build on broken links and images; the default only reports.
- **Generated Share Cards**: with `generateOgImages: true`, posts, notes and book chapters without a cover image of their own share a 1200×630 card (title, series or book, date, authors, site logo) instead of the one site-wide image; notes previously shared none. Cards are rendered at build time by `next/og` with bundled fonts — Chinese titles included — so the build downloads no fonts. Off by default in `site.config.example.ts`.
- **Flow Card Feed**: The flow index now renders as a full-content card feed with a month timeline rail (month/year anchors linking to flow archives), scroll-driven card reveal, and flow archive pages aligned with the homepage feed. Notes and Graph moved into a navbar "More" menu.
- **Flows with Files**: `bun run new-flow --folder` writes `DD/index.md`, so a flow can keep images or slides next to it.
- **Print Stylesheet**: printing an article gives a clean light page whatever the screen theme: no navigation, sidebars, share or comments; code wraps in its light theme; external links print their address; the immersive reader prints in full.
- **Breadcrumbs on Posts and Chapters**: Series › series › post (or Articles › post) and Books › book › part/section › chapter, with matching BreadcrumbList structured data for search results.
- **Back to Top**: a floating button appears once you're two screens down any page; it returns to the top and moves keyboard focus there too.
- **Image Zoom**: clicking an article image opens it full size in a lightbox (Escape, a click or ✕ closes it); linked images and inline icons are left alone.
- **Heading Anchors**: h2–h4 headings in articles, chapters, notes and rST pages get a `#` link (on hover or keyboard focus, faint on touch screens) to link straight to a section.
- **Branded 404 and Error Pages**: localized `not-found` / client error boundary replace Next's default unbranded pages; the 404 offers search, the archive and tags.
- **Crawler Basics**: `robots.txt` pointing at the sitemap, a `theme-color` and an apple touch icon; the sitemap now includes the posts and series-prefix listings, dated by their newest content.
- **DOM Behavior Tests**: happy-dom + React Testing Library behind `bun run test:dom`, with first tests for the theme toggle, language provider, scroll/heading hooks, immersive-reading provider, nav dropdowns, and the search modal.
- **CI**: Windows production build and the Playwright mobile matrix now run on main pushes, manual dispatch, and a weekly schedule; `typecheck` joined `bun run validate`.

### Changed
- **Search Scope**: only content bodies are indexed, so excerpts no longer contain site chrome or header meta, and tag, listing and redirect pages no longer show up; results carry their dates. `/` opens search and Enter opens the top hit.
- **Ink Design System**: A shared "ink" token system (card surfaces, hairlines, an `ink-alpha` opacity scale) unifies posts, series, notes, tags, books, search, and reader surfaces, replacing per-component ad-hoc colors.
- **Design-System Primitives**: `cn()` class-composition helper, shared class constants, an extracted `ContentCard`, a unified `Tag` pill, and centralized listing-route metadata via `createListingMetadata` — with a guard test that prevents re-inlining the centralized classes.
- **Content Architecture**: The monolithic `markdown.ts` was split into domain modules under `src/lib/content/` (`posts`, `series`, `books`, `flows`, `notes`, `authors`, `related`, `discovery`) with an acyclic dependency graph enforced by a test.
- **Immersive Reader**: Width options widened and re-spaced for widescreen displays.
- **Dependencies**: Next.js 16.2 → 16.4, which clears Dependabot's Next.js advisories (most target server features a static export never runs, but `bun dev` does run a server); React 19.3, KaTeX 0.19, Playwright 1.65 and in-range updates.

### Accessibility
- **Keyboard-Accessible Nav Menus**: the desktop Books/Series/More dropdowns were hover-only; they now follow the ARIA disclosure pattern (toggle with `aria-expanded`, Escape restores focus). The search modal gained the full combobox pattern (`aria-activedescendant`, roving-tabindex tabs, focus restore on close), screen-reader labels are localized instead of hardcoded English, and reduced-motion users get the knowledge graph's list view instead of the force animation.
- **AA Contrast**: light accents move to the 700 shades, a new `--accent-contrast` token covers text on accent fills, and faint informational text uses `text-muted`. The remaining hard-coded English accessible names and visible text are translated, including footnote labels per content language.
- **Reduced Motion**: `prefers-reduced-motion` is respected for animations and scrolling.

### Performance
- **Navigation in the Static HTML**: the table of contents, series navigation and previous/next links were missing from the exported HTML on about 266 pages and appeared only after hydration; they are now prerendered.
- **Search Panel on Demand**: the search results UI (Pagefind client, type tabs, recent searches) now downloads on first use instead of with every page; the trigger, shortcuts and input are unchanged, and hovering or focusing the search button fetches it early.
- **No tailwind-merge in the Browser**: `cn()` is now plain clsx. The one conflicting composition (the homepage's slower cover zoom) became its own class constant, which drops tailwind-merge's 8.6KB gzip from 346 of 394 pages.
- **Smaller Client Bundles**: Footer/Hero/PageHeader and the homepage sections became Server Components via new `T`/`TLocale`/`TLabel` translation leaves; d3 is deferred out of the `/graph` initial chunk; KaTeX CSS no longer ships with math-free articles; the serif font ships as WOFF2 (~209 KB saved).
- **Lighter Math and CSS**: each KaTeX formula is one HTML string instead of thousands of hydrated nodes; code-group icons moved from inlined data URIs (~44% of the global CSS) to files fetched only when a tab uses them; Inter is subset to the scripts the site renders.
- **Build Performance**: `getAllBooks`, `getAllFlows`, and `resolveSeriesIndexInfo` are memoized; the rST disk cache auto-invalidates when `render-rst.py` changes; Mermaid loads on demand instead of on every post page.

### Fixed
- **Frontmatter Dates**: in UTC+ time zones, quoted datetimes and single-digit days (`"2025-11-5"`) were shown, sorted, fed and future-gated a day early.
- **Table of Contents Links**: TOC ids now match the page's heading ids for headings with links, a closing `##` or inline HTML.
- **Draft Pages**: draft static pages were published and listed in the sitemap; production builds now leave them out.
- **Full-Content Feeds**: feeds render the same extended Markdown syntax as pages, sanitize rST, resolve co-located images for series posts served under a series path, and strip markup from excerpts.
- **Search**: dates are indexed; a build race that sometimes wrote empty Pagefind runtime files (search returned nothing) is fixed; every advertised tab hotkey works, not just Alt+1–4.
- **Search in the Immersive Reader**: `/` and Cmd/Ctrl+K opened an invisible search dialog there, because it rendered inside the navbar that immersive mode hides; it now renders over the reader, and Escape still closes only the search.
- **RSS Links and Twitter Handle**: pages that set a canonical URL dropped the RSS/Atom autodiscovery links and `twitter:site`; every page now has them. Redirect stubs are `noindex,follow` with a canonical pointing at their target, redirect without JavaScript, and keep the `#hash`.
- **Canonical URLs for Crawlers**: sitemap entries, RSS/Atom item links/guids, JSON-LD, and canonical alternates now use the trailing-slash form the static export actually serves (feed guids change once as a result).
- **OpenGraph Images**: emitted site-relative on prefixed post routes (rejected by OG consumers), and the default `og-image.png` didn't exist; both fixed.
- **Sticky Sidebars and Dark Palettes**: `overflow-x: hidden` on the page had stopped sidebars from sticking, and the color palettes didn't apply in dark mode.
- **Inline Code on a Theme Opposite the OS**: `dark:` utilities followed the OS color scheme while the theme tokens follow the site toggle, so inline code turned white on the light theme under a dark OS (and near-black on the dark theme under a light one). They now follow the toggle; the immersive reader's light and sepia themes stay light on a dark site.
- **Breadcrumbs on Phones**: note pages with a sidebar and flow day pages only showed their breadcrumb in a desktop-only sidebar; phones now get it above the article.
- **Archive on Tablets**: the timeline column can shrink, so the archive no longer overflows on iPad widths.
- **Media in Content**: co-located video and audio files resolve like images, the showcase's HTML5 players render, and query strings and fragments in content URLs are kept verbatim.
- **Collections**: membership is matched by series and slug, so a post is no longer listed in a collection that holds its same-named twin from another series; on the home page, a collection card links its posts to their real URLs instead of redirect aliases.
- **Default Category**: a post without a category shows "未分类" on Chinese pages instead of "Uncategorized".
- **Strict Build**: malformed frontmatter in an optional page (e.g. `content/about.md`) fails the build instead of silently 404ing, invalid-frontmatter errors include the field details, and content-layer misconfiguration consistently fails the build instead of warning.
- **Rendering**: over-wide centered KaTeX formulas scroll instead of clipping; no-space VuePress container openers with titles are normalized; author route params resolve through the shared param helpers.
- **Windows Builds**: `bun run build` works on Windows — the stale `.next/dev/types` validator is excluded from the build type-check, and an npm-install workflow is documented for the bun symlink-layout issue.
- **Builds in Copied Projects**: `bun run build` type-checks without `@types/bun`, and file traces no longer pull in the whole project.
- **Vercel Deploys**: served as a true static export instead of a Next.js server build (`framework: null`).
- **Scaffolder Sync**: `create-amytis` config patches fail loudly on shape drift and are tested against the real `site.config.ts`/`package.json`; a structural key-parity test keeps `site.config.example.ts` mirrored.
- **Source Hygiene**: a guard test rejects NUL bytes / non-UTF-8 in tracked source (a literal NUL had made a `.tsx` file invisible to grep).

## [1.17.0] - 2026-06-11

### Added
- **Immersive Reading Mode**: A fullscreen, distraction-free reader for book chapters and series posts, launched from new "Immersive reading" CTAs on book and series index pages (deep-linkable via `?immersive=1`). Includes an `Aa` preferences popover (font size, Light / Sepia / Dark reading theme, column width) persisted in `localStorage` with a reset button, a reading progress bar under the top bar, and dedicated sidebars — the book sidebar with collapsible sections, plus a new series sidebar that inlines the active post's table of contents.
- **Homepage Section Ordering**: The curated homepage sections (`featured-posts`, `featured-series`, `featured-books`) accept an optional per-section `order` field — `shuffle`, `date-desc`, or `date-asc`.
- **VuePress Importer Upgrades**: `bun run sync-vuepress-book` understands VuePress 1.x sidebar shapes, gains `--skip-common` / `--skip` flags, supports narrow `chapters:`-only re-syncs, and falls back to `README.md` / `README.mdx` when resolving chapter ids.

### Changed
- **Homepage shuffle** now reshuffles on every visit instead of rotating daily.
- **Vercel builds** are pinned via `vercel.json` and install with `--frozen-lockfile`.

### Fixed
- **Immersive Reader Robustness**: Active-heading tracking and anchor scrolling now target the overlay's scroll container; the overlay is preserved when navigating across a collection; sidebar scroll position survives chapter/post clicks; the reading-theme override reliably flips the theme; the `Aa` popover stacks above code blocks; the chrome-hiding CSS is no longer stripped by Lightning CSS; and the first persist run no longer clobbers stored preferences.
- **Shuffle PRNG**: Small seeds are decorrelated with a splitmix32 finalizer and guarded against a zero state locking xorshift32; the featured-posts shuffle button is hidden when every slot is pinned.
- **Book Chapter Layout**: Chapter column width aligned with the site navbar and the article centered in its column; React warnings from VuePress-imported tags are silenced.

## [1.16.0] - 2026-06-01

### Added
- **VuePress Book Pipeline**: Books are now first-class with nested chapter ids and TOCs, a catch-all chapter route, collapsible sections in the chapter sidebar, book-level LaTeX/math, VuePress `:::container` admonitions, and inter-chapter links. Includes a new `bun run sync-vuepress-book` importer that handles frontmatter-less chapters and stale `.md` references gracefully.
- **Shiki Syntax Highlighting**: Replaced `react-syntax-highlighter`/Prism with a build-time Shiki pipeline across both Markdown/MDX and rST. Unknown fence languages now degrade to plaintext with a build-log warning instead of crashing the build, and any bundled Shiki language is lazy-loaded on demand.
- **Code-Group Tabs**: New `:::code-group` (Markdown) and `.. code-group::` (rST) directives render fenced blocks as switchable tabs, with auto-detected icons for languages, package managers, and config files.
- **Shiki Notation Comments**: Inline `// [!code focus]`, `[!code error]`, `[!code warning]`, `[!code highlight]`, and diff markers render with visual indicators inside code blocks.
- **GitHub-Flavored Alert Blockquotes**: `> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]` render as styled callouts in both Markdown and rST (admonition visual parity).
- **Reading Meta**: Word count appears alongside reading time on post and chapter headers, with Chinese localization (`5 分钟阅读`).
- **External Link Affordance**: Outward-arrow icon on external links, opened in a new tab.
- **Code Block Polish**: Real tab icons via Iconify for code-group headers, proper-case language labels, a more prominent highlighted-line background, and rST `:linenos:` / `:emphasize-lines:` / `:caption:` support.

### Changed
- **Mermaid Diagrams** now render frameless by default — no outer border, padding, background, or shadow. Diagram SVGs use the full column width.
- **`showChapterExcerpt`** defaults to `false` on books; opt back in per-book.
- **Markdown Rendering Fidelity**: Single-line `$$ x $$` block math now expands and parses as display math; block math centers via `.katex-display`; VuePress inline `<img>` styling is preserved through import; KaTeX `unicodeTextInMathMode` warnings (noise on CJK math labels) are scoped-silenced.
- **Dependency Refresh**: TypeScript 5.9 → 6.0, ESLint 9 → 10 (config rewritten without `eslint-config-next`), Next.js + safe minor/patch sweep, `@types/node` 24 → 25, `pdf-to-img` 5 → 6.

### Fixed
- **Hydration Mismatches**: Locale-bound text in `TocPanel`, `PostNavigation`, `PostSidebar`, and `ShareBar` no longer logs a hydration error on first paint for users whose stored locale differs from `siteConfig.i18n.defaultLocale`. Mermaid's mutation-prone wrapper is likewise marked.
- **Table Padding**: Restored horizontal padding on prose table cells (the earlier `:where()`-based override was silently stripped by Tailwind v4 / Lightning CSS; replaced with a plain descendant selector that survives compilation).
- **rST Fallback Parser**: Added rendering for `.. figure::`, line blocks, admonitions (including custom `.. cnote::` with caption), `:doc:` / `:ref:` / `:numref:` roles; suppresses `.. toctree::` from rendered body; normalizes escaped whitespace in inline rST.
- **React 19 Warnings**: Resolved `react-hooks/set-state-in-effect` warnings and silenced image-preload warnings for local images. Eager `CoverImage` variants are no longer deprioritized.
- **Copy-Paste UX**: Stripped per-paragraph backgrounds on article copy to prevent "striping" when pasting into rich-text editors. Clipboard-API guard before `preventDefault`.
- **Misc**: `<summary>` styled as an interactive link; code-group icon lookups via `Object.hasOwn`; shiki dedup state reset in `finally`; `<style>` element scoping for shiki output; book import edge cases (URI decode, Vue component warnings, fenced blocks in container normalizer, chapter image paths relative to parent dir).

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
