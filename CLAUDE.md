# CLAUDE.md

Guidance for Claude Code in this repo. Rules, gotchas, and pointers — not reference material.

## Project

Amytis: static digital-garden blog (Next.js 16 App Router, React 19, Tailwind v4, static export). Content in MDX / Markdown / rST; everything resolves at build time. Package manager: bun.

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

## Design principles

- **Strict build over silent runtime failure.** Static export means misconfiguration must fail at build time. Use `throw` in `generateStaticParams` and similar — never silent skips or `console.warn`. Precedent: `validateSeriesAutoPaths` throws on slug collisions; `redirectFrom` alias conflicts (reserved slug or duplicate) should also throw, not produce broken redirects.

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

## Git conventions

- **Commits** follow Conventional Commits (already consistent in `git log`): `feat | fix | refactor | perf | chore | docs | test | release`. Subject under ~70 chars; body explains *why*.
- **Branches:** `<type>/<kebab-slug>` matching the commit prefixes (e.g. `fix/create-amytis-windows-extract`, `perf/build-time`, `docs/claude-md-trim`).
- Not enforced by hooks — convention only. CI (`.github/workflows/ci.yml`) runs lint → test → build:dev; all three must pass.

## Verifying a change

- Minimum: `bun run lint && bun test` (or `bun run validate` to chain lint + test + build:dev).
- Touched routes or content? `bun run build:dev` and spot-check the affected page — also re-runs Pagefind so search reflects your change.
- Touched `src/lib/markdown.ts`, `src/lib/urls.ts`, or `site.config.ts`? Add an integration test under `tests/integration/`.
- Touched any dynamic route? Verify both ASCII and Unicode slugs render.

## Where to find more

- `docs/ARCHITECTURE.md` — route map, content model, components, data layer, frontmatter schemas, full configuration reference
- `docs/CONTRIBUTING.md` — full command list, test layout, content-creation scripts
- `docs/TROUBLESHOOTING.md` — known issues (AVIF, dev-mode browser-extension CSP/SharedStorage noise)
- `docs/deployment.md` — production deploy steps
- `site.config.ts` — live config (read it directly; don't infer from this file)
