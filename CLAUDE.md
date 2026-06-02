# CLAUDE.md

Guidance for Claude Code in this repo. Rules, gotchas, and pointers — not reference material.

## Project

Amytis: static digital-garden blog (Next.js 16 App Router, React 19, Tailwind v4, static export). Content in MDX / Markdown (primary), rST (legacy support); everything resolves at build time. Package manager: bun.

## Essential commands

```bash
bun dev                 # dev server (Turbopack, http://localhost:3000)
bun run lint            # ESLint
bun test                # all tests
bun run build           # production build (image optimization + Pagefind)
bun run build:dev       # faster build; regenerates public/pagefind/ for search-in-dev
bun run clean           # nuke .next, out, public/posts when caches misbehave
```

Content-creation scripts, test layout, validate pipeline → `docs/CONTRIBUTING.md`.

## Architecture map

Quick "where do routes live" lookup. Full reference: `docs/ARCHITECTURE.md`.

- Standard routes follow folder names under `src/app/`: `/posts`, `/series`, `/tags`, `/notes`, `/books`, `/authors`, `/archive`, `/graph`, `/flows/[year]/[month]/[day]`.
- **Top-level `[slug]` and `[slug]/[postSlug]`** resolve `redirectFrom` aliases and `series.customPaths` — highest-risk dynamic surface; touch with care.
- Feeds at `feed.xml` / `feed.atom` / `all.xml` / `all.atom` / `flows/feed.{xml,atom}`; sitemap at `sitemap.ts`; search index at `search.json`.
- Rendering pipeline lives in `src/lib/`: Shiki (`shiki.ts`, `shiki-rst.ts`), remark/rehype plugins (`remark-github-alerts`, `remark-wikilinks`, `remark-code-group`, `rehype-fence-meta`, `rehype-image-metadata`), redirects (`series-redirects.ts`), feeds/JSON-LD (`feed-utils.ts`, `json-ld.ts`).

## Design principles

- **Strict build over silent runtime failure.** Static export means misconfiguration must fail at build time. Use `throw` in `generateStaticParams` and similar — never silent skips or `console.warn`. Precedent: `validateSeriesAutoPaths` throws on slug collisions; `redirectFrom` alias conflicts (reserved slug or duplicate) should also throw, not produce broken redirects.
  - **Exception**: fence-language resolution in `src/lib/shiki.ts` deliberately degrades to `plaintext` + a deduped `console.warn` instead of throwing. Authors can't reliably predict Shiki's alias coverage, and "typo" vs "legitimate community alias" are indistinguishable from our side, so production deploys shouldn't fail on a single unhighlighted code block. Real typos still surface via the warn output in local/CI build logs.
- **Validate author input at build time; keep content portable.** Frontmatter via Zod; slug / redirect conflicts throw. Files on disk stay valid `.md` / `.mdx` / `.rst` — no Amytis-specific syntax that breaks other tools.

## Integration-point rules (always go through X)

- **URLs:** always `getPostUrl()` / `getPostsBasePath()` / `getSeriesCustomPaths()` from `src/lib/urls.ts`. Never hardcode `/posts/[slug]` — posts may live at `/articles/[slug]`, custom prefixes (`series.customPaths`), or under `posts.basePath`.
- **Content reads:** always via `src/lib/markdown.ts` (`getAllPosts`, `getPostBySlug`, `getSeriesData`, etc.). Frontmatter validation belongs in its Zod schemas, not in route files.
- **Search utilities:** pure helpers (URL type detection, date extraction, title cleaning, markdown stripping) live in `src/lib/search-utils.ts` and are shared by the `Search` component and the search-index route. Don't duplicate them.
- **i18n strings:** add to `src/i18n/translations.ts`. Locale-aware config fields are `string | Record<string, string>`; resolve via `resolveLocale()` / `resolveLocaleValue()` from `src/lib/i18n.ts`.

## Config sync

`site.config.ts` (this repo — i18n object form, `{ en, zh }`) and `site.config.example.ts` (shipped via `create-amytis` — plain strings, single-locale, optional features default disabled) must stay in sync. Any schema change to one must be mirrored in the other.

## Gotchas (things Claude will get wrong on first try)

- **`turbopackIgnore` on fs reads.** Any `fs.readFileSync()` path expression must be preceded by `/* turbopackIgnore: true */` (see `src/lib/markdown.ts`, `src/lib/rehype-image-metadata.ts`). Missing it causes incorrect bundling.
- **No AVIF for `coverImage`.** Upstream bug in `next-image-export-optimizer` emits `.webp` files but a `srcset` pointing at `.avif` → 404 in prod. Use `.jpg` / `.png` / `.webp`. See `docs/TROUBLESHOOTING.md`.
- **Unicode slugs.** Dynamic route pages call `safeDecodeParam()` and try decoded / raw / NFC / NFD variants — don't shortcut with bare `decodeURIComponent()` (it throws on malformed input). When touching dynamic routes, verify both ASCII and Unicode slugs.
- **`generateStaticParams` returns raw values.** Don't `encodeURIComponent` route params; Next.js handles encoding. Don't link to placeholder routes like `/posts/[slug]` — always link to concrete URLs.
- **Series format is locked.** A series index can be `index.md` / `.mdx` / `README.md` / `README.mdx` / `index.rst` / `README.rst` (first match wins). All child posts must match. Mixing formats is a build error.
- **rST needs Python `docutils`.** Set `AMYTIS_RST_PYTHON=/path/to/python` if not on `$PATH`. Without it, falls back to a lower-fidelity built-in parser.
- **Pagefind index.** `bun run build:dev` regenerates `public/pagefind/`; search returns stale results until you rerun it after content changes.
- **`trailingSlash: true` is load-bearing.** Lets co-located post assets (`posts/slug/images/`) coexist with `posts/slug/index.html`. Don't flip it in `next.config.ts`.
- **Shiki highlighter is a `globalThis` singleton.** Never instantiate it per render — `createHighlighter` loads Oniguruma WASM + grammars (~1–2 s). See `src/lib/shiki.ts`.
- **rST sanitize-html allowlist must keep `style` + `data-*` on `pre`/`code`/`span`/`div`.** Stripping any of these silently kills Shiki output (monochrome text in prod, looks fine locally because dev rST isn't sanitized). See `src/components/RstRenderer.tsx`.
- **Bump `RST_RENDERER_DISK_CACHE_VERSION` (`src/lib/rst-renderer.ts`) on highlighter-output changes.** Stale on-disk caches in `.cache/rst-renderer/` will serve old markup otherwise. Run `rm -rf .cache/rst-renderer` after pulling such a change.
- **Fence meta needs `rehype-fence-meta` BEFORE `rehype-raw`.** `mdast-util-to-hast` stores fence meta on `node.data.meta`, which `rehype-raw` drops during HTML round-trip. The plugin copies it to a real `data-meta` attribute first. Order matters in `MarkdownRenderer.tsx`.
- **Code-group tabs add `<input type="radio">` + `<label>` to the rST sanitize-html allowlist.** Keep the `transformTags` guard in `RstRenderer.tsx` that strips any `<input>` whose `type !== "radio"` — that's the defense against an rST author injecting password/file/etc. inputs through raw HTML.
- **GitHub alerts (`> [!NOTE]`, etc.) need the custom `remarkGithubAlerts` plugin.** `remark-gfm` v4 does NOT transform `[!TYPE]` blockquotes — they pass through as plain blockquotes with the literal marker visible. The custom plugin in `src/lib/remark-github-alerts.ts` is what detects them and routes to `<GithubAlert>`. If a future remark-gfm adds native alert support, that's a regression to watch for (covered by an integration test).
- **Single-line block math `$$ x $$` is silently inline.** `micromark-extension-math` (under `remark-math` v6) requires the `$$` markers on their own lines — single-line collapses to *inline* math (no `katex-display` wrapper, no centering, no display margin) and looks like a subtly under-styled formula. `src/lib/normalize-vuepress-math.ts` expands single-line `$$ x $$` to opener / body / closer before parsing, so authored content stays portable. If a chapter formula stops centering, suspect the normalizer's regex first.
- **Immersive reading hooks.** `Navbar`, `Footer`, and `ReadingProgressBar` carry stable `data-site-nav` / `data-site-footer` / `data-reading-progress` attributes that the CSS rules in `globals.css` use to hide chrome when `html[data-immersive="true"]` is set. Don't strip these attributes during refactors — the fullscreen `ImmersiveBookReader` overlay in book chapters depends on them as defense-in-depth even though the overlay also covers them. Sepia is scoped to `[data-reader-overlay]`, not `<html>`, so it composes with the site's light/dark theme without leaking outside the overlay.

## Development workflow

For a new feature or non-trivial change:

- **Branch.** Work on a dedicated `<type>/<topic>` branch off `main`, not directly on `main`.
- **Commit in focused slices.** One commit per logical slice (e.g. split a dead-code removal from the feature that replaces it). Keep `bun run lint` green at each commit so the branch stays bisectable. Use Conventional Commit messages; no `Co-Authored-By` trailers.
- **Tests + docs in the same change.** Update `docs/ARCHITECTURE.md` / `docs/CONTRIBUTING.md` / `docs/TROUBLESHOOTING.md` alongside seam/workflow/invariant changes — not as a follow-up.
- **Commits** follow Conventional Commits: `feat | fix | refactor | perf | chore | docs | test | release`. Subject under ~70 chars; body explains *why*.
- **Open a PR** into `main` when the branch is green. Do not add the `🤖 Generated with [Claude Code]` footer to PR descriptions. Pushing, and opening PRs are actions the user authorizes — don't push or open a PR unless asked.

## Verifying a change

- **Default verify loop: `bun run lint && bun run test` only.** Stop here.
- **Do NOT run `bun run build:dev` (or `bun run build` / `bun run validate`) unless the user asks OR it is genuinely needed.** It takes ~1–2 minutes (Turbopack compile + 800+ static pages + Pagefind index) and the cost adds up fast across many small steps. None of these are "needed" on their own: markdown pipeline edits, schema changes, route moves, branch tip, pre-PR readiness, "just to be safe."
- "Genuinely needed" means lint+test **cannot** catch the failure mode you're worried about — e.g. a strict-build invariant that only fires during static export (a `throw` in `generateStaticParams`, a `redirectFrom` collision, a Zod-schema failure that only triggers on real content). If unsure, prefer asking over running.
- `bun run validate` chains lint + test + build:dev; same rule — same bar.
- Touched `src/lib/markdown.ts`, `src/lib/urls.ts`, or `site.config.ts`? Add an integration test under `tests/integration/`.
- Touched any dynamic route? Verify both ASCII and Unicode slugs render.

## Context compression hints

When compressing history, preserve in priority order:

1. **Build-time invariants touched** — strict-build/throw boundaries, Zod schemas, `site.config.ts` shape, helpers in `src/lib/urls.ts` / `src/lib/markdown.ts`.
2. **Modified files and why** — file list with one-line reasons, not the diff.
3. **Verification status** — `bun run lint && bun test` (and `build:dev` if run) pass/fail.
4. **Cache version bumps** — `RST_RENDERER_DISK_CACHE_VERSION` etc.; easy to lose after compression.
5. **Open TODOs and rollback notes.**
6. **Tool output**: drop; keep pass/fail summary only.

## Where to find more

- `docs/ARCHITECTURE.md` — route map, content model, components, data layer, frontmatter schemas, full configuration reference
- `docs/CONTRIBUTING.md` — full command list, test layout, content-creation scripts
- `docs/TROUBLESHOOTING.md` — known issues (AVIF, dev-mode browser-extension CSP/SharedStorage noise)
- `docs/deployment.md` — production deploy steps
- `docs/guides/` — task-oriented walkthroughs (e.g. `importing-vuepress-books.md`)
- `site.config.ts` — live config (read it directly; don't infer from this file)
